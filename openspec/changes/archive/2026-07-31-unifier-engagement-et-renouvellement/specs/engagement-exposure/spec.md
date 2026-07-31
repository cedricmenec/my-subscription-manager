## Purpose

Définir le calcul pur et l'affichage de l'exposition financière (montant total en jeu sur la durée d'un engagement) pour les abonnements ayant un engagement daté, afin d'aider l'utilisateur à évaluer le coût d'un renouvellement manqué.

## ADDED Requirements

### Requirement: Calcul pur de l'exposition financière

Le système SHALL fournir une fonction pure `computeEngagementExposure` calculant le montant total en jeu sur la durée d'un engagement, définie comme `currentPrice × cycleCount`, où `cycleCount` est le nombre entier arrondi de cycles de facturation (`billingInterval`) contenus dans la durée d'engagement (`commitmentInterval`), avec un minimum de 1. Cette fonction SHALL retourner `undefined` lorsque l'abonnement n'a pas d'engagement (`hasEngagement=false`) ou lorsque `currentPrice`, `billingInterval` ou `commitmentInterval` sont absents. Le résultat SHALL ne jamais être persisté ; il est recalculé à chaque affichage.

#### Scenario: Engagement annuel facturé mensuellement

- **WHEN** un abonnement a `currentPrice=15`, `currency=EUR`, `billingIntervalUnit=MONTH`, `billingIntervalCount=1`, `commitmentIntervalUnit=YEAR`, `commitmentIntervalCount=1`
- **THEN** `computeEngagementExposure` retourne `{ amount: 180, currency: 'EUR', cycleCount: 12 }`

#### Scenario: Engagement annuel facturé annuellement

- **WHEN** un abonnement a `currentPrice=200`, `currency=EUR`, `billingIntervalUnit=YEAR`, `billingIntervalCount=1`, `commitmentIntervalUnit=YEAR`, `commitmentIntervalCount=1`
- **THEN** `computeEngagementExposure` retourne `{ amount: 200, currency: 'EUR', cycleCount: 1 }`

#### Scenario: Absence d'engagement

- **WHEN** un abonnement a `renewalMode=ROLLING` (aucun `commitmentInterval`)
- **THEN** `computeEngagementExposure` retourne `undefined`

#### Scenario: Prix manquant

- **WHEN** un abonnement a un engagement défini mais `currentPrice` est `undefined`
- **THEN** `computeEngagementExposure` retourne `undefined`

#### Scenario: Cycle non multiple entier

- **WHEN** un abonnement a `billingIntervalUnit=WEEK`, `billingIntervalCount=1` et `commitmentIntervalUnit=MONTH`, `commitmentIntervalCount=1`
- **THEN** `cycleCount` est arrondi au nombre entier le plus proche, avec un minimum de 1

### Requirement: Affichage de l'exposition financière comme badge

L'application SHALL afficher le résultat de `computeEngagementExposure`, lorsqu'il est défini, comme un badge textuel indiquant le montant total et la devise (ex: « 180 € en jeu ») sur la fiche abonnement et dans la liste des prochaines échéances du dashboard. Aucun badge SHALL être affiché lorsque le calcul retourne `undefined`.

#### Scenario: Badge visible sur la fiche abonnement

- **WHEN** un abonnement avec engagement et données complètes est consulté sur sa fiche
- **THEN** le badge d'exposition est visible avec le montant formaté selon la devise

#### Scenario: Badge visible sur le dashboard

- **WHEN** une prochaine échéance du dashboard correspond à un renouvellement d'engagement
- **THEN** le badge d'exposition est visible à côté de cette échéance

#### Scenario: Aucun badge pour un abonnement sans engagement

- **WHEN** un abonnement `ROLLING` est consulté sur sa fiche ou listé sur le dashboard
- **THEN** aucun badge d'exposition n'est affiché
