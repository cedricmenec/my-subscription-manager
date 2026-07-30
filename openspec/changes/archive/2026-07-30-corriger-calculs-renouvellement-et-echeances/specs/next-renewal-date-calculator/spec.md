## MODIFIED Requirements

### Requirement: Calcul idempotent de nextRenewalDate

Le calculateur `next-renewal-date` SHALL calculer la date de prochain renouvellement pour chaque abonnement en renouvellement automatique, en ajoutant cycliquement le `renewalInterval` à partir de l'ancre la plus pertinente, et SHALL n'écrire en base que si la valeur calculée diffère de la valeur stockée (idempotence). Le calculateur SHALL utiliser uniquement `renewalIntervalUnit` et `renewalIntervalCount` pour le cycle — aucun fallback vers `billingInterval` n'est effectué.

#### Scenario: Calcul à partir de renewalPeriodStartDate (prioritaire)

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC`, `renewalIntervalCount=1`, `renewalIntervalUnit=MONTH`, et `renewalPeriodStartDate=2026-06-15`
- **AND** la date courante est 2026-07-29
- **THEN** `nextRenewalDate` est calculé à 2026-08-15 (2026-06-15 + 1 mois + 1 mois pour dépasser aujourd'hui)

#### Scenario: Fallback sur subscriptionDate si renewalPeriodStartDate absent

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC`, `subscriptionDate=2025-01-31`, `renewalPeriodStartDate` absent, `renewalIntervalCount=1`, `renewalIntervalUnit=YEAR`
- **AND** la date courante est 2026-07-29
- **THEN** `nextRenewalDate` est calculé à 2027-01-31 (2025-01-31 + 1 an + 1 an pour dépasser aujourd'hui)

#### Scenario: Ancre absente → pas de calcul avec log de diagnostic

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` mais ni `subscriptionDate` ni `renewalPeriodStartDate` ne sont renseignés
- **THEN** le calculateur ne modifie pas `nextRenewalDate`
- **AND** un log de diagnostic `next-renewal-date-skip` est écrit avec la raison `missing-anchor`

#### Scenario: Cycle de renouvellement absent → pas de calcul avec log de diagnostic

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` et une ancre présente, mais `renewalIntervalUnit` n'est pas renseigné
- **THEN** le calculateur ne modifie pas `nextRenewalDate`
- **AND** un log de diagnostic `next-renewal-date-skip` est écrit avec la raison `missing-renewal-cycle`
- **AND** aucun fallback vers `billingIntervalUnit` n'est effectué

#### Scenario: Pas d'écriture si identique

- **WHEN** la valeur stockée de `nextRenewalDate` est déjà 2026-08-15
- **AND** le calcul aboutit à 2026-08-15
- **THEN** aucune écriture n'est effectuée dans la table `subscriptions` pour cet abonnement

## ADDED Requirements

### Requirement: Logs de diagnostic pour les motifs de skip

Le calculateur `next-renewal-date` SHALL écrire un log de diagnostic dédié avec `event=next-renewal-date-skip` pour chaque abonnement pour lequel `computeNextRenewalDateForSub` retourne `undefined`, avec la raison exacte dans le message.

#### Scenario: Log de skip pour mode non automatique

- **WHEN** l'abonnement a `renewalMode=MANUAL` ou `renewalMode=UNKNOWN`
- **THEN** le calculateur ajoute `next-renewal-date-skip` avec `reason=mode-not-automatic` dans les logs
- **AND** `nextRenewalDate` n'est pas modifié

#### Scenario: Log de skip pour statut ENDED

- **WHEN** l'abonnement a `status=ENDED`
- **THEN** le calculateur ajoute `next-renewal-date-skip` avec `reason=status-ended`
- **AND** `nextRenewalDate` n'est pas modifié

#### Scenario: Log de skip pour absence d'ancre

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` mais ni `subscriptionDate` ni `renewalPeriodStartDate`
- **THEN** le calculateur ajoute `next-renewal-date-skip` avec `reason=missing-anchor`
- **AND** `nextRenewalDate` n'est pas modifié

#### Scenario: Log de skip pour absence de cycle de renouvellement

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC`, une ancre présente, mais `renewalIntervalUnit` absent
- **THEN** le calculateur ajoute `next-renewal-date-skip` avec `reason=missing-renewal-cycle`
- **AND** `nextRenewalDate` n'est pas modifié