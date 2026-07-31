## MODIFIED Requirements

### Requirement: Mise en relief des prochaines échéances

La fiche SHALL mettre en évidence le prochain paiement disponible indépendamment du mode de continuation. Elle SHALL mettre en évidence une prochaine date de renouvellement uniquement lorsque `hasEngagement` est vrai (présence de `commitmentIntervalUnit`/`commitmentIntervalCount`) et SHALL afficher explicitement le libellé « Reconduction continue » pour `ROLLING` sans carte de renouvellement.

#### Scenario: Prochain paiement matérialisé

- **WHEN** l'abonnement possède au moins un paiement `PROJECTED` daté d'aujourd'hui ou d'une date future
- **THEN** le premier paiement chronologique est affiché dans la carte « Prochain paiement »
- **AND** son montant, sa devise, sa date civile et son délai relatif sont visibles

#### Scenario: Repli sur la prochaine date de facturation

- **WHEN** aucun paiement futur matérialisé n'est disponible mais que `nextChargeDate` est renseignée
- **THEN** la carte « Prochain paiement » affiche cette date
- **AND** utilise le prix courant lorsqu'il est disponible

#### Scenario: Renouvellement automatique avec engagement

- **WHEN** `renewalMode` vaut `AUTOMATIC`, `hasEngagement` est vrai et `nextRenewalDate` est renseignée
- **THEN** une carte « Prochain renouvellement » affiche la date et son délai relatif

#### Scenario: Date de renouvellement automatique indisponible

- **WHEN** `renewalMode` vaut `AUTOMATIC`, `hasEngagement` est vrai et `nextRenewalDate` est absente
- **THEN** la carte de renouvellement affiche « Date non calculable »

#### Scenario: Renouvellement non automatique

- **WHEN** `renewalMode` vaut `UNKNOWN`
- **THEN** aucune carte de prochaine date de renouvellement n'est mise en relief
- **AND** le mode reste visible dans les informations détaillées

#### Scenario: Engagement annuel/annuel mis en relief comme tout engagement

- **WHEN** `billingIntervalUnit=commitmentIntervalUnit=YEAR`, `renewalMode=AUTOMATIC` et `nextRenewalDate` est renseignée
- **THEN** la carte « Prochain renouvellement » est affichée normalement
- **AND** ce comportement ne dépend pas de l'égalité entre `commitmentInterval` et `billingInterval`

#### Scenario: Reconduction continue

- **WHEN** `renewalMode=ROLLING`
- **THEN** aucune carte « Prochain renouvellement » n'est affichée
- **AND** « Reconduction continue » reste visible dans les informations détaillées

## ADDED Requirements

### Requirement: Badge d'exposition financière sur la fiche

La fiche abonnement SHALL afficher un badge indiquant le montant total en jeu sur la durée de l'engagement (« exposition financière ») lorsque `hasEngagement` est vrai et que `currentPrice`, `billingInterval` et `commitmentInterval` sont tous renseignés. Ce montant SHALL être calculé par la fonction pure `computeEngagementExposure` (prix courant multiplié par le nombre de cycles de facturation contenus dans l'engagement) et SHALL ne jamais être persisté.

#### Scenario: Badge affiché pour un engagement mensuel sur un an

- **WHEN** un abonnement a `currentPrice=15`, `billingIntervalUnit=MONTH`, `commitmentIntervalUnit=YEAR`, `commitmentIntervalCount=1`
- **THEN** la fiche affiche un badge « 180 € en jeu »

#### Scenario: Badge affiché pour un engagement annuel facturé annuellement

- **WHEN** un abonnement a `currentPrice=200`, `billingIntervalUnit=YEAR`, `commitmentIntervalUnit=YEAR`, `commitmentIntervalCount=1`
- **THEN** la fiche affiche un badge « 200 € en jeu »

#### Scenario: Aucun badge sans engagement

- **WHEN** un abonnement a `renewalMode=ROLLING` (aucun `commitmentInterval`)
- **THEN** aucun badge d'exposition n'est affiché

#### Scenario: Aucun badge si données insuffisantes

- **WHEN** un abonnement a `hasEngagement=true` mais `currentPrice` n'est pas renseigné
- **THEN** aucun badge d'exposition n'est affiché
