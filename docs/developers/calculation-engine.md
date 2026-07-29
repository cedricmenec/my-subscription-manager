# Moteur de calcul

Le moteur de calcul local-first centralise la recomposition des données dérivées à partir des tables de subscriptions, payments et settings.

## Principes

- Les calculateurs déclarent leurs dépendances de manière explicite.
- L'exécution suit un ordre topologique afin d'éviter les calculs sur des données encore obsolètes.
- Les mutations Dexie déclenchent un recalcul debouncé, ce qui évite les rafales lors d'importations ou de restaurations de snapshot.
- Les résultats persistés sont lus via des requêtes LiveQuery pour réagir automatiquement à la base locale.
- La matérialisation est **idempotente** : si les projections calculées sont identiques aux données existantes, aucune écriture n'est effectuée.

## Structure

- Le registre du moteur se trouve dans src/services/calculationEngine.ts.
- L'état de suivi du moteur est stocké localement dans la table calculationState de la base Dexie.
- Le diagnostic de l'application peut afficher l'historique des exécutions et le graphe de dépendances.

## Déclenchement

Le moteur est lancé au démarrage de l'application puis réagit aux mutations locales et aux événements de rafraîchissement. Les calculateurs peuvent être déclenchés manuellement via l'API publishTrigger.

## Idempotence et prévention des boucles inter-instances

La matérialisation des paiements projetés (GENERATED) est **idempotente** : avant d'écrire, le moteur compare les projections avec les GENERATED existants en utilisant les paires `(scheduledDate, amount, currency, status)`. Si les deux jeux sont identiques pour un abonnement, aucune écriture n'est effectuée.

Cela casse les boucles de recalcul entre instances synchronisées via Dexie Cloud :
1. Instance A modifie un abonnement → sync
2. Instance B reçoit l'abonnement → recalcule → projections identiques → zéro écriture → pas de sync retour
3. La boucle est cassée

### Circuit breaker anti-boucle

Le moteur intègre un circuit breaker qui protège contre les runs mutation excessifs :
- **Seuil** : 5 runs de type `mutation` en 10 secondes
- **Action** : blocage de tous les nouveaux runs `mutation` pendant 30 secondes
- Les runs `manual`, `startup`, `interval` et `stale-check` ne sont jamais bloqués
- Un log est écrit dans `diagnosticLogs` avec la catégorie `circuit-breaker` lors du déclenchement
- L'état du circuit breaker est exposé via `getCircuitBreakerState()` et visible dans la page Diagnostic

### Instance ID

Chaque session de navigateur génère un identifiant unique (`inst-<uuid>`), inclus dans les logs de calcul et visible dans la page Diagnostic. Cela permet de distinguer les logs de différentes instances.

## Nettoyage idempotent des projections

Le calculateur `projected-payments` charge les paiements GENERATED existants, calcule les projections, et compare les deux jeux. Si identique, il ne fait rien. Si différent, il supprime les anciens et crée les nouveaux dans une transaction atomique.

Le processus pour chaque abonnement :
1. Chargement des paiements avec `source: 'GENERATED'` pour cet abonnement
2. Projection des nouveaux paiements
3. Comparaison : si les projections sont identiques aux existants, passage à l'abonnement suivant
4. Si différent : suppression des anciens GENERATED + création des nouveaux

Tout s'effectue dans une transaction Dexie atomique. Seuls les paiements `GENERATED` sont supprimés — les paiements `MANUAL`, `CONFIRMED_PAID`, `IMPORTED`, etc. ne sont jamais affectés.

## Validation

Les tests de régression se trouvent dans src/services/calculationEngine.test.ts et src/services/payments.test.ts.
