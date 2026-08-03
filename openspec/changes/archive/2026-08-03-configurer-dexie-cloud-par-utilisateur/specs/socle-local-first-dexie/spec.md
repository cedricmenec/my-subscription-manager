## MODIFIED Requirements

### Requirement: Base locale Dexie versionnée

L'application SHALL utiliser Dexie.js comme couche unique d’accès à IndexedDB pour les données interactives, avec un schéma versionné et des identifiants globalement uniques sur les tables synchronisées, conformément à TECH-LF-001, TECH-LF-002 et AC-002. Elle MUST attendre une configuration Dexie Cloud locale valide avant de construire ou d'ouvrir la base synchronisée.

#### Scenario: Ouverture de la base locale configurée

- **WHEN** l'application démarre avec une URL Dexie Cloud locale valide
- **THEN** la base IndexedDB est ouverte via Dexie.js
- **AND** le schéma déclaré inclut une version explicite
- **AND** les tables synchronisées n’utilisent pas de clé auto-incrémentée `++id`

#### Scenario: Configuration absente

- **WHEN** l'application démarre sans URL Dexie Cloud locale valide
- **THEN** aucun singleton Dexie synchronisé n'est construit ou ouvert
- **AND** l'écran de configuration obligatoire est affiché

### Requirement: Synchronisation et authentification via Dexie Cloud

L'application SHALL configurer `dexie-cloud-addon` avec l'URL choisie localement par l'utilisateur et `requireAuth: true`, puis SHALL utiliser Dexie Cloud pour l’authentification OTP et la synchronisation multi-appareils, conformément à FUN-AUTH-001, TECH-LF-004 et AC-006.

#### Scenario: Session authentifiée sur la base choisie

- **WHEN** l'utilisateur configure une URL puis se connecte avec son identité Dexie Cloud
- **THEN** l'application accède aux tables synchronisées de cette URL selon les permissions de cette identité
- **AND** la synchronisation peut démarrer sans backend applicatif personnalisé

#### Scenario: URL inaccessible ou non autorisée

- **WHEN** l'URL configurée ne répond pas ou refuse l'origine ou l'identité
- **THEN** l'application signale une erreur de connexion ou de synchronisation
- **AND** aucune base locale historique n'est supprimée

### Requirement: Frontière de sécurité frontend

Le frontend MUST NOT embarquer de secret Dexie Cloud machine, de token administratif, de fichier `dexie-cloud.key`, de fichier `dexie-cloud.json` ni d'URL de base imposée au build, conformément à SEC-002, SEC-003 et AC-019. L'URL choisie SHALL rester une configuration locale non synchronisée du navigateur.

#### Scenario: Vérification de build

- **WHEN** le développeur inspecte les sources et le build statique
- **THEN** aucun secret ni credential machine n’est présent
- **AND** aucune URL Dexie Cloud utilisateur n'est intégrée au bundle
- **AND** ni `dexie-cloud.key` ni `dexie-cloud.json` n'est copié dans `dist/`

#### Scenario: Persistance locale de la configuration

- **WHEN** l'utilisateur valide son URL Dexie Cloud
- **THEN** l'URL est stockée dans le stockage local de l'origine du navigateur
- **AND** elle n'est écrite dans aucune table synchronisée

## ADDED Requirements

### Requirement: Sélection non destructive de la base Dexie Cloud

L'application SHALL préserver les données locales et distantes existantes lors de la configuration ou du changement d'URL. Elle MUST réutiliser l'identité de base locale associée à la même URL et MUST NOT supprimer une ancienne IndexedDB lors de la sélection d'une autre URL.

#### Scenario: Reprise de la base existante

- **WHEN** l'utilisateur configure exactement l'URL Dexie Cloud utilisée avant la migration
- **THEN** Dexie Cloud sélectionne la même base IndexedDB suffixée par l'identifiant distant
- **AND** aucune migration de schéma ou copie de données n'est exécutée
- **AND** les données locales et la session existantes peuvent être retrouvées

#### Scenario: Sélection d'une autre URL

- **WHEN** l'utilisateur confirme une URL Dexie Cloud différente
- **THEN** l'application sélectionne une base IndexedDB distincte après rechargement
- **AND** l'ancienne base IndexedDB reste intacte
- **AND** remettre l'ancienne URL permet de la sélectionner de nouveau
