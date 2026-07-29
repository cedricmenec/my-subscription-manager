## ADDED Requirements

### Requirement: Idempotence de la matérialisation des paiements projetés

Le calculateur `projected-payments` SHALL comparer les paiements GENERATED existants avec les nouvelles projections avant d'écrire. Si les projections sont identiques (mêmes paires `subscriptionId`, `scheduledDate`, `amount`, `status`), aucune écriture ne doit être effectuée pour cet abonnement. Cela garantit qu'un recalcule déclenché par synchronisation inter-instance n'entraîne pas de nouvelles écritures si les données n'ont pas changé.

#### Scenario: Recalcul sans changement de données

- **WHEN** le calculateur `projected-payments` s'exécute alors que les abonnements n'ont pas été modifiés depuis la dernière exécution
- **THEN** les paiements GENERATED existants correspondent exactement aux projections
- **AND** aucune écriture (DELETE ou CREATE) n'est effectuée dans la table `payments`

#### Scenario: Changement d'abonnement entraîne une mise à jour ciblée

- **WHEN** un abonnement est modifié (montant, date d'échéance, ou intervalle)
- **THEN** seuls les paiements GENERATED de cet abonnement sont supprimés et recréés
- **AND** les paiements GENERATED des autres abonnements non modifiés ne sont pas touchés

#### Scenario: Boucle inter-instances cassée par l'idempotence

- **WHEN** l'instance A modifie un abonnement
- **AND** l'instance B reçoit la modification par synchronisation Dexie Cloud
- **AND** l'instance B exécute le calculateur `projected-payments`
- **THEN** les projections calculées par B sont identiques aux GENERATED créés par A (qui ont déjà été synchronisés)
- **AND** B n'effectue aucune écriture dans `payments`
- **AND** aucune synchronisation retour n'est générée
- **AND** la boucle de recalcul est cassée

### Requirement: Circuit breaker anti-boucle

Le moteur de calcul SHALL intégrer un circuit breaker qui détecte les runs mutation excessifs et bloque temporairement les nouveaux runs mutation pour éviter une boucle de recalcul incontrôlée. Le circuit breaker n'affecte que les runs de type `mutation` ; les runs `manual`, `startup`, `interval` et `stale-check` ne sont jamais bloqués.

#### Scenario: Seuil de runs mutation dépassé

- **WHEN** plus de 5 runs de type `mutation` sont déclenchés en 10 secondes
- **THEN** le circuit breaker bloque les nouveaux runs `mutation` pendant 30 secondes
- **AND** un log est écrit dans `diagnosticLogs` avec la catégorie `circuit-breaker`

#### Scenario: Run manuel non bloqué par le circuit breaker

- **WHEN** le circuit breaker est actif (blocage des runs mutation)
- **AND** l'utilisateur déclenche un run manuel
- **THEN** le run manuel est exécuté normalement, sans être bloqué par le circuit breaker

#### Scenario: Levée du blocage après expiration

- **WHEN** le circuit breaker a bloqué les runs `mutation`
- **AND** 30 secondes se sont écoulées depuis le blocage
- **THEN** les runs `mutation` sont à nouveau autorisés
- **AND** le circuit breaker repasse en état inactif

## MODIFIED Requirements

### Requirement: Déclenchement par mutation de données

Le moteur de calcul SHALL déclencher un run lorsqu'une création, modification ou suppression survient sur les tables `subscriptions`, `payments` ou `settings`, que l'écriture provienne d'une action locale ou d'une synchronisation Dexie Cloud entrante. Le déclenchement SHALL être protégé par un circuit breaker qui empêche les runs mutation excessifs.

#### Scenario: Modification locale déclenche un run

- **WHEN** un abonnement est modifié localement (par exemple son prix courant)
- **THEN** le moteur planifie un run couvrant les calculateurs concernés par cette table

#### Scenario: Changement reçu par synchronisation déclenche un run

- **WHEN** une modification d'abonnement ou de paiement est reçue par synchronisation Dexie Cloud depuis un autre appareil
- **THEN** le moteur planifie un run de la même façon que pour une modification locale

#### Scenario: Écriture émise par le moteur ne provoque pas de boucle

- **WHEN** un calculateur écrit son propre résultat dans une table surveillée par les triggers de mutation
- **THEN** cette écriture ne déclenche pas un nouveau run en boucle sur ce même résultat
- **AND** le circuit breaker protège contre les runs mutation excessifs
- **AND** l'idempotence garantit qu'aucune écriture n'est effectuée si les données sont identiques

### Requirement: Anti-tempête (debounce) des déclenchements rapprochés

Le moteur de calcul SHALL coalescer plusieurs déclenchements de type mutation survenant dans une fenêtre de temps rapprochée en un seul run, et SHALL journaliser distinctement les déclenchements ainsi absorbés. Le circuit breaker SHALL compléter ce mécanisme en bloquant les runs mutation excessifs qui dépasseraient le seuil configuré, même après coalescence.

#### Scenario: Import en masse coalescé en un seul run

- **WHEN** une opération en masse (import CSV, restauration de snapshot) crée ou modifie plusieurs enregistrements en une fraction de seconde
- **THEN** le moteur exécute un seul run consolidé plutôt qu'un run par enregistrement modifié
- **AND** les déclenchements absorbés apparaissent dans l'historique d'exécution comme sautés par anti-tempête

#### Scenario: Circuit breaker protège après coalescence

- **WHEN** des runs mutation se produisent de façon répétée même après coalescence par debounce
- **AND** le seuil de 5 runs en 10 secondes est atteint
- **THEN** le circuit breaker bloque les nouveaux runs mutation
- **AND** un log est écrit dans la catégorie `circuit-breaker`

### Requirement: Persistance des résultats selon leur nature métier

Les calculateurs qui produisent une donnée métier partagée entre appareils SHALL persister leur résultat dans la table synchronisée existante correspondante ; les calculateurs qui produisent une donnée dérivée purement interne au moteur (sans valeur métier propre) SHALL persister leur résultat dans une table locale exclue de la synchronisation Dexie Cloud. La matérialisation SHALL être idempotente : les écritures ne sont effectuées que si les projections diffèrent des données existantes.

#### Scenario: Paiements projetés restent une donnée métier synchronisée

- **WHEN** le calculateur de projection des paiements s'exécute
- **THEN** son résultat est écrit dans la table synchronisée des paiements avec le statut `PROJECTED` et la source `GENERATED`
- **AND** ce comportement reste identique à celui existant avant l'introduction du moteur

#### Scenario: Donnée interne au moteur non synchronisée

- **WHEN** le moteur enregistre l'horodatage du dernier run réussi ou une donnée agrégée purement interne à son fonctionnement
- **THEN** cette donnée est stockée dans une table locale explicitement exclue de la synchronisation Dexie Cloud

#### Scenario: Nettoyage idempotent des projections avant projection

- **WHEN** le calculateur `projected-payments` s'exécute pour un abonnement donné
- **THEN** les paiements GENERATED existants pour cet abonnement sont chargés
- **AND** les nouvelles projections sont calculées
- **AND** si les projections sont identiques aux existants (mêmes `scheduledDate`, `amount`, `status`), aucune écriture n'est effectuée pour cet abonnement
- **AND** si les projections diffèrent, les anciens GENERATED sont supprimés et les nouveaux sont créés dans une transaction atomique
- **AND** seuls les paiements `GENERATED` sont supprimés — les paiements `MANUAL`, `IMPORTED`, `CONFIRMED_PAID`, `ASSUMED_PAID`, `SKIPPED`, `REFUNDED` ou `N8N` ne sont jamais affectés

#### Scenario: Modification de montant sans changement de date

- **WHEN** un abonnement est modifié (montant uniquement, sans changement de date d'échéance)
- **THEN** l'ancien paiement `GENERATED` avec l'ancien montant est supprimé
- **AND** un nouveau paiement `GENERATED` avec le nouveau montant est créé
- **AND** aucun doublon n'est présent dans les prochaines échéances