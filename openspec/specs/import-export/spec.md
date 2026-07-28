## Purpose

Définir les garanties d'import et export des données aux formats JSON (snapshot) et CSV (abonnements et paiements) pour l'application Abos.

## Requirements

### Requirement: Snapshot JSON — export complet

Le système SHALL permettre d'exporter toutes les données (subscriptions, categories, payments, settings) dans un fichier JSON unique, versionné, téléchargeable par le navigateur, conformément à FUN-PORT-002 et AC-018.

#### Scenario: Export snapshot réussi
- **WHEN** l'utilisateur clique sur "Exporter (JSON)" dans la section Snapshot
- **THEN** le navigateur télécharge un fichier `.json` contenant l'enveloppe de snapshot avec `format: "abos-snapshot"`, `version: 1`, `exportedAt` et les données de toutes les tables synchronisées

#### Scenario: Export snapshot sans données
- **WHEN** l'utilisateur exporte un snapshot alors que la base est vide
- **THEN** le fichier contient des tableaux vides pour chaque table
- **AND** l'enveloppe est valide et restaurable

### Requirement: Snapshot JSON — restauration complète

Le système SHALL permettre de restaurer l'intégralité des données à partir d'un fichier snapshot JSON valide, en remplaçant atomiquement toutes les données existantes, conformément à FUN-PORT-004 et AC-018.

#### Scenario: Restauration snapshot valide
- **WHEN** l'utilisateur sélectionne un fichier snapshot JSON valide et confirme la restauration
- **THEN** toutes les données existantes sont supprimées logiquement (soft delete)
- **AND** toutes les données du snapshot sont importées dans une transaction Dexie `rw` multi-table
- **AND** l'interface affiche un rapport avec le nombre d'entités restaurées par table

#### Scenario: Restauration snapshot — format invalide
- **WHEN** l'utilisateur sélectionne un fichier qui n'est pas un snapshot JSON valide (format incorrect, version inconnue, structure manquante)
- **THEN** le système refuse la restauration
- **AND** affiche un message d'erreur explicite indiquant la raison du refus

#### Scenario: Restauration snapshot — annulation avant écriture
- **WHEN** l'utilisateur sélectionne un fichier snapshot valide
- **AND** le système affiche un aperçu du contenu (nombre d'entités par table)
- **AND** l'utilisateur annule
- **THEN** aucune donnée n'est modifiée

### Requirement: Import CSV abonnements

Le système SHALL permettre d'importer des abonnements depuis un fichier CSV, en mode additif (toujours créer, jamais écraser), avec génération automatique des IDs, conformément à FUN-PORT-001 et AC-017.

#### Scenario: Import CSV réussi
- **WHEN** l'utilisateur sélectionne un fichier CSV valide avec des abonnements
- **AND** confirme l'import après l'aperçu
- **THEN** chaque ligne valide est créée comme un nouvel abonnement avec un ID généré automatiquement (préfixe `sbs-`)
- **AND** les abonnements existants ne sont pas modifiés
- **AND** l'interface affiche un rapport avec le nombre de créations, warnings et erreurs

#### Scenario: Import CSV — doublon de nom détecté
- **WHEN** une ligne du CSV a un nom qui correspond (case-insensitive) à un abonnement existant
- **THEN** l'abonnement est quand même créé (pas de blocage)
- **AND** un warning est ajouté au rapport : "Le nom 'X' existe déjà (ID: Y). Nouvel abonnement créé avec l'ID Z."

#### Scenario: Import CSV — ligne invalide
- **WHEN** une ligne du CSV a un champ obligatoire manquant ou invalide (nom vide, statut inconnu, prix non numérique)
- **THEN** la ligne est ignorée
- **AND** une erreur est ajoutée au rapport avec le numéro de ligne et la raison

#### Scenario: Import CSV — aperçu avant confirmation
- **WHEN** l'utilisateur sélectionne un fichier CSV
- **THEN** le système affiche un aperçu avec : nombre de lignes valides, nombre de warnings (doublons), nombre d'erreurs
- **AND** l'utilisateur peut confirmer ou annuler
- **AND** aucune écriture n'est effectuée avant confirmation

### Requirement: Export CSV abonnements

Le système SHALL permettre d'exporter les abonnements au format CSV, téléchargeable par le navigateur, conformément à FUN-PORT-002.

#### Scenario: Export CSV abonnements
- **WHEN** l'utilisateur clique sur "Exporter les abonnements (CSV)"
- **THEN** le navigateur télécharge un fichier `.csv` avec l'en-tête et les données de tous les abonnements non supprimés

### Requirement: Export CSV paiements

Le système SHALL permettre d'exporter les paiements au format CSV, téléchargeable par le navigateur, conformément à FUN-PORT-002.

#### Scenario: Export CSV paiements
- **WHEN** l'utilisateur clique sur "Exporter les paiements (CSV)"
- **THEN** le navigateur télécharge un fichier `.csv` avec l'en-tête et les données de tous les paiements non supprimés

### Requirement: Documentation du schéma

Le système SHALL fournir un fichier `docs/import-schema.md` documentant les formats JSON et CSV pour permettre la transformation externe des données, conformément à FUN-PORT-001.

#### Scenario: Consultation du schéma
- **WHEN** l'utilisateur ouvre `docs/import-schema.md`
- **THEN** le document décrit le format du snapshot JSON (enveloppe, structure, types)
- **AND** le document décrit le format du CSV d'import abonnements (colonnes, types, règles de validation)
- **AND** le document décrit le format du CSV d'export abonnements et paiements

### Requirement: Page d'interface `/data`

Le système SHALL fournir une page dédiée aux opérations d'import, export et snapshot, accessible depuis la navigation principale.

#### Scenario: Accès à la page Data
- **WHEN** l'utilisateur navigue vers la page Data
- **THEN** il voit les sections Snapshot, Import CSV, Export CSV
- **AND** chaque section a des boutons d'action clairs
- **AND** un rapport s'affiche après chaque opération

#### Scenario: Import hors connexion
- **WHEN** l'appareil est hors connexion
- **AND** l'utilisateur importe un fichier CSV
- **THEN** l'import est effectué localement dans IndexedDB
- **AND** les données seront synchronisées au retour du réseau