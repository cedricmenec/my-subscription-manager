## MODIFIED Requirements

### Requirement: Socle React et TypeScript exécutable

L'application SHALL fournir un point d'entrée React écrit en TypeScript et exécutable localement avec Vite.

#### Scenario: Démarrage du serveur de développement

- **WHEN** le développeur exécute la commande pnpm de développement
- **THEN** Vite sert l'application dans un navigateur
- **AND** React monte l'interface sans erreur d'exécution
- **AND** la navigation par hash (`#/settings`, `#/subscriptions`) fonctionne sans rechargement serveur

### Requirement: Navigation par hash

Le système SHALL supporter la navigation par fragment d'URL (hash) pour permettre le deep linking et le bookmark.

#### Scenario: Navigation vers la page Configuration

- **WHEN** l'utilisateur accède à `#/settings`
- **THEN** la page Configuration est affichée

#### Scenario: Navigation vers la page Abonnements

- **WHEN** l'utilisateur accède à `#/subscriptions`
- **THEN** la page Abonnements est affichée

#### Scenario: Navigation par défaut

- **WHEN** l'utilisateur accède à l'URL racine (sans hash)
- **THEN** la page Abonnements est affichée par défaut