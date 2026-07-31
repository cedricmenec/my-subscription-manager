## 1. Modèle de données et migration Dexie

- [ ] 1.1 Supprimer `renewalIntervalUnit`, `renewalIntervalCount`, `renewalPeriodStartDate` de l'interface `Subscription` dans `src/data/db.ts`
- [ ] 1.2 Modifier le type `RenewalMode` : retirer `'MANUAL'`, ne garder que `'ROLLING' | 'AUTOMATIC' | 'UNKNOWN'`
- [ ] 1.3 Ajouter la version Dexie 6 avec la fonction `upgrade` appliquant les règles de fusion (copie `renewalInterval*` → `commitmentInterval*`, copie `renewalPeriodStartDate` → `commitmentStartDate`, requalification `MANUAL` → `AUTOMATIC`/`UNKNOWN`, normalisation des cas ambigus non-annuels en `ROLLING`)
- [ ] 1.4 Écrire les logs de diagnostic (`category: 'migration'`) pendant la migration pour chaque abonnement dont l'état est ambigu ou dégradé
- [ ] 1.5 Mettre à jour les index Dexie (supprimer les index superflus liés aux champs supprimés si nécessaire)

## 2. Helpers de renewal et validation

- [ ] 2.1 Créer la fonction `hasEngagement` dans `src/services/renewal.ts` (présence de `commitmentIntervalUnit` ET `commitmentIntervalCount`)
- [ ] 2.2 Supprimer `isDeterministicLegacyRolling` et `hasDistinctContractualRenewal` de `src/services/renewal.ts`
- [ ] 2.3 Supprimer `normalizeSubscriptionContinuation` de `src/services/renewal.ts` (ou l'adapter pour n'utiliser que `hasEngagement`)
- [ ] 2.4 Mettre à jour `src/services/subscriptionValidation.ts` : remplacer `hasDistinctContractualRenewal` par `hasEngagement` dans la gate `nextChargeDate ≤ nextRenewalDate`
- [ ] 2.5 Mettre à jour `src/services/subscriptions.ts` : remplacer les appels aux helpers supprimés par `hasEngagement`

## 3. Calculateur next-renewal-date

- [ ] 3.1 Mettre à jour `computeNextRenewalDateForSub` dans `src/services/calculationEngine.ts` : utiliser `commitmentInterval*`/`commitmentStartDate` au lieu de `renewalInterval*`/`renewalPeriodStartDate`
- [ ] 3.2 Supprimer la gestion du mode `MANUAL` dans le calculateur (logs de skip, alertes par défaut)
- [ ] 3.3 Mettre à jour les logs de skip : remplacer `no-distinct-renewal` par `no-engagement` pour les abonnements `ROLLING` ou sans engagement
- [ ] 3.4 Vérifier que le cas annuel/annuel (`commitmentInterval == billingInterval == YEAR`) est bien traité comme un engagement avec calcul de `nextRenewalDate`

## 4. Projection des échéances (finance)

- [ ] 4.1 Remplacer `hasDistinctContractualRenewal` par `hasEngagement` dans `src/services/finance.ts` (bornage de l'horizon par `nextRenewalDate`)
- [ ] 4.2 Supprimer le cas de compatibilité legacy « renouvellement identique traité comme continu » dans `projectSubscriptionPayments`
- [ ] 4.3 Vérifier que le bornage s'applique désormais au cas annuel/annuel

## 5. Calcul d'exposition financière

- [ ] 5.1 Créer la fonction pure `computeEngagementExposure` dans `src/services/finance.ts` (ou un nouveau fichier `src/services/exposure.ts`) : `currentPrice × cycleCount` avec arrondi et minimum 1
- [ ] 5.2 Ajouter les tests unitaires pour `computeEngagementExposure` (tous les scénarios de `engagement-exposure/spec.md`)
- [ ] 5.3 Exporter la fonction depuis le module approprié

## 6. Dialogue SubscriptionDialog

- [ ] 6.1 Fusionner les sections « Continuation » et « Engagement » en une seule section « Engagement » dans le formulaire
- [ ] 6.2 Supprimer l'option « Renouvellement manuel » (`MANUAL`) du sélecteur de mode
- [ ] 6.3 Ne plus pré-remplir les champs d'engagement depuis le cycle de facturation
- [ ] 6.4 Ajouter l'aperçu de l'exposition financière (badge « X € en jeu ») dans la section Engagement lorsque les données sont complètes
- [ ] 6.5 Mettre à jour la fonction `toFormState` et `toPayload` pour utiliser `commitmentInterval*`/`commitmentStartDate` comme seuls champs d'engagement
- [ ] 6.6 Mettre à jour les tests du dialogue (`SubscriptionDialog.test.tsx`)

## 7. Page de détail SubscriptionDetailPage

- [ ] 7.1 Mettre à jour la logique d'affichage de la carte « Prochain renouvellement » : utiliser `hasEngagement` au lieu de `renewalMode === 'AUTOMATIC'`
- [ ] 7.2 Ajouter le badge d'exposition financière dans la section d'information de l'abonnement
- [ ] 7.3 Mettre à jour les tests (`SubscriptionDetailPage.test.tsx`)

## 8. Dashboard

- [ ] 8.1 Ajouter l'indicateur d'exposition financière à côté des échéances de renouvellement dans la liste des 5 prochaines échéances
- [ ] 8.2 Vérifier qu'aucun indicateur n'est affiché pour les abonnements sans engagement

## 9. Import/Export

- [ ] 9.1 Mettre à jour `src/services/importExport.ts` : retirer `MANUAL` des valeurs acceptées en snapshot JSON et CSV
- [ ] 9.2 Aligner la règle de normalisation legacy à l'import sur le nouvel invariant (exception `YEAR`)
- [ ] 9.3 Mettre à jour les tests d'import/export (`importExport.test.ts`)

## 10. Tests et vérification

- [ ] 10.1 Mettre à jour `renewal.test.ts` : remplacer les tests de `isDeterministicLegacyRolling`/`hasDistinctContractualRenewal` par des tests de `hasEngagement`
- [ ] 10.2 Mettre à jour `subscriptionValidation.test.ts` : adapter les tests de la gate pour utiliser `hasEngagement`
- [ ] 10.3 Mettre à jour `calculationEngine.test.ts` : adapter les scénarios `MANUAL` et les références aux champs supprimés
- [ ] 10.4 Mettre à jour `finance.test.ts` : adapter les tests de bornage d'horizon
- [ ] 10.5 Mettre à jour `subscriptions.test.ts` : adapter les références aux champs supprimés
- [ ] 10.6 Exécuter la suite de tests complète (`pnpm test`) et corriger les échecs
- [ ] 10.7 Vérifier manuellement la migration sur quelques abonnements réels (logs de diagnostic)

## 11. Documentation

- [ ] 11.1 Mettre à jour `docs/developers/calculation-engine.md` : nouveau modèle d'invariant (`hasEngagement`), suppression de `MANUAL`, fusion des champs
- [ ] 11.2 Mettre à jour `docs/developers/projected-schedules.md` : bornage piloté par `hasEngagement`, suppression du cas de compatibilité legacy
- [ ] 11.3 Mettre à jour `docs/users/calculation-engine.md` : nouveau vocabulaire « engagement », badge d'exposition financière
- [ ] 11.4 Mettre à jour `docs/users/echeanciers-previsionnels.md` : impact de l'engagement sur l'horizon de projection
- [ ] 11.5 Mettre à jour `docs/import-schema.md` : suppression de `MANUAL`, fusion `renewalInterval` → `commitmentInterval`