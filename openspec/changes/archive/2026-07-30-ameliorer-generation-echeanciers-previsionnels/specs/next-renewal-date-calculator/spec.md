## ADDED Requirements

### Requirement: Convention inclusive et calcul ancré du renouvellement

Le calculateur `next-renewal-date` SHALL utiliser la convention RF-01 supérieure ou égale à la date de référence et SHALL calculer les occurrences mensuelles ou annuelles depuis l’ancre initiale afin de préserver la politique calendaire.

#### Scenario: Renouvellement le jour de référence

- **WHEN** une occurrence de renouvellement tombe le jour de référence
- **THEN** cette date est retournée comme prochain renouvellement

#### Scenario: Renouvellement au jour 30 après février

- **WHEN** l’ancre est `2026-01-30`, le cycle est mensuel et la référence est `2026-03-01`
- **THEN** le prochain renouvellement est `2026-03-30`
- **AND** le passage par `2026-02-28` ne transforme pas la série en fin de mois
