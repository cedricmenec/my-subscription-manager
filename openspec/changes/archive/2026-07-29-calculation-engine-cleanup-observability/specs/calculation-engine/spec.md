## MODIFIED Requirements

### Requirement: Persistance des résultats selon leur nature métier

Les calculateurs qui produisent une donnée métier partagée entre appareils SHALL persister leur résultat dans la table synchronisée existante correspondante ; les calculateurs qui produisent une donnée dérivée purement interne au moteur (sans valeur métier propre) SHALL persister leur résultat dans une table locale exclue de la synchronisation Dexie Cloud.

#### Scenario: Paiements projetés restent une donnée métier synchronisée

- **WHEN** le calculateur de projection des paiements s'exécute
- **THEN** son résultat est écrit dans la table synchronisée des paiements avec le statut `PROJECTED` et la source `GENERATED`
- **AND** ce comportement reste identique à celui existant avant l'introduction du moteur

#### Scenario: Donnée interne au moteur non synchronisée

- **WHEN** le moteur enregistre l'horodatage du dernier run réussi ou une donnée agrégée purement interne à son fonctionnement
- **THEN** cette donnée est stockée dans une table locale explicitement exclue de la synchronisation Dexie Cloud

#### Scenario: Nettoyage des projections orphelines avant projection

- **WHEN** le calculateur `projected-payments` s'exécute pour un abonnement donné
- **THEN** les paiements existants avec `source: 'GENERATED'` pour cet abonnement sont supprimés avant la création des nouvelles projections
- **AND** la suppression et la recréation s'effectuent dans une même transaction Dexie atomique
- **AND** seuls les paiements `GENERATED` sont supprimés — les paiements `MANUAL`, `IMPORTED`, `CONFIRMED_PAID`, `ASSUMED_PAID`, `SKIPPED`, `REFUNDED` ou `N8N` ne sont jamais affectés

#### Scenario: Modification de montant sans changement de date

- **WHEN** un abonnement est modifié (montant uniquement, sans changement de date d'échéance)
- **THEN** l'ancien paiement `GENERATED` avec l'ancien montant est supprimé
- **AND** un nouveau paiement `GENERATED` avec le nouveau montant est créé
- **AND** aucun doublon n'est présent dans les prochaines échéances

### Requirement: Historique d'exécution observable

Chaque run SHALL être journalisé avec son déclencheur d'origine, le statut et la durée de chaque calculateur exécuté, et la durée totale du run, dans le journal de diagnostic existant de l'application ; cet historique SHALL rester consultable via une lecture réactive, sans nécessiter d'abonnement à un mécanisme d'événement dédié.

#### Scenario: Consultation de l'historique après un run

- **WHEN** un run se termine, qu'il soit réussi, en erreur, ou partiellement sauté par anti-tempête
- **THEN** une entrée correspondante est visible dans l'historique d'exécution avec le déclencheur, la durée par calculateur et la durée totale
- **AND** l'historique se met à jour automatiquement sans action manuelle de rafraîchissement

#### Scenario: Affichage de l'historique dans le panneau de diagnostic

- **WHEN** l'utilisateur ouvre le panneau de diagnostic
- **THEN** les 20 dernières exécutions du moteur de calcul sont affichées
- **AND** chaque entrée affiche la date, le déclencheur, la durée totale, et le statut de chaque calculateur
- **AND** l'affichage se met à jour automatiquement via `useLiveQuery`

### Requirement: Déclenchement manuel depuis l'interface

Le moteur de calcul SHALL exposer un bouton de déclenchement manuel dans le panneau de diagnostic, permettant à l'utilisateur de lancer un run complet du registre à tout moment.

#### Scenario: Déclenchement manuel complet

- **WHEN** l'utilisateur clique sur le bouton « Recalculer » dans le panneau de diagnostic
- **THEN** le moteur exécute un run complet de tous les calculateurs du registre
- **AND** le bouton est désactivé pendant l'exécution
- **AND** les données affichées dans l'application sont rafraîchies après complétion

#### Scenario: Indicateur d'exécution en cours

- **WHEN** un run manuel est en cours d'exécution
- **THEN** le bouton « Recalculer » affiche un état désactivé avec un indicateur visuel
- **AND** l'utilisateur ne peut pas déclencher un second run tant que le premier n'est pas terminé
