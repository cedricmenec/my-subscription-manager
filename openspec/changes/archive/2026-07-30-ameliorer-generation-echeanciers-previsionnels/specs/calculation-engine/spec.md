## ADDED Requirements

### Requirement: Orchestration unique des échéances prévisionnelles

Le registre par défaut SHALL matérialiser les échéances financières par le seul calculateur `projected-payments`; il MUST NOT maintenir une seconde projection `projected-charge-dates` dans `calculationState`.

#### Scenario: Run complet

- **WHEN** un run startup, mutation, interval, stale-check ou manual est exécuté
- **THEN** `projected-payments` calcule et réconcilie l’échéancier adaptatif
- **AND** aucun calculateur séparé `projected-charge-dates` n’est exécuté

### Requirement: Réconciliation différentielle observable

Le calculateur `projected-payments` SHALL compter séparément les créations, mises à jour et suppressions réellement écrites et SHALL journaliser ces compteurs sans exposer les données métier complètes.

#### Scenario: Montant modifié à date inchangée

- **WHEN** le montant désiré d’une projection diffère et que sa date reste identique
- **THEN** la projection existante est mise à jour en place
- **AND** le résultat journalisé incrémente `updateCount`
- **AND** aucun DELETE suivi d’un CREATE n’est effectué

#### Scenario: Aucun changement

- **WHEN** toutes les projections désirées correspondent aux projections existantes
- **THEN** les compteurs de création, mise à jour et suppression valent zéro
- **AND** aucune écriture synchronisée n’est effectuée

## MODIFIED Requirements

### Requirement: Persistance des résultats selon leur nature métier

Les calculateurs qui produisent une donnée métier partagée entre appareils SHALL persister leur résultat dans la table synchronisée existante correspondante ; les calculateurs qui produisent une donnée dérivée purement interne au moteur (sans valeur métier propre) SHALL persister leur résultat dans une table locale exclue de la synchronisation Dexie Cloud. La matérialisation SHALL être idempotente et différentielle : seules les projections réellement ajoutées, modifiées ou retirées produisent une écriture.

#### Scenario: Paiements projetés restent une donnée métier synchronisée

- **WHEN** le calculateur de projection des paiements s'exécute
- **THEN** son résultat est écrit dans la table synchronisée des paiements avec le statut `PROJECTED` et la source `GENERATED`
- **AND** aucune seconde copie métier n’est écrite dans `calculationState`

#### Scenario: Donnée interne au moteur non synchronisée

- **WHEN** le moteur enregistre l'horodatage du dernier run réussi ou une donnée agrégée purement interne à son fonctionnement
- **THEN** cette donnée est stockée dans une table locale explicitement exclue de la synchronisation Dexie Cloud

#### Scenario: Réconciliation idempotente des projections

- **WHEN** le calculateur `projected-payments` s'exécute pour un abonnement donné
- **THEN** les paiements existants pour cet abonnement sont chargés
- **AND** les nouvelles projections sont calculées
- **AND** si les projections sont identiques aux existants, aucune écriture n'est effectuée
- **AND** si elles diffèrent, seules les créations, mises à jour et suppressions nécessaires sont écrites dans une transaction atomique
- **AND** les échéances corrigées, finalisées, manuelles, importées ou n8n ne sont jamais affectées

#### Scenario: Modification de montant sans changement de date

- **WHEN** un abonnement est modifié uniquement sur le montant
- **THEN** le paiement `GENERATED/PROJECTED` de même date est mis à jour en place
- **AND** son identifiant est conservé
- **AND** aucun DELETE suivi d’un CREATE n’est effectué

### Requirement: Idempotence de la matérialisation des paiements projetés

Le calculateur `projected-payments` SHALL comparer les paiements remplaçables existants avec les nouvelles projections avant d'écrire. Si les projections sont identiques par date, montant, devise et statut, aucune écriture ne doit être effectuée pour cet abonnement. Cela garantit qu'un recalcul déclenché par synchronisation inter-instance n'entraîne pas de nouvelles écritures si les données n'ont pas changé.

#### Scenario: Recalcul sans changement de données

- **WHEN** le calculateur `projected-payments` s'exécute alors que les abonnements n'ont pas été modifiés depuis la dernière exécution
- **THEN** les paiements remplaçables existants correspondent exactement aux projections
- **AND** aucune écriture n'est effectuée dans la table `payments`

#### Scenario: Changement d'abonnement entraîne une mise à jour ciblée

- **WHEN** un abonnement est modifié sur le montant, la date d'échéance ou l'intervalle
- **THEN** seules les projections divergentes de cet abonnement sont créées, mises à jour ou supprimées
- **AND** les paiements des autres abonnements non modifiés ne sont pas touchés

#### Scenario: Boucle inter-instances cassée par l'idempotence

- **WHEN** l'instance A modifie un abonnement
- **AND** l'instance B reçoit la modification par synchronisation Dexie Cloud
- **AND** l'instance B exécute le calculateur `projected-payments`
- **THEN** les projections calculées par B sont identiques aux projections déjà synchronisées
- **AND** B n'effectue aucune écriture dans `payments`
- **AND** aucune synchronisation retour n'est générée
- **AND** la boucle de recalcul est cassée
