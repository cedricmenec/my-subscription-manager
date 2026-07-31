## MODIFIED Requirements

### Requirement: Modèle abonnement v2 structuré

L'application SHALL persister un modèle `Subscription` couvrant au minimum `name`, `status`, `renewalMode`, `currentPrice`, `billingInterval`, `nextChargeDate`, `subscriptionDate`, `managementUrl`, `cancellationUrl`, `cancellationInstructions`, `notes` et les dates de cycle de vie utiles au lot, conformément à la section 13.2 et RG-DAT-006. Le modèle SHALL porter des champs structurés séparant uniquement `billingInterval` (cadence de facturation) et `commitmentInterval` (durée d'engagement renouvelée à échéance), ce dernier faisant office à la fois d'ancienne notion d'engagement informatif et d'ancien `renewalInterval` contractuel. Les champs `renewalIntervalUnit`, `renewalIntervalCount` et `renewalPeriodStartDate` SHALL être supprimés du modèle ; `commitmentIntervalUnit`, `commitmentIntervalCount` et `commitmentStartDate` SHALL être les seuls champs portant la durée et l'ancre de l'engagement. Le champ `currentPrice` est exprimé en unités de la devise (ex: 15.00 pour 15 €). Le champ `currentPriceMinor` a été supprimé. Le champ `renewalStartDate` est renommé en `subscriptionDate`.

#### Scenario: Création avec dates civiles

- **WHEN** l'utilisateur crée un abonnement avec des dates contractuelles
- **THEN** les dates sont persistées au format civil `YYYY-MM-DD`
- **AND** aucune conversion implicite de fuseau n'est appliquée

#### Scenario: Abonnement avec engagement distinct de la facturation

- **WHEN** un abonnement est facturé mensuellement avec un engagement annuel
- **THEN** l'application persiste séparément `billingInterval` (MONTH) et `commitmentInterval` (YEAR)
- **AND** les calculs financiers peuvent s'appuyer sur ces deux champs sans ambiguïté

#### Scenario: Prix en unités de devise (phase 2)

- **WHEN** l'utilisateur enregistre un abonnement avec un prix en unités de devise
- **THEN** `currentPrice` est le seul champ de prix stocké
- **AND** le champ legacy `currentPriceMinor` n'est ni lu ni écrit

#### Scenario: Renommage renewalStartDate → subscriptionDate

- **WHEN** un abonnement existant utilisait le champ `renewalStartDate`
- **THEN** le nouveau champ `subscriptionDate` le remplace
- **AND** la migration Dexie copie `renewalStartDate` → `subscriptionDate`
- **AND** le champ `renewalStartDate` est supprimé de la base

#### Scenario: Absence des champs de renouvellement séparés

- **WHEN** un développeur consulte l'interface `Subscription`
- **THEN** aucun champ `renewalIntervalUnit`, `renewalIntervalCount` ni `renewalPeriodStartDate` n'existe
- **AND** `commitmentIntervalUnit`, `commitmentIntervalCount` et `commitmentStartDate` portent seuls la notion d'engagement/renouvellement

### Requirement: Statuts métier et renouvellement tri-état

L'application SHALL gérer les statuts `TRIAL`, `ACTIVE`, `PAUSED`, `CANCELLED_PENDING_END`, `ENDED`, `UNKNOWN` et les modes de continuation `ROLLING`, `AUTOMATIC`, `UNKNOWN`. La présence d'un engagement SHALL être déterminée exclusivement par la présence de `commitmentIntervalUnit` et `commitmentIntervalCount` (fonction `hasEngagement`), indépendamment de tout rapport avec `billingInterval`. `renewalMode=ROLLING` SHALL impliquer l'absence de `commitmentInterval` ; `renewalMode=AUTOMATIC` SHALL impliquer sa présence. Le mode `MANUAL` n'existe plus.

#### Scenario: Changement de statut vers pause

- **WHEN** l'utilisateur passe un abonnement en statut `PAUSED`
- **THEN** le statut est enregistré localement immédiatement
- **AND** la fiche affiche explicitement l'information de pause et sa date de fin si renseignée

#### Scenario: Reconduction continue explicite

- **WHEN** un service se poursuit jusqu'à résiliation sans engagement distinct
- **THEN** `renewalMode` vaut `ROLLING`
- **AND** `commitmentIntervalUnit` et `commitmentIntervalCount` sont absents

#### Scenario: Engagement annuel avec facturation annuelle reconnu comme engagement réel

- **WHEN** un abonnement a `billingIntervalUnit=YEAR`, `commitmentIntervalUnit=YEAR` et `renewalMode=AUTOMATIC`
- **THEN** l'engagement est traité comme réel (`hasEngagement=true`)
- **AND** ce traitement ne dépend pas du fait que `commitmentInterval` soit égal à `billingInterval`

#### Scenario: Invariant AUTOMATIC implique un engagement défini

- **WHEN** un abonnement a `renewalMode=AUTOMATIC`
- **THEN** `commitmentIntervalUnit` et `commitmentIntervalCount` sont tous deux définis
- **AND** si l'un des deux est absent, l'abonnement est traité comme incomplet plutôt que comme un engagement valide

### Requirement: Champ subscriptionDate modifiable

L'application SHALL persister un champ `subscriptionDate` (date civile, `YYYY-MM-DD`) représentant la date de souscription initiale au service. Ce champ est renseigné à la création de l'abonnement et peut être modifié ultérieurement. Il sert d'ancre de secours pour le calcul de `nextRenewalDate` si `commitmentStartDate` est absent.

#### Scenario: Création avec subscriptionDate

