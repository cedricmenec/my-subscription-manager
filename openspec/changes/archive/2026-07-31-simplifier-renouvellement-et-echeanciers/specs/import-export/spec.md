## MODIFIED Requirements

### Requirement: Snapshot JSON — export complet

Le système SHALL permettre d'exporter toutes les données dans un snapshot JSON versionné et SHALL sérialiser `renewalMode=ROLLING` sans perte avec les autres modes supportés.

#### Scenario: Export snapshot réussi

- **WHEN** l'utilisateur exporte un snapshot contenant un abonnement `ROLLING`
- **THEN** le fichier contient `format: "abos-snapshot"`, sa version et toutes les tables synchronisées
- **AND** la valeur `ROLLING` est conservée pour cet abonnement

#### Scenario: Export snapshot sans données

- **WHEN** l'utilisateur exporte un snapshot alors que la base est vide
- **THEN** le fichier contient des tableaux vides valides et restaurables

### Requirement: Snapshot JSON — restauration complète

Le système SHALL restaurer atomiquement un snapshot valide et SHALL accepter `ROLLING` tout en normalisant les anciens abonnements manifestement continus selon les critères déterministes de migration.

#### Scenario: Restauration snapshot valide avec ROLLING

- **WHEN** un snapshot valide contient un abonnement `ROLLING`
- **THEN** il est restauré localement avec ce mode et ses invariants
- **AND** le rapport compte l'entité restaurée

#### Scenario: Restauration d'un ancien cas déterministe

- **WHEN** un snapshot ancien contient un abonnement automatique non annuel avec intervalles égaux et dates de facturation et renouvellement égales
- **THEN** l'abonnement est normalisé en `ROLLING`
- **AND** ses paiements importés restent inchangés

#### Scenario: Restauration snapshot — format invalide

- **WHEN** la valeur de mode ne fait partie d'aucun mode supporté
- **THEN** la restauration est refusée avec une erreur explicite avant écriture

#### Scenario: Restauration snapshot — annulation avant écriture

- **WHEN** l'utilisateur annule après l'aperçu
- **THEN** aucune donnée n'est modifiée

### Requirement: Import CSV abonnements

Le système SHALL importer les abonnements en mode additif, SHALL accepter `ROLLING`, `AUTOMATIC`, `MANUAL` et `UNKNOWN`, et SHALL appliquer les invariants du mode avant toute écriture.

#### Scenario: Import CSV réussi en reconduction continue

- **WHEN** une ligne valide contient `renewalMode=ROLLING`
- **THEN** un nouvel abonnement est créé avec un ID `sbs-`
- **AND** ses champs contractuels incompatibles sont absents

#### Scenario: Import CSV — doublon de nom détecté

- **WHEN** une ligne a le même nom qu'un abonnement existant
- **THEN** elle est créée avec un nouvel ID et un warning est rapporté

#### Scenario: Import CSV — ligne invalide

- **WHEN** une ligne contient un mode inconnu ou des champs obligatoires invalides
- **THEN** elle est ignorée avec le numéro de ligne et la raison

#### Scenario: Import CSV — aperçu avant confirmation

- **WHEN** l'utilisateur sélectionne un CSV
- **THEN** l'aperçu compte lignes valides, warnings et erreurs
- **AND** aucune écriture n'a lieu avant confirmation

### Requirement: Export CSV abonnements

Le système SHALL exporter les abonnements non supprimés en CSV et SHALL inclure la valeur exacte du mode de continuation, dont `ROLLING`.

#### Scenario: Export CSV abonnements

- **WHEN** l'utilisateur exporte des abonnements comprenant une reconduction continue
- **THEN** le CSV contient `ROLLING` dans la colonne documentée de ce mode

### Requirement: Documentation du schéma

Le système SHALL maintenir `docs/import-schema.md` à jour pour les formats JSON et CSV, y compris les quatre valeurs de mode et les invariants de `ROLLING`.

#### Scenario: Consultation du schéma

- **WHEN** un développeur consulte `docs/import-schema.md`
- **THEN** les formats snapshot et CSV sont décrits
- **AND** `ROLLING`, `AUTOMATIC`, `MANUAL` et `UNKNOWN` sont listés avec leur sens
- **AND** le nettoyage des champs contractuels de `ROLLING` est documenté
