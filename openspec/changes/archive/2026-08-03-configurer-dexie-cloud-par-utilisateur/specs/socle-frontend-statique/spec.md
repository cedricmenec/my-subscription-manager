## MODIFIED Requirements

### Requirement: Configuration frontend publique

Le projet SHALL limiter la configuration injectée par Vite à `VITE_APP_VERSION` et `VITE_APP_ENVIRONMENT`, SHALL obtenir l'URL Dexie Cloud depuis la configuration locale obligatoire du navigateur et MUST NOT inclure de secret ou de fichier `dexie-cloud.key`, conformément à AC-019.

#### Scenario: Préparation d'un environnement local

- **WHEN** le développeur consulte le modèle de variables d'environnement
- **THEN** seules la version et la désignation d'environnement frontend sont documentées
- **AND** aucune URL Dexie Cloud, valeur secrète ou credential machine n'est fournie

#### Scenario: Démarrage du bundle générique

- **WHEN** le même build statique est ouvert dans deux profils navigateur sans configuration préalable
- **THEN** chaque profil affiche l'écran de configuration obligatoire
- **AND** chaque profil peut choisir sa propre URL sans modifier le bundle

## ADDED Requirements

### Requirement: Bootstrap de configuration avant l'application

Le point d'entrée SHALL charger l'application métier et son singleton Dexie uniquement après avoir lu une URL Dexie Cloud locale valide.

#### Scenario: Première visite

- **WHEN** aucune URL valide n'est enregistrée pour l'origine
- **THEN** le point d'entrée affiche un formulaire français accessible
- **AND** les modules applicatifs qui construisent Dexie ne sont pas chargés

#### Scenario: Visite déjà configurée

- **WHEN** une URL valide est enregistrée pour l'origine
- **THEN** le point d'entrée charge l'application métier
- **AND** il transmet cette URL à la configuration Dexie Cloud avant le premier accès à la base
