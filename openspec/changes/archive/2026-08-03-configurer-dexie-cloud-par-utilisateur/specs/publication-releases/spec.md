## MODIFIED Requirements

### Requirement: Configuration et permissions de production sûres

Le build de production SHALL être indépendant de toute URL Dexie Cloud utilisateur, SHALL fixer uniquement la version et l'environnement applicatifs nécessaires au diagnostic et MUST NOT intégrer de credential confidentiel, conformément à AC-019.

#### Scenario: Build agnostique réussi

- **WHEN** une release est construite sans variable GitHub `VITE_DEXIE_CLOUD_URL`
- **THEN** le build réussit avec l'environnement applicatif `production`
- **AND** la version applicative provient du tag de release
- **AND** aucune URL Dexie Cloud utilisateur n'est intégrée au bundle

#### Scenario: Secrets exclus du frontend

- **WHEN** le pipeline construit une release
- **THEN** aucun secret Dexie Cloud machine, credential n8n ou fichier `dexie-cloud.key` n'est copié dans `dist/`
- **AND** `dexie-cloud.json` n'est pas copié dans `dist/`

#### Scenario: Configuration différée au navigateur

- **WHEN** un utilisateur ouvre le build Pages pour la première fois
- **THEN** la release ne présélectionne aucune base distante
- **AND** l'utilisateur doit configurer son URL localement avant l'initialisation de l'application
