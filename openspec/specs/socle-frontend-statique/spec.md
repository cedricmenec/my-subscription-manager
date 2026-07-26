## Purpose

Définir les garanties du socle frontend statique de l'application Abos : exécution React et TypeScript, interface française, contrôles qualité, build portable et configuration publique sans secret.

## Requirements

### Requirement: Socle React et TypeScript exécutable

L'application SHALL fournir un point d'entrée React écrit en TypeScript et exécutable localement avec Vite.

#### Scenario: Démarrage du serveur de développement

- **WHEN** le développeur exécute la commande pnpm de développement
- **THEN** Vite sert l'application dans un navigateur
- **AND** React monte l'interface sans erreur d'exécution

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

Le projet SHALL documenter les variables `VITE_DEXIE_CLOUD_URL`, `VITE_APP_VERSION` et `VITE_APP_ENVIRONMENT` comme configuration frontend publique et MUST NOT inclure de secret ou de fichier `dexie-cloud.key`, conformément à AC-019.

#### Scenario: Préparation d'un environnement local

- **WHEN** le développeur consulte le modèle de variables d'environnement
- **THEN** les trois variables frontend publiques sont présentes
- **AND** aucune valeur secrète ou credential machine n'est fourni
