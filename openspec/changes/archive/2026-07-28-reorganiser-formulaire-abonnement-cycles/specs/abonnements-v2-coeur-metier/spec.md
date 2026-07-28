## ADDED Requirements

### Requirement: Nouveaux champs de gestion des cycles et dates

Le modèle `Subscription` SHALL inclure les champs supplémentaires suivants pour gérer les cycles de renouvellement, d'engagement et de pause de manière exhaustive :

- `nextRenewalDate` (string, optionnel) : date civil de la prochaine échéance de renouvellement contractuel, distincte de `nextChargeDate`
- `renewalStartDate` (string, optionnel) : date de début de la période de renouvellement en cours
- `commitmentStartDate` (string, optionnel) : date de début de la période d'engagement
- `pauseStartDate` (string, optionnel) : date de début de la pause

#### Scenario: Création d'un abonnement avec date de prochain renouvellement

- **WHEN** l'utilisateur crée un abonnement avec renouvellement automatique et renseigne `renewalStartDate`
- **THEN** `nextRenewalDate` est calculé comme `renewalStartDate + renewalInterval`
- **AND** la valeur est persistée au format `YYYY-MM-DD`

#### Scenario: Abonnement avec engagement daté

- **WHEN** l'utilisateur crée un abonnement avec "Avec engagement" et renseigne `commitmentStartDate`
- **THEN** la date de fin d'engagement est calculée comme `commitmentStartDate + commitmentInterval`
- **AND** cette date est affichée de manière informative sans être stockée

#### Scenario: Mise en pause avec date de début

- **WHEN** l'utilisateur met un abonnement en pause
- **THEN** `pauseStartDate` est persistée (par défaut la date du jour)
- **AND** `pauseUntil` peut être renseignée pour indiquer la fin de pause prévue

#### Scenario: Migration des abonnements existants

- **WHEN** un abonnement existant est ouvert en édition après migration
- **THEN** les nouveaux champs (`nextRenewalDate`, `renewalStartDate`, `commitmentStartDate`, `pauseStartDate`) sont initialisés à `undefined`
- **AND** l'utilisateur peut les renseigner sans perte des données existantes