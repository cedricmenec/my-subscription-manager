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

## Nettoyage des projections orphelines

Le calculateur `projected-payments` purge les anciens paiements `GENERATED` avant de créer les nouvelles projections. Cela garantit qu'après modification d'un abonnement (changement de date d'échéance ou de montant), l'ancien paiement projeté est supprimé et remplacé par le nouveau.

Le processus pour chaque abonnement :
1. Suppression de tous les paiements avec `source: 'GENERATED'` pour cet abonnement
2. Projection des nouveaux paiements
3. Création des nouveaux paiements

Tout s'effectue dans une transaction Dexie atomique. Seuls les paiements `GENERATED` sont supprimés — les paiements `MANUAL`, `CONFIRMED_PAID`, `IMPORTED`, etc. ne sont jamais affectés.

## Validation

Les tests de régression se trouvent dans src/services/calculationEngine.test.ts et src/services/payments.test.ts.
