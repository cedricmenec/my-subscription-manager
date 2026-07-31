## MODIFIED Requirements

### Requirement: Horizon adaptatif des échéances

Le système SHALL projeter les échéances depuis la première occurrence RF-01 selon le cycle de facturation. Il SHALL appliquer `nextRenewalDate` comme borne inclusive dès que `hasEngagement` est vrai (présence de `commitmentIntervalUnit`/`commitmentIntervalCount`), indépendamment du rapport entre `commitmentInterval` et `billingInterval`. Il SHALL limiter l'horizon à douze occurrences, projeter une seule occurrence pour une facturation annuelle et toujours appliquer `serviceEndDate` comme borne inclusive.

#### Scenario: Douze échéances mensuelles sans engagement

- **WHEN** un abonnement mensuel sans engagement (`hasEngagement=false`) a pour prochaine échéance `2026-08-15`
- **THEN** douze échéances sont projetées de `2026-08-15` à `2027-07-15`

#### Scenario: Facturation annuelle

- **WHEN** un abonnement est facturé annuellement
- **THEN** une seule échéance future est projetée

#### Scenario: Facturation mensuelle bornée par l'engagement

- **WHEN** un abonnement mensuel a pour prochaine échéance `2026-08-15` et `nextRenewalDate=2026-12-15` avec `hasEngagement=true`
- **THEN** les échéances sont projetées jusqu'au `2026-12-15` inclus
- **AND** aucune échéance postérieure à l'engagement n'est projetée

#### Scenario: Fin de service prioritaire

- **WHEN** `serviceEndDate` est antérieure à la fin de la fenêtre calculée
- **THEN** aucune échéance postérieure à `serviceEndDate` n'est projetée
- **AND** une occurrence tombant exactement à `serviceEndDate` reste incluse

#### Scenario: Douze échéances mensuelles en reconduction continue

- **WHEN** un abonnement mensuel `ROLLING` a pour prochaine échéance `2026-08-15`
- **THEN** douze échéances sont projetées de `2026-08-15` à `2027-07-15`
- **AND** aucune ancienne `nextRenewalDate` résiduelle ne réduit cette fenêtre

#### Scenario: Engagement annuel/annuel borné comme tout engagement

- **WHEN** un abonnement est facturé annuellement avec `commitmentIntervalUnit=YEAR` (`hasEngagement=true`) et `nextRenewalDate=2027-03-01`
- **THEN** la borne d'engagement s'applique normalement à la fenêtre de projection
- **AND** ce comportement ne dépend pas du fait que `commitmentInterval` soit égal à `billingInterval`

#### Scenario: Facturation mensuelle bornée par un engagement annuel distinct

- **WHEN** un abonnement mensuel a un engagement annuel et `nextRenewalDate=2026-12-15`
- **AND** sa prochaine échéance est `2026-08-15`
- **THEN** les échéances sont projetées jusqu'au `2026-12-15` inclus
- **AND** aucune échéance postérieure à l'engagement n'est projetée
- **AND** le résultat contient au maximum douze occurrences

#### Scenario: Paiements réels ou corrigés protégés

- **WHEN** la matérialisation réconcilie l'échéancier désiré avec les paiements existants
- **THEN** elle ne crée, met à jour ou retire que les projections générées
- **AND** elle ne modifie ni ne supprime aucun paiement réel, importé ou corrigé


