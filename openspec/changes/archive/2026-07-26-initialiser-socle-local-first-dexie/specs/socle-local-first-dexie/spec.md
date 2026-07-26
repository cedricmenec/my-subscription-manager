## ADDED Requirements

### Requirement: Base locale Dexie versionnée

L'application SHALL utiliser Dexie.js comme couche unique d’accès à IndexedDB pour les données interactives, avec un schéma versionné et des identifiants globalement uniques sur les tables synchronisées, conformément à TECH-LF-001, TECH-LF-002 et AC-002.

#### Scenario: Ouverture de la base locale

- **WHEN** l'application démarre
- **THEN** la base IndexedDB est ouverte via Dexie.js
- **AND** le schéma déclaré inclut une version explicite
- **AND** les tables synchronisées n’utilisent pas de clé auto-incrémentée `++id`

### Requirement: Synchronisation et authentification via Dexie Cloud

L'application SHALL configurer `dexie-cloud-addon` avec `requireAuth: true` et SHALL utiliser Dexie Cloud pour l’authentification et la synchronisation multi-appareils, conformément à FUN-AUTH-001, TECH-LF-004 et AC-006.

#### Scenario: Session authentifiée

- **WHEN** l'utilisateur se connecte avec son identité Dexie Cloud
- **THEN** l'application accède aux tables synchronisées selon les permissions de cette identité
- **AND** la synchronisation peut démarrer sans backend applicatif personnalisé

### Requirement: Écritures locales non bloquantes

L'application SHALL considérer une écriture comme réussie dès validation de la transaction locale, sans attendre un accusé réseau, conformément à FUN-CRUD-001, FUN-CRUD-002 et TECH-LF-003.

#### Scenario: Création hors connexion

- **WHEN** l'appareil est hors connexion et l'utilisateur enregistre une modification
- **THEN** la transaction locale Dexie est validée immédiatement
- **AND** l'interface confirme l'enregistrement sur cet appareil
- **AND** la synchronisation reste en attente jusqu’au retour du réseau

### Requirement: Indicateur global de synchronisation explicite

L'application SHALL afficher un état global de synchronisation dérivé de l’état réel Dexie Cloud et SHALL distinguer local enregistré, en attente, synchronisation en cours, hors connexion et erreur de synchronisation, conformément à TECH-LF-007, FUN-CRUD-003 et AC-009.

#### Scenario: Synchronisation en erreur sans perte locale

- **WHEN** une synchronisation échoue après une écriture locale réussie
- **THEN** l'interface affiche un état d’erreur de synchronisation
- **AND** l'interface n’indique pas une perte de donnée locale
- **AND** l’utilisateur peut relancer la synchronisation

### Requirement: Déconnexion distincte de la purge locale

L'application SHALL fournir des actions distinctes de déconnexion et de purge locale, et la purge locale MUST NOT supprimer la copie distante, conformément à FUN-AUTH-003, FUN-AUTH-004 et AC-007.

#### Scenario: Purge locale contrôlée

- **WHEN** l'utilisateur déclenche la purge locale
- **THEN** les données locales de l’appareil sont supprimées
- **AND** les données synchronisées distantes restent intactes
- **AND** une reconnexion permet de récupérer les données distantes

### Requirement: Diagnostic technique minimal

L'application SHALL exposer une vue de diagnostic incluant au minimum la version applicative, le nom de la base locale, l’identité connectée, l’état réseau et l’état de synchronisation, conformément à la section FUN-10 et AC-022.

#### Scenario: Consultation du diagnostic

- **WHEN** l'utilisateur ouvre la vue diagnostic
- **THEN** les informations techniques minimales sont visibles
- **AND** aucune donnée métier détaillée ni secret n’est affiché

### Requirement: Frontière de sécurité frontend

Le frontend MUST NOT embarquer de secret Dexie Cloud machine, de token administratif, ni de fichier `dexie-cloud.key`, et SHALL limiter sa configuration aux variables publiques prévues, conformément à SEC-002, SEC-003 et AC-019.

#### Scenario: Vérification de build

- **WHEN** le développeur inspecte les sources et le build statique
- **THEN** aucun secret ni credential machine n’est présent
- **AND** seules des variables de configuration frontend publiques sont utilisées
