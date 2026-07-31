## Why

Le modèle actuel distingue `billingInterval`, `renewalInterval` (porté par `renewalMode=AUTOMATIC|MANUAL`) et `commitmentInterval` (purement décoratif, jamais utilisé par le moteur). Cette séparation en trois familles de champs crée une confusion fonctionnelle réelle et un bug vérifié dans le code : un abonnement `AUTOMATIC` avec `billingInterval == renewalInterval` (ex: facturation annuelle + renouvellement annuel) est traité par `hasDistinctContractualRenewal` (`src/services/renewal.ts`) comme s'il n'avait *aucune* fenêtre de renouvellement distincte — alors même que `isDeterministicLegacyRolling` refuse explicitement de le requalifier en `ROLLING` pour ce même cas annuel. Le moteur de projection (`finances.ts`) et la validation (`subscriptionValidation.ts`) n'appliquent donc pas la borne d'échéance ni la gate de cohérence à ce cas, qui pourtant représente un engagement réel avec un risque financier au renouvellement.

L'analyse (session d'exploration du 2026-07-31) établit que la variable pivot n'est ni le libellé du mode, ni le ratio entre les deux intervalles, mais la **présence d'un engagement daté** : dès qu'un `commitmentInterval` est défini, il existe une fenêtre de sortie fixe et une exposition financière au renouvellement, indépendamment de son rapport avec `billingInterval`. Ce changement fusionne les notions de renouvellement contractuel et d'engagement en un seul concept, supprime le mode `MANUAL` (le calcul cyclique devient la seule modalité), et introduit un calcul d'exposition financière (montant en jeu si l'échéance est manquée) affiché comme information de premier ordre.

## What Changes

- **BREAKING** : suppression des champs `renewalIntervalUnit`, `renewalIntervalCount` et `renewalPeriodStartDate` du modèle `Subscription` ; leur rôle est repris par `commitmentIntervalUnit`, `commitmentIntervalCount` et `commitmentStartDate` (déjà existants mais jusqu'ici décoratifs).
- **BREAKING** : suppression de la valeur `MANUAL` de `RenewalMode`. Les valeurs supportées deviennent `ROLLING`, `AUTOMATIC`, `UNKNOWN`. `AUTOMATIC` implique désormais obligatoirement un `commitmentInterval` défini ; `ROLLING` l'exclut.
- Nouvel invariant remplaçant `hasDistinctContractualRenewal` / `isDeterministicLegacyRolling` : la présence de `commitmentIntervalUnit`/`commitmentIntervalCount` détermine à elle seule l'existence d'un engagement, sans comparaison de ratio avec `billingInterval`.
- Le calculateur `next-renewal-date` calcule `nextRenewalDate` depuis `commitmentStartDate` (ou `subscriptionDate` en repli) et `commitmentInterval`, pour tout abonnement `AUTOMATIC`. Il n'y a plus de mode `MANUAL` à gérer.
- L'horizon de projection (`projected-charge-dates`) borne désormais la fenêtre par `nextRenewalDate` dès qu'un engagement existe, y compris quand `commitmentInterval == billingInterval` (ex: annuel/annuel).
- Nouveau calcul pur d'**exposition financière** : `exposition = currentPrice × (commitmentInterval / billingInterval)`, arrondi au nombre entier de cycles de facturation contenus dans l'engagement. Affiché en badge sur la fiche abonnement et dans le dashboard, à côté des échéances à fort enjeu.
- Migration Dexie (v6) :
  - `renewalIntervalUnit/Count` → copiés vers `commitmentIntervalUnit/Count` si ces derniers sont absents, puis supprimés.
  - `renewalPeriodStartDate` → copié vers `commitmentStartDate` si absent, puis supprimé.
  - `renewalMode=MANUAL` → requalifié `AUTOMATIC` (le calcul cyclique reprend la main sur `nextRenewalDate`).
  - Cas ambigu legacy (`AUTOMATIC` avec `billingInterval == renewalInterval`) : `commitmentInterval*` est vidé et `renewalMode` repasse à `ROLLING`, **sauf** si l'unité est `YEAR`, auquel cas l'engagement annuel est préservé (`renewalMode=AUTOMATIC`, `commitmentInterval=YEAR`).
- Simplification du formulaire (`SubscriptionDialog`) : fusion des sections « Continuation » et « Engagement » en une seule section « Engagement », suppression de l'option « Renouvellement manuel », aperçu de l'exposition financière en temps réel.
- Mise à jour de l'import/export (JSON snapshot, CSV) : `MANUAL` n'est plus une valeur acceptée ; la règle de normalisation legacy est alignée sur le nouvel invariant (vidage sauf `YEAR`).

## Capabilities

### New Capabilities

- `engagement-exposure` : calcul pur et affichage de l'exposition financière (montant total en jeu sur la durée d'engagement) sur la fiche abonnement et le dashboard.

