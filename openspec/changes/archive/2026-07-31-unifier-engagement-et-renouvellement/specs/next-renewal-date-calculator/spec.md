## MODIFIED Requirements

### Requirement: Calcul idempotent de nextRenewalDate

Le calculateur `next-renewal-date` SHALL calculer `nextRenewalDate` uniquement lorsque `hasEngagement` est vrai (c'est-à-dire lorsque `commitmentIntervalUnit` et `commitmentIntervalCount` sont définis) et `renewalMode=AUTOMATIC`, en ajoutant cycliquement `commitmentInterval` depuis l'ancre pertinente (`commitmentStartDate`, ou `subscriptionDate` en repli), et SHALL n'écrire que si l'état calculé diffère. Pour `ROLLING` ou tout abonnement sans engagement, il SHALL nettoyer toute date contractuelle résiduelle sans tenter de calcul.

#### Scenario: Calcul à partir de commitmentStartDate (prioritaire)

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC`, `commitmentIntervalCount=1`, `commitmentIntervalUnit=MONTH`, et `commitmentStartDate=2026-06-15`
- **AND** la date courante est 2026-07-29
- **THEN** `nextRenewalDate` est calculé à 2026-08-15

#### Scenario: Fallback sur subscriptionDate si commitmentStartDate absent

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC`, `subscriptionDate=2025-01-31`, `commitmentStartDate` absent, `commitmentIntervalCount=1`, `commitmentIntervalUnit=YEAR`
- **AND** la date courante est 2026-07-29
- **THEN** `nextRenewalDate` est calculé à 2027-01-31

#### Scenario: Ancre absente → pas de calcul avec log de diagnostic

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` mais aucune ancre d'engagement
- **THEN** le calculateur ne modifie pas `nextRenewalDate`
- **AND** écrit `next-renewal-date-skip` avec `missing-anchor`

#### Scenario: Cycle d'engagement absent → pas de calcul avec log de diagnostic

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` et une ancre présente, mais `commitmentIntervalUnit` ou `commitmentIntervalCount` n'est pas renseigné
- **THEN** le calculateur ne modifie pas `nextRenewalDate`
- **AND** un log de diagnostic `next-renewal-date-skip` est écrit avec la raison `missing-renewal-cycle`
- **AND** aucun fallback vers `billingIntervalUnit` n'est effectué

#### Scenario: Pas d'écriture si identique

- **WHEN** tous les champs calculés ou nettoyés ont déjà leur valeur cible
- **THEN** aucune écriture n'est effectuée dans `subscriptions`

#### Scenario: Reconduction continue nettoyée

- **WHEN** l'abonnement a `renewalMode=ROLLING` et une ancienne `nextRenewalDate`
- **THEN** `nextRenewalDate` est mise à `undefined`
- **AND** aucun prochain renouvellement contractuel n'est calculé

#### Scenario: Engagement annuel/annuel calculé comme tout engagement

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC`, `billingIntervalUnit=commitmentIntervalUnit=YEAR`, `commitmentStartDate=2026-03-01`
- **AND** la date courante est 2026-07-29
- **THEN** `nextRenewalDate` est calculé à 2027-03-01, exactement comme pour un engagement à intervalle différent de la facturation

### Requirement: Production des indicateurs d'alerte de renouvellement

Le calculateur SHALL déterminer les valeurs par défaut de `notifyBeforeRenewal` et `notifyBeforeRenewalDays` uniquement lorsque `hasEngagement` est vrai, sans écraser les choix utilisateur. Il SHALL nettoyer ces champs en l'absence d'engagement.

#### Scenario: Alerte par défaut pour cycle mensuel

- **WHEN** un engagement a un cycle mensuel et aucune préférence renseignée
- **THEN** `notifyBeforeRenewal=true` et `notifyBeforeRenewalDays=7`

#### Scenario: Alerte par défaut pour cycle annuel

- **WHEN** un engagement a un cycle annuel et aucune préférence renseignée
- **THEN** `notifyBeforeRenewal=false` et `notifyBeforeRenewalDays=30`

#### Scenario: Valeurs utilisateur conservées

- **WHEN** un engagement a déjà `notifyBeforeRenewal=false` et `notifyBeforeRenewalDays=14`
- **THEN** le calculateur ne modifie pas ces valeurs

#### Scenario: Aucune alerte contractuelle sans engagement

- **WHEN** `hasEngagement` est faux (y compris `renewalMode=ROLLING`)
- **THEN** les deux champs d'alerte de renouvellement sont mis à `undefined`

### Requirement: Logs de diagnostic pour les motifs de skip

Le calculateur `next-renewal-date` SHALL écrire un diagnostic `next-renewal-date-skip` avec une raison stable lorsqu'il ne calcule pas d'engagement. L'absence d'engagement (`ROLLING` ou `hasEngagement=false`) SHALL être distinguée d'une donnée `AUTOMATIC` incomplète.

#### Scenario: Log de skip pour mode non automatique

- **WHEN** l'abonnement a `renewalMode=UNKNOWN`
- **THEN** le calculateur ajoute `next-renewal-date-skip` avec `reason=mode-not-automatic` dans les logs
- **AND** `nextRenewalDate` n'est pas modifié

\n
