## Purpose

Définir les garanties du socle frontend statique de l'application Abos : exécution React et TypeScript, interface française, contrôles qualité, build portable et configuration publique sans secret.

## Requirements

### Requirement: Socle React et TypeScript exécutable

L'application SHALL fournir un point d'entrée React écrit en TypeScript et exécutable localement avec Vite.

#### Scenario: Démarrage du serveur de développement

- **WHEN** le développeur exécute la commande pnpm de développement
- **THEN** Vite sert l'application dans un navigateur
- **AND** React monte l'interface sans erreur d'exécution
- **AND** la navigation par hash (`#/settings`, `#/subscriptions`) fonctionne sans rechargement serveur

### Requirement: Navigation par hash

Le système SHALL supporter la navigation par fragment d'URL (hash) pour permettre le deep linking et le bookmark, avec 5 pages : Dashboard, Abonnements, Paiements, Configuration, Données.

#### Scenario: Navigation vers le Dashboard

- **WHEN** l'utilisateur accède à `#/` ou à l'URL racine
- **THEN** la page Dashboard est affichée

#### Scenario: Navigation vers la page Abonnements

- **WHEN** l'utilisateur accède à `#/subscriptions`
- **THEN** la page Abonnements est affichée

#### Scenario: Navigation vers la page Paiements

- **WHEN** l'utilisateur accède à `#/payments`
- **THEN** la page Paiements est affichée

#### Scenario: Navigation vers la page Configuration

- **WHEN** l'utilisateur accède à `#/settings`
- **THEN** la page Configuration est affichée

#### Scenario: Navigation vers la page Données

- **WHEN** l'utilisateur accède à `#/data`
- **THEN** la page Données est affichée

#### Scenario: Navigation par défaut

- **WHEN** l'utilisateur accède à l'URL racine (sans hash)
- **THEN** la page Dashboard est affichée par défaut

### Requirement: Interface utilisateur en français

L'application SHALL présenter en français tous les textes visibles introduits par ce changement et SHALL déclarer le français comme langue du document.

#### Scenario: Affichage de la vue initiale

- **WHEN** l'utilisateur ouvre l'application
- **THEN** le nom court « Abos » et la vue « Abonnements » sont affichés
- **AND** l'état vide est formulé en français
- **AND** l'élément racine HTML déclare `lang="fr"`

### Requirement: Build statique autonome

Conformément à AC-001, le projet SHALL générer avec Vite un répertoire `dist` constitué de ressources statiques utilisables sans serveur applicatif.

#### Scenario: Construction de production réussie

- **WHEN** le développeur exécute la commande pnpm de build
- **THEN** la vérification TypeScript réussit
- **AND** un fichier `dist/index.html` et ses ressources frontend sont générés
- **AND** aucun service backend n'est nécessaire à l'exécution du livrable

### Requirement: Contrôles qualité reproductibles

Le projet SHALL fournir des commandes pnpm dédiées au lint, aux tests automatisés et au build de production.

#### Scenario: Validation du socle

- **WHEN** le développeur exécute les commandes de lint, de test et de build
- **THEN** chaque commande se termine avec un code de sortie nul
- **AND** le test de composant vérifie le contenu accessible de la vue initiale

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
