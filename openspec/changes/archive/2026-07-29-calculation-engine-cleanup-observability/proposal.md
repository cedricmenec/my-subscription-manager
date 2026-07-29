## Why

Le moteur de calcul introduit dans le changement `moteur-de-calcul` possède un défaut critique de cohérence : `materializeProjectedPayments` est **append-only** — elle crée de nouveaux paiements projetés mais ne supprime jamais les anciens lorsque la source (l'abonnement) change. Résultat : quand un abonnement est modifié (date d'échéance, montant), l'ancien paiement projeté persiste en orphelin, produisant des doublons visibles dans les « prochaines échéances » du dashboard. De plus, bien que le moteur journalise ses exécutions dans `diagnosticLogs`, aucun bouton de recalcul manuel ni aucune vue d'historique ne sont exposés dans l'UI, rendant le débogage impossible pour l'utilisateur final.

## What Changes

- **Nettoyage des projections orphelines** : avant de créer de nouvelles projections, purger les paiements `GENERATED` dont la clé (`subscriptionId:scheduledDate`) n'est plus dans la nouvelle projection. Cette purge s'effectue dans une transaction Dexie pour garantir la cohérence atomique.
- **Bouton « Recalculer »** : ajout d'un bouton dans le panneau de diagnostic permettant de déclencher manuellement un run complet du moteur de calcul.
- **Vue d'historique des calculs** : exposition des `diagnosticLogs[category=calc-engine]` dans le panneau de diagnostic, avec déclencheur, durée, statut par calculateur, et date.
- **Réactivité via `useLiveQuery`** : remplacement des lectures manuelles de paiements (`listPayments()`) par `useLiveQuery(() => db.payments.orderBy('scheduledDate').toArray())` dans `App.tsx`, éliminant le besoin de `refreshFinance()` pour la lecture des paiements.

## Capabilities

### New Capabilities

_(aucune — ce changement n'introduit pas de nouvelle capacité)_

### Modified Capabilities

- `calculation-engine` : ajout d'un requirement « Nettoyage des projections orphelines » (purge atomique avant projection) ; modification du requirement « Historique d'exécution observable » pour exposer l'historique dans l'UI diagnostic ; ajout d'un requirement « Déclenchement manuel depuis l'interface » (bouton Recalculer).
- `dashboard-cockpit` : modification du scénario « Affichage des prochaines échéances » pour garantir qu'aucun orphelin n'apparaît après modification d'un abonnement.

## Impact

- **Code affecté** : `src/services/payments.ts` (logique de purge dans `materializeProjectedPayments`) ; `src/App.tsx` (utilisation de `useLiveQuery` pour les paiements, ajout du bouton Recalculer) ; `src/components/DiagnosticDialog.tsx` (affichage de l'historique des calculs et du bouton Recalculer).
- **Tests** : ajout de tests unitaires pour la purge orpheline dans `payments.test.ts` ; test d'intégration pour la cohérence après modification d'abonnement.
- **Non-goals** : pas de modification du graphe de dépendances existant ; pas d'ajout de nouveaux calculateurs ; pas de changement de la logique de projection elle-même (seul le nettoyage est ajouté en amont).
- **Lot d'implémentation** : correction et amélioration du lot « Moteur de calcul » existant.
