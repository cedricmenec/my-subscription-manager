## ADDED Requirements

### Requirement: Gate nextChargeDate ≤ nextRenewalDate

La validation d'un abonnement SHALL vérifier que `nextChargeDate` (si renseignée) n'est pas postérieure à `nextRenewalDate` (si renseignée). Si la règle est violée, la validation SHALL échouer avec un message d'erreur explicite.

#### Scenario: nextChargeDate après nextRenewalDate → rejet

- **WHEN** l'utilisateur saisit `nextChargeDate=2026-09-15` et `nextRenewalDate=2026-08-15`
- **THEN** la validation échoue
- **AND** un message d'erreur indique que la prochaine échéance ne peut pas être après la date de renouvellement

#### Scenario: nextChargeDate avant nextRenewalDate → accepté

- **WHEN** l'utilisateur saisit `nextChargeDate=2026-07-15` et `nextRenewalDate=2026-08-15`
- **THEN** la validation réussit

#### Scenario: nextRenewalDate non défini → pas de gate

- **WHEN** `nextRenewalDate` n'est pas défini
- **THEN** aucune règle de gate n'est appliquée sur `nextChargeDate`
- **AND** la validation ne rejette pas l'abonnement pour ce motif

## MODIFIED Requirements

### Requirement: Champ subscriptionDate modifiable

L'application SHALL persister un champ `subscriptionDate` (date civile, `YYYY-MM-DD`) représentant la date de souscription initiale au service. Ce champ est renseigné à la création de l'abonnement et peut être modifié ultérieurement. Il sert d'ancre de secours pour le calcul de `nextRenewalDate` (si `renewalPeriodStartDate` est absent).

#### Scenario: Création avec subscriptionDate

- **WHEN** l'utilisateur crée un abonnement et renseigne la date de souscription
- **THEN** `subscriptionDate` est persisté au format civil `YYYY-MM-DD`
- **AND** le champ peut être modifié ultérieurement via l'UI d'édition

#### Scenario: subscriptionDate absent à la création

- **WHEN** l'utilisateur crée un abonnement sans renseigner `subscriptionDate`
- **THEN** le champ reste `undefined` en base
- **AND** le calcul de `nextRenewalDate` utilisera `renewalPeriodStartDate` comme ancre, ou échouera si les deux sont absents