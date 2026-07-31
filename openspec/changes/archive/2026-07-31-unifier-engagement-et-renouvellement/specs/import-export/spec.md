## MODIFIED Requirements

### Requirement: Snapshot JSON — restauration complète

Le système SHALL restaurer atomiquement un snapshot valide et SHALL accepter `ROLLING` et `AUTOMATIC` tout en normalisant les anciens abonnements manifestement ambigus selon les critères déterministes de migration : un abonnement `AUTOMATIC` legacy avec `billingInterval == renewalInterval` (champs desormais fusionnés dans `commitmentInterval`) est normalisé en `ROLLING` sauf si l'unité est `YEAR`, auquel cas l'engagement est préservé en `AUTOMATIC`. `MANUAL` n'est plus une valeur acceptée ; un snapshot legacy contenant `MANUAL` est requalifié `AUTOMATIC` (ou `UNKNOWN` si les données sont insuffisantes) selon les mêmes règles que la migration Dexie.

#### Scenario: Restauration snapshot valide
- **WHEN** l'utilisateur sélectionne un fichier snapshot JSON valide et confirme la restauration
- **THEN** toutes les données existantes sont supprimées logiquement (soft delete)
- **AND** toutes les données du snapshot sont importées dans une transaction Dexie `rw` multi-table
- **AND** l'interface affiche un rapport avec le nombre d'entités restaurées par table

#### Scenario: Restauration snapshot — format invalide

- **WHEN** la valeur de mode ne fait partie d'aucun mode supporté (`ROLLING`, `AUTOMATIC`, `UNKNOWN`)
- **THEN** la restauration est refusée avec une erreur explicite avant écriture

#### Scenario: Restauration snapshot — annulation avant écriture

- **WHEN** l'utilisateur annule après l'aperçu
- **THEN** aucune donnée n'est modifiée

#### Scenario: Restauration snapshot valide avec ROLLING

- **WHEN** un snapshot valide contient un abonnement `ROLLING`
- **THEN** il est restauré localement avec ce mode et ses invariants (absence de `commitmentInterval`)
- **AND** le rapport compte l'entité restaurée

#### Scenario: Restauration d'un ancien cas déterministe non-annuel

- **WHEN** un snapshot ancien contient un abonnement automatique non annuel avec intervalles de facturation et de renouvellement égaux
- **THEN** l'abonnement est normalisé en `ROLLING`
- **AND** ses paiements importés restent inchangés

#### Scenario: Restauration d'un engagement annuel legacy préservé

- **WHEN** un snapshot ancien contient un abonnement automatique avec `billingInterval=YEAR` et `renewalInterval=YEAR` identiques
- **THEN** l'abonnement conserve `renewalMode=AUTOMATIC` avec `commitmentIntervalUnit=YEAR`
- **AND** il n'est pas normalisé en `ROLLING`

#### Scenario: Restauration d'un snapshot avec ancien mode MANUAL

- **WHEN** un snapshot ancien contient un abonnement `renewalMode=MANUAL` avec un cycle de renouvellement reconstituable
- **THEN** l'abonnement est restauré avec `renewalMode=AUTOMATIC` et les champs `commitmentInterval*` correspondants
- **AND** si aucun cycle n'est reconstituable, l'abonnement est restauré avec `renewalMode=UNKNOWN`

### Requirement: Import CSV abonnements

Le système SHALL importer les abonnements en mode additif, SHALL accepter `ROLLING`, `AUTOMATIC` et `UNKNOWN`, et SHALL appliquer les invariants du mode avant toute écriture. `MANUAL` n'est plus une valeur acceptée en import.

#### Scenario: Import CSV réussi
- **WHEN** l'utilisateur sélectionne un fichier CSV valide avec des abonnements
- **AND** confirme l'import après l'aperçu
- **THEN** chaque ligne valide est créée comme un nouvel abonnement avec un ID généré automatiquement (préfixe `sbs-`)
- **AND** les abonnements existants ne sont pas modifiés
- **AND** l'interface affiche un rapport avec le nombre de créations, warnings et erreurs

#### Scenario: Import CSV — doublon de nom détecté

- **WHEN** une ligne a le même nom qu'un abonnement existant
- **THEN** elle est créée avec un nouvel ID et un warning est rapporté

#### Scenario: Import CSV — ligne invalide

- **WHEN** une ligne contient un mode inconnu (y compris `MANUAL`) ou des champs obligatoires invalides
- **THEN** elle est ignorée avec le numéro de ligne et la raison

#### Scenario: Import CSV — aperçu avant confirmation

- **WHEN** l'utilisateur sélectionne un CSV
- **THEN** l'aperçu compte lignes valides, warnings et erreurs
- **AND** aucune écriture n'a lieu avant confirmation

#### Scenario: Import CSV réussi en reconduction continue

- **WHEN** une ligne valide contient `renewalMode=ROLLING`
- **THEN** un nouvel abonnement est créé avec un ID `sbs-`
- **AND** ses champs contractuels incompatibles sont absents

### Requirement: Documentation du schéma

Le système SHALL maintenir `docs/import-schema.md` à jour pour les formats JSON et CSV, y compris les trois valeurs de mode restantes et les invariants de `ROLLING` et `AUTOMATIC`.

#### Scenario: Consultation du schéma

- **WHEN** un développeur consulte `docs/import-schema.md`
- **THEN** les formats snapshot et CSV sont décrits
- **AND** `ROLLING`, `AUTOMATIC` et `UNKNOWN` sont listés avec leur sens
- **AND** le nettoyage des champs d'engagement de `ROLLING` est documenté
- **AND** la suppression de `MANUAL` et la fusion de `renewalInterval` dans `commitmentInterval` sont documentées
