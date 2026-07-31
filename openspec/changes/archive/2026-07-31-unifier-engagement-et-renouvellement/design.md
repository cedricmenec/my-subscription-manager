## Context

Le modèle `Subscription` sépare aujourd'hui trois familles de champs : `billingInterval*` (facturation), `renewalIntervalUnit/Count` + `renewalMode=AUTOMATIC|MANUAL` (renouvellement contractuel), et `commitmentIntervalUnit/Count` + `commitmentStartDate` (engagement, purement informatif — voir `SubscriptionDetailPage.tsx`, `commitmentEndDate` n'est jamais persisté ni utilisé par le moteur de calcul).

Deux helpers de `src/services/renewal.ts` tentent de gérer les cas où `billingInterval == renewalInterval` :
- `isDeterministicLegacyRolling` exclut explicitement `YEAR` (un engagement annuel garde `renewalMode=AUTOMATIC`).
- `hasDistinctContractualRenewal` n'exclut PAS `YEAR` et traite donc le cas annuel/annuel comme "sans renouvellement distinct", ce qui désactive à tort le bornage de projection (`finance.ts`) et la gate de validation (`subscriptionValidation.ts`) pour ce cas précis.

Cette incohérence a été identifiée lors d'une session d'exploration (2026-07-31) : la variable qui compte fonctionnellement n'est ni le libellé du mode, ni la comparaison des deux intervalles, mais la présence d'un engagement daté et son exposition financière (montant total dû si l'échéance de sortie est manquée).

## Goals / Non-Goals

**Goals:**
- Unifier `renewalInterval` et `commitmentInterval` en un seul concept porté par les champs `commitmentInterval*` existants.
- Supprimer `renewalMode=MANUAL` : tout engagement daté suit une formule cyclique automatique.
- Remplacer les helpers basés sur une comparaison de ratio (`hasDistinctContractualRenewal`, `isDeterministicLegacyRolling`) par un invariant simple : `AUTOMATIC` ⇔ `commitmentIntervalUnit`/`commitmentIntervalCount` définis.
- Introduire un calcul pur d'exposition financière et l'afficher comme badge sur la fiche abonnement et le dashboard.
- Fournir une migration Dexie déterministe, y compris pour les cas ambigus legacy, avec traçabilité (log de diagnostic) pour permettre une revue manuelle a posteriori.

**Non-Goals:**
- Ne pas modéliser de paiement groupé / lump-sum : le montant reste toujours facturé selon `billingInterval`, quel que soit l'engagement.
- Ne pas implémenter de seuils d'alerte multiples ou dynamiques selon l'exposition (reste un réglage unique `notifyBeforeRenewalDays`) — évolution future documentée en note de handoff.
- Ne pas modifier `SubscriptionStatus`, la logique de pause ou de résiliation.
- Ne pas retirer `renewalMode` en tant que champ (reste utile pour l'indexation Dexie et le filtrage de liste), seulement sa valeur `MANUAL`.

## Decisions

### Décision 1 : fusion des champs dans `commitmentInterval*`

`renewalIntervalUnit`, `renewalIntervalCount` et `renewalPeriodStartDate` sont supprimés du modèle. `commitmentIntervalUnit`, `commitmentIntervalCount` et `commitmentStartDate` (déjà existants) deviennent les seuls champs portant la durée et l'ancre de l'engagement/renouvellement contractuel.

Alternative rejetée : garder les deux familles de champs séparées (engagement légal vs renouvellement commercial). Rejetée car aucun besoin métier actuel ne distingue les deux, et cela perpétuerait la confusion identifiée. Si un besoin de double engagement émerge plus tard, il pourra être réintroduit explicitement.

### Décision 2 : invariant de présence remplace la comparaison de ratio

`hasDistinctContractualRenewal` et `isDeterministicLegacyRolling` sont supprimés de `src/services/renewal.ts` et remplacés par une fonction unique :

```ts
function hasEngagement(subscription: Pick<Subscription, 'commitmentIntervalUnit' | 'commitmentIntervalCount'>): boolean {
  return Boolean(subscription.commitmentIntervalUnit && subscription.commitmentIntervalCount)
}
```

Tous les appelants (`finance.ts` pour le bornage de projection, `subscriptionValidation.ts` pour la gate `nextChargeDate ≤ nextRenewalDate`, `calculationEngine.ts` pour le calculateur `next-renewal-date`) utilisent cette fonction. Le cas annuel/annuel (`commitmentInterval == billingInterval == YEAR`) est désormais correctement traité comme un engagement (bug corrigé).

Alternative rejetée : garder une comparaison de ratio mais l'étendre pour inclure `YEAR` dans les deux helpers. Rejetée car cela ne résout pas la confusion conceptuelle sous-jacente (pourquoi comparer les deux intervalles alors que la vraie question est "y a-t-il un engagement ?") et laisserait `renewalMode=MANUAL`/`AUTOMATIC` porter une signification redondante avec la présence du champ.

### Décision 3 : suppression de `MANUAL`

`RenewalMode` devient `'ROLLING' | 'AUTOMATIC' | 'UNKNOWN'`. Le calcul cyclique automatique (déjà en place pour `AUTOMATIC`) devient la seule modalité de calcul de `nextRenewalDate` pour un engagement daté ; il n'existe plus de saisie manuelle directe de `nextRenewalDate`.

Alternative rejetée : garder `MANUAL` pour les contrats sans formule fiable (ex: renouvellement négocié au cas par cas). Rejetée par choix explicite de l'utilisateur (simplicité prioritaire) ; un abonnement dont la date réelle diverge de la formule peut être corrigé ponctuellement en ajustant `commitmentStartDate`.

### Décision 4 : calcul d'exposition financière (fonction pure)

```ts
function computeEngagementExposure(subscription: Subscription): { amount: number; currency: string; cycleCount: number } | undefined
```

Formule : `cycleCount = round(intervalToMonths(commitmentInterval) / intervalToMonths(billingInterval))`, minimum 1. `amount = currentPrice × cycleCount`. Réutilise la fonction `intervalToMonths` déjà présente dans `src/services/finance.ts` (cohérence avec le calcul de coût mensuel équivalent existant).

Ce calcul est **pur et non persisté** (conforme au principe déjà appliqué à `projected-charge-dates` : pas de seconde copie stockée). Il est recalculé à l'affichage à partir de `currentPrice`, `billingInterval` et `commitmentInterval`.

Alternative rejetée : persister l'exposition calculée dans `calculationState` comme les autres calculateurs. Rejetée car c'est une donnée dérivée bon marché à calculer (pas de traversée de collection ni d'agrégat), et la garder pure évite un problème de fraîcheur/idempotence supplémentaire.

### Décision 5 : règle de migration pour les cas ambigus

Pour les abonnements existants `renewalMode=AUTOMATIC` avec `billingIntervalUnit == renewalIntervalUnit` et `billingIntervalCount == renewalIntervalCount` :
- Si l'unité est `YEAR` : l'engagement est réel et préservé — `commitmentIntervalUnit/Count` reçoivent la valeur de `renewalInterval*`, `renewalMode` reste `AUTOMATIC`.
- Sinon (`MONTH`, `WEEK`, `DAY`) : l'ambiguïté est résolue en faveur de l'absence d'engagement — `commitmentInterval*` restent vides, `renewalMode` devient `ROLLING`.

Cette règle réplique le comportement historique voulu par `isDeterministicLegacyRolling` (qui excluait déjà `YEAR`), mais l'applique de façon cohérente à tous les usages (elle corrige l'incohérence de `hasDistinctContractualRenewal`).

Pour les abonnements `renewalMode=MANUAL` : requalifiés `AUTOMATIC`, leurs champs `renewalInterval*`/`renewalPeriodStartDate` sont copiés vers `commitmentInterval*`/`commitmentStartDate` s'ils existent ; sinon `renewalMode` devient `UNKNOWN` (pas assez d'information pour calculer un engagement).

Chaque migration ambiguë ou dégradée écrit un log de diagnostic (`category: 'migration'`) mentionnant l'ancien et le nouvel état, pour permettre une revue manuelle a posteriori (l'utilisateur a confirmé qu'il ajusterait les cas concernés lui-même).

### Décision 6 : nommage et compatibilité import/export

Le snapshot JSON et le CSV n'acceptent plus `MANUAL`. La règle de normalisation legacy à l'import (déjà présente dans `import-export/spec.md`, scénario "Restauration d'un ancien cas déterministe") est alignée sur la décision 5 (exception `YEAR`).

## Risks / Trade-offs

- [Perte d'information sur les cas ambigus non-YEAR migrés vers `ROLLING`] → Log de diagnostic explicite par abonnement migré, consultable dans la page Diagnostic existante, pour permettre une correction manuelle ciblée.
- [Régression potentielle sur les tests existants qui valident encore `MANUAL` et les helpers supprimés] → Mise à jour exhaustive de `renewal.test.ts`, `subscriptionValidation.test.ts`, `SubscriptionDialog.test.tsx` dans le même changement ; suppression des scénarios `MANUAL` des specs.
- [Confusion utilisateur si l'exposition financière est affichée pour tous les abonnements y compris ceux sans engagement] → N'afficher le badge d'exposition que lorsque `hasEngagement` est vrai ; pour les abonnements sans engagement, aucun badge n'est montré (l'exposition implicite se limite au prochain prélèvement, déjà visible via `nextChargeDate`).
- [Coefficient d'arrondi de `cycleCount` incorrect pour des intervalles non multiples entre eux, ex: engagement `WEEK` et facturation `MONTH`] → Utiliser `intervalToMonths` (déjà tolérant aux unités `WEEK`/`DAY` via approximation) et arrondir avec un minimum de 1 ; documenter la limite dans le développeur guide.

## Migration Plan

1. Ajouter la version Dexie 6 dans `src/data/db.ts` avec la fonction `upgrade` appliquant les décisions 5 et 6, champ par champ, dans une transaction unique.
2. Écrire les logs de diagnostic pendant la migration pour chaque abonnement dont l'état est ambigu ou dégradé.
3. Adapter `src/services/renewal.ts` (nouvel helper `hasEngagement`, suppression des deux anciens helpers) et tous ses appelants.
4. Adapter le calculateur `next-renewal-date` (`calculationEngine.ts`) et le bornage de projection (`finance.ts`).
5. Ajouter le calcul d'exposition (nouvelle fonction pure, réutilisée par `SubscriptionDetailPage.tsx` et `DashboardPage.tsx`).
6. Adapter `SubscriptionDialog.tsx` (fusion de sections, suppression de l'option manuelle) et `subscriptionValidation.ts`.
7. Adapter `importExport.ts` (snapshot JSON et CSV) et ses tests.
8. Mettre à jour la documentation : `docs/developers/calculation-engine.md` et `docs/developers/projected-schedules.md` (nouveau modèle d'invariant) ; `docs/users/echeanciers-previsionnels.md` et `docs/users/calculation-engine.md` (nouveau vocabulaire "engagement", badge d'exposition).
9. Exécuter la suite de tests complète et vérifier manuellement quelques abonnements réels migrés (l'utilisateur ajustera les cas ambigus identifiés par les logs).

Rollback : la migration Dexie n'est pas réversible automatiquement (suppression de champs). En cas de problème détecté avant diffusion large, revenir à la version précédente du code et restaurer un snapshot JSON pris avant la migration (fonctionnalité déjà existante).

## Open Questions

- Faut-il exposer le calcul d'exposition financière dans l'export CSV/JSON comme colonne dérivée, ou le laisser strictement calculé à l'affichage ? (Actuellement : calcul à l'affichage uniquement, non exporté.)
- Faut-il un futur indicateur agrégé "exposition totale en jeu sur les 90 prochains jours" au niveau du dashboard, au-delà du badge par abonnement ? Laissé en amélioration future.