- **WHEN** l'utilisateur crée un abonnement et renseigne la date de souscription
- **THEN** `subscriptionDate` est persisté au format civil `YYYY-MM-DD`
- **AND** le champ peut être modifié ultérieurement via l'UI d'édition

#### Scenario: subscriptionDate absent à la création

- **WHEN** l'utilisateur crée un abonnement sans renseigner `subscriptionDate`
- **THEN** le champ reste `undefined` en base
- **AND** le calcul de `nextRenewalDate` utilisera `commitmentStartDate` comme ancre prioritaire, ou échouera si les deux sont absents

### Requirement: Gate nextChargeDate ≤ nextRenewalDate

La validation d'un abonnement SHALL vérifier que `nextChargeDate` n'est pas postérieure à `nextRenewalDate` dès que `hasEngagement` est vrai (c'est-à-dire dès que `commitmentIntervalUnit`/`commitmentIntervalCount` sont définis) et que les deux dates sont renseignées, indépendamment du rapport entre `commitmentInterval` et `billingInterval`. En l'absence d'engagement, cette gate SHALL être ignorée et `nextRenewalDate` SHALL rester absente.

#### Scenario: nextChargeDate après nextRenewalDate → rejet

- **WHEN** l'utilisateur saisit `nextChargeDate=2026-09-15` et `nextRenewalDate=2026-08-15` sur un abonnement avec engagement
- **THEN** la validation échoue
- **AND** un message d'erreur indique que la prochaine échéance ne peut pas être après la date de renouvellement

#### Scenario: nextChargeDate avant nextRenewalDate → accepté

- **WHEN** l'utilisateur saisit `nextChargeDate=2026-07-15` et `nextRenewalDate=2026-08-15`
- **THEN** la validation réussit

#### Scenario: nextRenewalDate non défini → pas de gate

- **WHEN** `nextRenewalDate` n'est pas défini
- **THEN** aucune règle de gate n'est appliquée sur `nextChargeDate`
- **AND** la validation ne rejette pas l'abonnement pour ce motif

#### Scenario: Engagement annuel/annuel soumis à la gate

- **WHEN** un abonnement a `billingIntervalUnit=commitmentIntervalUnit=YEAR` et `nextChargeDate=2026-09-15`, `nextRenewalDate=2026-08-15`
- **THEN** la validation échoue avec le même message que pour tout engagement, sans exception liée à l'égalité des intervalles

## ADDED Requirements

### Requirement: Migration Dexie v6 — fusion engagement/renouvellement

La base Dexie SHALL migrer vers la version 6 en fusionnant les champs de renouvellement contractuel dans les champs d'engagement et en éliminant le mode `MANUAL`, conformément aux règles suivantes :
- `renewalIntervalUnit`/`renewalIntervalCount` sont copiés vers `commitmentIntervalUnit`/`commitmentIntervalCount` s'ils sont absents, puis supprimés.
- `renewalPeriodStartDate` est copié vers `commitmentStartDate` s'il est absent, puis supprimé.
- `renewalMode=MANUAL` est requalifié `AUTOMATIC` si un engagement est reconstituable, sinon `UNKNOWN`.
- Les abonnements `AUTOMATIC` legacy avec `billingIntervalUnit == renewalIntervalUnit` et `billingIntervalCount == renewalIntervalCount` sont normalisés : `commitmentInterval*` vidé et `renewalMode=ROLLING` si l'unité n'est pas `YEAR` ; `commitmentInterval*` conservé et `renewalMode=AUTOMATIC` si l'unité est `YEAR`.
- Chaque abonnement migré de façon ambiguë ou dégradée écrit un log de diagnostic dans `diagnosticLogs` permettant une revue manuelle a posteriori.

#### Scenario: Fusion simple sans ambiguïté

- **WHEN** un abonnement a `renewalMode=AUTOMATIC`, `renewalIntervalUnit=MONTH`, `renewalIntervalCount=1`, `renewalPeriodStartDate=2026-01-15`, et aucun `commitmentInterval` préexistant
- **THEN** après migration, `commitmentIntervalUnit=MONTH`, `commitmentIntervalCount=1`, `commitmentStartDate=2026-01-15`
- **AND** `renewalIntervalUnit`, `renewalIntervalCount`, `renewalPeriodStartDate` n'existent plus sur l'enregistrement

#### Scenario: Cas ambigu non-annuel normalisé en ROLLING

- **WHEN** un abonnement legacy a `renewalMode=AUTOMATIC`, `billingIntervalUnit=MONTH`, `renewalIntervalUnit=MONTH`, mêmes counts
- **THEN** après migration, `renewalMode=ROLLING`
- **AND** `commitmentIntervalUnit`/`commitmentIntervalCount` sont absents
- **AND** un log de diagnostic de migration est écrit pour cet abonnement

#### Scenario: Cas ambigu annuel préservé comme engagement

- **WHEN** un abonnement legacy a `renewalMode=AUTOMATIC`, `billingIntervalUnit=YEAR`, `renewalIntervalUnit=YEAR`, mêmes counts
- **THEN** après migration, `renewalMode=AUTOMATIC`, `commitmentIntervalUnit=YEAR`, `commitmentIntervalCount` correspondant
- **AND** un log de diagnostic de migration signale la préservation de cet engagement

#### Scenario: Mode MANUAL sans données suffisantes

- **WHEN** un abonnement a `renewalMode=MANUAL` sans `renewalIntervalUnit` ni `renewalPeriodStartDate` ni `subscriptionDate`
- **THEN** après migration, `renewalMode=UNKNOWN`
- **AND** un log de diagnostic de migration signale la dégradation
