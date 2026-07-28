## MODIFIED Requirements

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