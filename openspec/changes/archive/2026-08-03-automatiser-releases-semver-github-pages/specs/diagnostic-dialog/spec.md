## MODIFIED Requirements

### Requirement: Contenu du dialogue de diagnostic

Le dialogue de diagnostic SHALL afficher les mêmes informations que la section actuelle : version applicative, base locale, identité connectée, statut réseau, statut Dexie Cloud, dernière synchronisation, environnement. Dans un build GitHub Pages publié, la version applicative SHALL correspondre exactement à la version SemVer du tag déployé, conformément à AC-022.

#### Scenario: Affichage des informations de diagnostic

- **WHEN** le dialogue de diagnostic est ouvert
- **THEN** les informations suivantes sont affichées :
  - Version applicative : `VITE_APP_VERSION` ou "0.0.0-dev"
  - Base locale : `DEFAULT_DB_NAME`
  - Identité connectée : email ou userId ou "Non connecté"
  - Statut réseau : "En ligne" ou "Hors ligne"
  - Statut Dexie Cloud : label de synchronisation
  - Dernière synchronisation : timestamp ISO
  - Environnement : `VITE_APP_ENVIRONMENT` ou "development"

#### Scenario: Version d'une release publiée

- **WHEN** l'application est construite et déployée depuis le tag `vMAJOR.MINOR.PATCH`
- **THEN** le diagnostic affiche `MAJOR.MINOR.PATCH` comme version applicative
- **AND** il affiche `production` comme environnement
