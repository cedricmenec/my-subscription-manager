## Why

Lorsque deux instances de l'application sont ouvertes simultanément (deux onglets, deux navigateurs, ou deux PC), le moteur de calcul déclenche une boucle de recalcul infinie via Dexie Cloud. Le flux est le suivant : une mutation locale → hook → calcul → écriture des paiements projetés → synchronisation Dexie Cloud → l'autre instance reçoit les écritures → ses hooks → recalcul → écriture → synchronisation retour → boucle. Cela sature le quota de synchronisation Dexie Cloud (50 syncs par 5 minutes sur le plan gratuit) et dégrade les performances.

## What Changes

- Rendre la matérialisation des paiements projetés **idempotente** : comparer les GENERATED existants avec les projections avant d'écrire. Si identique, zéro écriture → pas de sync → boucle cassée.
- Ajouter un **circuit breaker** dans le moteur de calcul : si plus de 5 runs déclenchés par mutation en 10 secondes, bloquer les runs mutation pendant 30 secondes.
- Créer une **page Diagnostic** applicative complète avec des composants React pour visualiser l'état du moteur de calcul, le circuit breaker, et les métriques de synchronisation.

## Capabilities

### New Capabilities
- `diagnostic-page`: Nouvelle page applicative avec composants React pour le monitoring du moteur de calcul, du circuit breaker et des métriques de synchronisation.

### Modified Capabilities
- `calculation-engine`: Modification du comportement de matérialisation des paiements projetés pour l'idempotence. Ajout du circuit breaker anti-boucle.

## Impact

- `src/services/calculationEngine.ts` : ajout du circuit breaker, modification de la gestion des hooks mutation
- `src/services/payments.ts` : modification de `materializeProjectedPayments` pour la comparaison idempotente
- `src/App.tsx` : ajout de la route et du rendu de la page Diagnostic
- `src/pages/DiagnosticPage.tsx` : nouvelle page
- `src/components/diagnostic/` : nouveaux composants React (SyncRateGauge, CalculationTimeline, WriteImpact, CircuitBreakerStatus, InstanceIdentity)
- `src/data/db.ts` : éventuel ajout de table pour les métriques de diagnostic