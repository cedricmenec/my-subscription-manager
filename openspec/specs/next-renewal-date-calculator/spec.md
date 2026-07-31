# next-renewal-date-calculator Specification

## Purpose
Calculateur idempotent du moteur de calcul pour la détermination automatique de la date de prochain renouvellement (`nextRenewalDate`) et la production des indicateurs d'alerte associés, pour les abonnements en renouvellement automatique.

## Requirements

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

#### Scenario: Cycle de renouvellement absent → pas de calcul avec log de diagnostic

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` et une ancre présente, mais `renewalIntervalUnit` n'est pas renseigné
- **THEN** le calculateur ne modifie pas `nextRenewalDate`
- **AND** un log de diagnostic `next-renewal-date-skip` est écrit avec la raison `missing-renewal-cycle`
- **AND** aucun fallback vers `billingIntervalUnit` n'est effectué

#### Scenario: Pas d'écriture si identique

- **WHEN** tous les champs calculés ou nettoyés ont déjà leur valeur cible
- **THEN** aucune écriture n'est effectuée dans `subscriptions`

#### Scenario: Cycle de renouvellement absent → pas de fallback

- **WHEN** l'abonnement a `renewalMode=AUTOMATIC` et une ancre mais aucun cycle de renouvellement
- **THEN** le calculateur ne modifie pas `nextRenewalDate`
- **AND** écrit `next-renewal-date-skip` avec `missing-renewal-cycle`
- **AND** n'utilise pas le cycle de facturation comme fallback

#### Scenario: Reconduction continue nettoyée

- **WHEN** l'abonnement a `renewalMode=ROLLING` et une ancienne `nextRenewalDate`
- **THEN** `nextRenewalDate` est mise à `undefined`
- **AND** aucun prochain renouvellement contractuel n'est calculé

### Requirement: Règles d'arrêt selon le statut

Le calculateur SHALL mettre `nextRenewalDate` à `undefined` pour les abonnements dont le statut ne permet plus de renouvellement futur.

#### Scenario: Statut ENDED → nextRenewalDate = undefined

- **WHEN** l'abonnement a `status=ENDED`
- **THEN** `nextRenewalDate` est mis à `undefined`
- **AND** le champ écrit même si une valeur existait (nettoyage)

#### Scenario: CANCELLED_PENDING_END avec serviceEndDate dépassée → undefined

- **WHEN** l'abonnement a `status=CANCELLED_PENDING_END` et `serviceEndDate=2026-07-15`
- **AND** la date courante est 2026-07-29 (serviceEndDate dépassée)
- **THEN** `nextRenewalDate` est mis à `undefined`

#### Scenario: CANCELLED_PENDING_END avec serviceEndDate future → conservé

- **WHEN** l'abonnement a `status=CANCELLED_PENDING_END` et `serviceEndDate=2026-12-31`
- **AND** la date courante est 2026-07-29
- **THEN** le calcul normal de `nextRenewalDate` est effectué (le service est encore en cours)

#### Scenario: Abonnement archivé ignoré

- **WHEN** l'abonnement a `archivedAt` renseigné
- **THEN** le calculateur ne traite pas cet abonnement
- **AND** `nextRenewalDate` n'est pas modifié

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

#### Scenario: Log de skip pour mode non automatique

- **WHEN** l'abonnement a `renewalMode=MANUAL` ou `renewalMode=UNKNOWN`
- **THEN** le calculateur ajoute `next-renewal-date-skip` avec `reason=mode-not-automatic` dans les logs
- **AND** `nextRenewalDate` n'est pas modifié

#### Scenario: Log de skip pour statut ENDED

- **WHEN** l'abonnement a `status=ENDED`
- **THEN** le diagnostic porte `reason=status-ended`

#### Scenario: Log de skip pour absence d'ancre

- **WHEN** un abonnement `AUTOMATIC` n'a aucune ancre
- **THEN** le diagnostic porte `reason=missing-anchor`

#### Scenario: Log de skip pour absence de cycle de renouvellement

- **WHEN** un abonnement `AUTOMATIC` a une ancre mais aucun cycle de renouvellement
- **THEN** le diagnostic porte `reason=missing-renewal-cycle`

#### Scenario: Log de skip pour mode sans calcul automatique

- **WHEN** l'abonnement a `renewalMode=MANUAL` ou `renewalMode=UNKNOWN`
- **THEN** le diagnostic porte `reason=mode-not-automatic`

#### Scenario: Log informatif pour reconduction continue

- **WHEN** l'abonnement a `renewalMode=ROLLING`
- **THEN** le diagnostic porte `reason=no-distinct-renewal`
- **AND** l'absence de cycle de renouvellement n'est pas signalée comme erreur

### Requirement: Déclencheurs du calculateur

Le calculateur `next-renewal-date` SHALL être exécuté au démarrage de l'application, après chaque mutation d'un abonnement, et lors du stale-check périodique (quotidien), conformément au mécanisme de déclenchement du moteur.

#### Scenario: Exécution au startup

- **WHEN** l'application démarre et que le moteur exécute un run complet
- **THEN** le calculateur `next-renewal-date` est inclus dans la liste des calculateurs exécutés
- **AND** tous les abonnements sont traités

#### Scenario: Exécution après mutation d'abonnement

- **WHEN** un abonnement est créé ou modifié (localement ou par synchronisation)
- **THEN** le calculateur `next-renewal-date` est exécuté lors du run mutation déclenché

#### Scenario: Exécution périodique (stale-check)

- **WHEN** le stale-check périodique s'exécute
- **THEN** le calculateur `next-renewal-date` est inclus
- **AND** tout abonnement dont `nextRenewalDate` est devenue obsolète (car la date est passée) est mis à jour

### Requirement: Convention inclusive et calcul ancré du renouvellement

Le calculateur `next-renewal-date` SHALL utiliser la convention RF-01 supérieure ou égale à la date de référence et SHALL calculer les occurrences mensuelles ou annuelles depuis l’ancre initiale afin de préserver la politique calendaire.

#### Scenario: Renouvellement le jour de référence

- **WHEN** une occurrence de renouvellement tombe le jour de référence
- **THEN** cette date est retournée comme prochain renouvellement

#### Scenario: Renouvellement au jour 30 après février

- **WHEN** l’ancre est `2026-01-30`, le cycle est mensuel et la référence est `2026-03-01`
- **THEN** le prochain renouvellement est `2026-03-30`
- **AND** le passage par `2026-02-28` ne transforme pas la série en fin de mois
