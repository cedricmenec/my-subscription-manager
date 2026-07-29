# Moteur de calcul

Le moteur de calcul local-first centralise la recomposition des données dérivées à partir des tables de subscriptions, payments et settings.

## Principes

- Les calculateurs déclarent leurs dépendances de manière explicite.
- L'exécution suit un ordre topologique afin d'éviter les calculs sur des données encore obsolètes.
- Les mutations Dexie déclenchent un recalcul debouncé, ce qui évite les rafales lors d'importations ou de restaurations de snapshot.
- Les résultats persistés sont lus via des requêtes LiveQuery pour réagir automatiquement à la base locale.

## Structure

- Le registre du moteur se trouve dans src/services/calculationEngine.ts.
- L'état de suivi du moteur est stocké localement dans la table calculationState de la base Dexie.
- Le diagnostic de l'application peut afficher l'historique des exécutions et le graphe de dépendances.

## Déclenchement

Le moteur est lancé au démarrage de l'application puis réagit aux mutations locales et aux événements de rafraîchissement. Les calculateurs peuvent être déclenchés manuellement via l'API publishTrigger.

## Validation

Les tests de régression se trouvent dans src/services/calculationEngine.test.ts.