### Modified Capabilities

- `abonnements-v2-coeur-metier` : modèle de données (fusion des champs de renouvellement dans l'engagement, suppression de `MANUAL`, nouvel invariant `AUTOMATIC ⇔ commitmentInterval défini`, migration Dexie v6, gate `nextChargeDate ≤ nextRenewalDate`).
- `next-renewal-date-calculator` : calcul de `nextRenewalDate` basé sur `commitmentInterval`/`commitmentStartDate` uniquement, suppression des scénarios `MANUAL`.
- `projected-charge-dates` : bornage de l'horizon par `nextRenewalDate` piloté par la présence d'engagement (et non plus par un ratio d'intervalles), suppression du cas de compatibilité "renouvellement identique traité comme continu".
- `subscription-dialog` : fusion des sections Continuation/Engagement, suppression du mode manuel, affichage de l'exposition financière.
- `subscription-detail` : affichage du badge d'exposition financière, mise à jour des scénarios de carte de renouvellement pour les valeurs de mode restantes.
- `dashboard-cockpit` : mise en avant de l'exposition financière sur les prochaines échéances à fort enjeu.
- `import-export` : suppression de `MANUAL` du snapshot JSON et du CSV, alignement de la règle de normalisation legacy sur le nouvel invariant (exception `YEAR`).

## Impact

- Code : `src/data/db.ts` (schéma + migration v6), `src/services/renewal.ts` (remplacement des helpers), `src/services/subscriptions.ts`, `src/services/subscriptionValidation.ts`, `src/services/calculationEngine.ts` (calculateur `next-renewal-date`), `src/services/finance.ts` (bornage d'horizon), `src/services/importExport.ts`, `src/components/SubscriptionDialog.tsx`, `src/pages/SubscriptionDetailPage.tsx`, `src/pages/DashboardPage.tsx`.
- Nouveau module : calcul d'exposition financière (fonction pure), probablement dans `src/services/finance.ts` ou un nouveau fichier `src/services/exposure.ts`.
- Tests : `renewal.test.ts` (helpers remplacés), `subscriptions.test.ts`, `subscriptionValidation.test.ts`, `calculationEngine.test.ts`, `finance.test.ts`, `importExport.test.ts`, `SubscriptionDialog.test.tsx`, `SubscriptionDetailPage.test.tsx`.
- Données existantes : migration automatique à l'ouverture de la base ; cas ambigus documentés en logs de diagnostic pour permettre une revue manuelle a posteriori (point confirmé par l'utilisateur : ajustement manuel accepté après migration).
- Non-goals : pas de modélisation d'un paiement groupé/lump-sum (le montant reste toujours facturé selon `billingInterval`) ; pas de seuils d'alerte multiples ou dynamiques selon l'exposition (reste un réglage unique `notifyBeforeRenewalDays`, l'évolution vers des seuils configurables multiples est différée) ; pas de changement des statuts `SubscriptionStatus` ni du cycle de vie pause/résiliation.
