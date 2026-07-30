# next-renewal-date-calculator Specification

## Purpose
Calculateur idempotent du moteur de calcul pour la détermination automatique de la date de prochain renouvellement (`nextRenewalDate`) et la production des indicateurs d'alerte associés, pour les abonnements en renouvellement automatique.

## Requirements

### Requirement: Calcul idempotent de nextRenewalDate

Le calculateur `next-renewal-date` SHALL calculer la date de prochain renouvellement pour chaque abonnement en renouvellement automatique, en ajoutant cycliquement le `renewalInterval` à partir de l'ancre la plus pertinente, et SHALL n'écrire en base que si la valeur calculée diffère de la valeur stockée (idempotence).

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

Le calculateur SHALL déterminer, pour chaque abonnement traité, les valeurs par défaut de `notifyBeforeRenewal` et `notifyBeforeRenewalDays` selon la règle de cycle, et SHALL les écrire uniquement si les champs ne sont pas déjà renseignés par l'utilisateur.

#### Scenario: Alerte par défaut pour cycle mensuel

- **WHEN** l'abonnement a `renewalIntervalUnit=MONTH`, `renewalIntervalCount=1`, et `notifyBeforeRenewal` n'est pas renseigné
- **THEN** `notifyBeforeRenewal` est positionné à `true` (opt-in)
- **AND** `notifyBeforeRenewalDays` est positionné à 7

#### Scenario: Alerte par défaut pour cycle annuel

- **WHEN** l'abonnement a `renewalIntervalUnit=YEAR` (ou `renewalIntervalCount≥6` mois équivalent) et `notifyBeforeRenewal` n'est pas renseigné
- **THEN** `notifyBeforeRenewal` est positionné à `false` (opt-out)
- **AND** `notifyBeforeRenewalDays` est positionné à 30

#### Scenario: Alerte par défaut pour mode MANUAL

- **WHEN** l'abonnement a `renewalMode=MANUAL` et `notifyBeforeRenewal` n'est pas renseigné
- **THEN** `notifyBeforeRenewal` est positionné à `true` (always)
- **AND** `notifyBeforeRenewalDays` est positionné à 7

#### Scenario: Valeurs utilisateur conservées

- **WHEN** l'abonnement a `notifyBeforeRenewal=false` et `notifyBeforeRenewalDays=14` déjà renseignés
- **THEN** le calculateur ne modifie pas ces valeurs
- **AND** les préférences utilisateur sont respectées

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
