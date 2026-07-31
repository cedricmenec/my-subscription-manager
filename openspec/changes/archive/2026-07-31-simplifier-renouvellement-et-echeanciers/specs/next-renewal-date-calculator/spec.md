## MODIFIED Requirements

### Requirement: Calcul idempotent de nextRenewalDate

Le calculateur `next-renewal-date` SHALL calculer `nextRenewalDate` uniquement pour un renouvellement contractuel `AUTOMATIC`, en ajoutant cycliquement `renewalInterval` depuis l'ancre pertinente, et SHALL n'écrire que si l'état calculé diffère. Pour `ROLLING`, il SHALL nettoyer toute date contractuelle résiduelle sans tenter de calcul.

#### Scenario: Calcul à partir de renewalPeriodStartDate (prioritaire)

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC`, `renewalIntervalCount=1`, `renewalIntervalUnit=MONTH`, et `renewalPeriodStartDate=2026-06-15`
- **AND** la date courante est 2026-07-29
- **THEN** `nextRenewalDate` est calculé à 2026-08-15

#### Scenario: Fallback sur subscriptionDate si renewalPeriodStartDate absent

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC`, `subscriptionDate=2025-01-31`, `renewalPeriodStartDate` absent, `renewalIntervalCount=1`, `renewalIntervalUnit=YEAR`
- **AND** la date courante est 2026-07-29
- **THEN** `nextRenewalDate` est calculé à 2027-01-31

#### Scenario: Ancre absente → pas de calcul avec log de diagnostic

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` mais aucune ancre de renouvellement
- **THEN** le calculateur ne modifie pas `nextRenewalDate`
- **AND** écrit `next-renewal-date-skip` avec `missing-anchor`

#### Scenario: Cycle de renouvellement absent → pas de fallback

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` et une ancre mais aucun cycle de renouvellement
- **THEN** le calculateur ne modifie pas `nextRenewalDate`
- **AND** écrit `next-renewal-date-skip` avec `missing-renewal-cycle`
- **AND** n'utilise pas le cycle de facturation comme fallback

#### Scenario: Reconduction continue nettoyée

- **WHEN** l'abonnement a `renewalMode=ROLLING` et une ancienne `nextRenewalDate`
- **THEN** `nextRenewalDate` est mise à `undefined`
- **AND** aucun prochain renouvellement contractuel n'est calculé

#### Scenario: Pas d'écriture si identique

- **WHEN** tous les champs calculés ou nettoyés ont déjà leur valeur cible
- **THEN** aucune écriture n'est effectuée dans `subscriptions`

### Requirement: Production des indicateurs d'alerte de renouvellement

Le calculateur SHALL déterminer les valeurs par défaut de `notifyBeforeRenewal` et `notifyBeforeRenewalDays` uniquement pour un renouvellement contractuel, sans écraser les choix utilisateur. Il SHALL nettoyer ces champs pour `ROLLING`.

#### Scenario: Alerte par défaut pour cycle mensuel

- **WHEN** un renouvellement contractuel a un cycle mensuel et aucune préférence renseignée
- **THEN** `notifyBeforeRenewal=true` et `notifyBeforeRenewalDays=7`

#### Scenario: Alerte par défaut pour cycle annuel

- **WHEN** un renouvellement contractuel a un cycle annuel et aucune préférence renseignée
- **THEN** `notifyBeforeRenewal=false` et `notifyBeforeRenewalDays=30`

#### Scenario: Alerte par défaut pour mode MANUAL

- **WHEN** l'abonnement a `renewalMode=MANUAL` et aucune préférence renseignée
- **THEN** `notifyBeforeRenewal=true` et `notifyBeforeRenewalDays=7`

#### Scenario: Valeurs utilisateur conservées

- **WHEN** un renouvellement contractuel a déjà `notifyBeforeRenewal=false` et `notifyBeforeRenewalDays=14`
- **THEN** le calculateur ne modifie pas ces valeurs

#### Scenario: Aucune alerte contractuelle en reconduction continue

- **WHEN** `renewalMode=ROLLING`
- **THEN** les deux champs d'alerte de renouvellement sont mis à `undefined`

### Requirement: Logs de diagnostic pour les motifs de skip

Le calculateur `next-renewal-date` SHALL écrire un diagnostic `next-renewal-date-skip` avec une raison stable lorsqu'il ne calcule pas de renouvellement contractuel. `ROLLING` SHALL être distingué d'une donnée automatique incomplète.

#### Scenario: Log de skip pour mode sans calcul automatique

- **WHEN** l'abonnement a `renewalMode=MANUAL` ou `renewalMode=UNKNOWN`
- **THEN** le diagnostic porte `reason=mode-not-automatic`

#### Scenario: Log informatif pour reconduction continue

- **WHEN** l'abonnement a `renewalMode=ROLLING`
- **THEN** le diagnostic porte `reason=no-distinct-renewal`
- **AND** l'absence de cycle de renouvellement n'est pas signalée comme erreur

#### Scenario: Log de skip pour statut ENDED

- **WHEN** l'abonnement a `status=ENDED`
- **THEN** le diagnostic porte `reason=status-ended`

#### Scenario: Log de skip pour absence d'ancre

- **WHEN** un abonnement `AUTOMATIC` n'a aucune ancre
- **THEN** le diagnostic porte `reason=missing-anchor`

#### Scenario: Log de skip pour absence de cycle de renouvellement

- **WHEN** un abonnement `AUTOMATIC` a une ancre mais aucun cycle de renouvellement
- **THEN** le diagnostic porte `reason=missing-renewal-cycle`
