# projected-charge-dates Specification

## Purpose

Définir le calcul pur et déterministe des occurrences de facturation, la convention RF-01, les politiques calendaires et l’horizon adaptatif utilisés par la matérialisation financière synchronisée.

## Requirements

### Requirement: Calcul RF-01 de la première occurrence

Le système SHALL calculer la première occurrence d’une récurrence supérieure ou égale à une date de référence à partir d’une date d’ancrage, d’une unité, d’un nombre d’unités et d’une politique calendaire déterministe, conformément à RG-DAT-001 à RG-DAT-006.

#### Scenario: Occurrence du jour incluse

- **WHEN** l’ancre est `2026-01-15`, la récurrence est mensuelle et la date de référence est `2026-07-15`
- **THEN** la première occurrence retournée est `2026-07-15`

#### Scenario: Occurrence strictement suivante

- **WHEN** l’ancre est `2026-01-15`, la récurrence est mensuelle et la date de référence est `2026-07-16`
- **THEN** la première occurrence retournée est `2026-08-15`

#### Scenario: Ancre postérieure à la référence

- **WHEN** l’ancre est `2026-09-01` et la date de référence est `2026-07-30`
- **THEN** la première occurrence retournée est l’ancre `2026-09-01`

### Requirement: Stabilité de la politique calendaire

Les occurrences mensuelles et annuelles SHALL être calculées depuis l’ancre initiale et non depuis l’occurrence intermédiaire précédente. Une ancre située au dernier jour du mois SHALL conserver la fin de mois ; une autre ancre SHALL conserver son numéro de jour ou utiliser le dernier jour valide du mois cible.

#### Scenario: Jour 30 après un mois court

- **WHEN** l’ancre est le `2026-01-30` avec une récurrence mensuelle
- **THEN** les occurrences suivantes incluent `2026-02-28` puis `2026-03-30`
- **AND** le passage par février ne transforme pas la récurrence en fin de mois

#### Scenario: Fin de mois conservée

- **WHEN** l’ancre est le `2026-01-31` avec une récurrence mensuelle
- **THEN** les occurrences suivantes incluent `2026-02-28` puis `2026-03-31`

#### Scenario: Anniversaire bissextile

- **WHEN** l’ancre est le `2024-02-29` avec une récurrence annuelle
- **THEN** l’occurrence 2025 est `2025-02-28`
- **AND** l’occurrence 2028 est `2028-02-29`

### Requirement: Horizon adaptatif des échéances

Le système SHALL projeter les échéances depuis la première occurrence RF-01 selon le cycle de facturation. Il SHALL appliquer `nextRenewalDate` comme borne inclusive uniquement pour un renouvellement contractuel distinct, limiter l'horizon à douze occurrences, projeter une seule occurrence pour une facturation annuelle et toujours appliquer `serviceEndDate` comme borne inclusive.

#### Scenario: Douze échéances mensuelles sans renouvellement

- **WHEN** un abonnement mensuel a pour prochaine échéance `2026-08-15` et aucune prochaine date de renouvellement
- **THEN** douze échéances sont projetées de `2026-08-15` à `2027-07-15`

#### Scenario: Facturation annuelle

- **WHEN** un abonnement est facturé annuellement
- **THEN** une seule échéance future est projetée

#### Scenario: Facturation mensuelle bornée par le renouvellement

- **WHEN** un abonnement mensuel a pour prochaine échéance `2026-08-15` et `nextRenewalDate=2026-12-15`
- **THEN** les échéances sont projetées jusqu’au `2026-12-15` inclus
- **AND** aucune échéance postérieure au renouvellement n’est projetée

#### Scenario: Fin de service prioritaire

- **WHEN** `serviceEndDate` est antérieure à la fin de la fenêtre calculée
- **THEN** aucune échéance postérieure à `serviceEndDate` n'est projetée
- **AND** une occurrence tombant exactement à `serviceEndDate` reste incluse

#### Scenario: Douze échéances mensuelles en reconduction continue

- **WHEN** un abonnement mensuel `ROLLING` a pour prochaine échéance `2026-08-15`
- **THEN** douze échéances sont projetées de `2026-08-15` à `2027-07-15`
- **AND** aucune ancienne `nextRenewalDate` résiduelle ne réduit cette fenêtre

#### Scenario: Compatibilité d'un renouvellement mensuel identique

- **WHEN** un abonnement legacy est facturé et renouvelé automatiquement tous les mois
- **AND** ses deux intervalles sont identiques
- **THEN** `nextRenewalDate` n'est pas utilisée comme borne
- **AND** douze mensualités sont projetées

#### Scenario: Facturation mensuelle bornée par un renouvellement annuel distinct

- **WHEN** un abonnement mensuel a un renouvellement contractuel annuel et `nextRenewalDate=2026-12-15`
- **AND** sa prochaine échéance est `2026-08-15`
- **THEN** les échéances sont projetées jusqu'au `2026-12-15` inclus
- **AND** aucune échéance postérieure au renouvellement n'est projetée
- **AND** le résultat contient au maximum douze occurrences

#### Scenario: Paiements réels ou corrigés protégés

- **WHEN** la matérialisation réconcilie l'échéancier désiré avec les paiements existants
- **THEN** elle ne crée, met à jour ou retire que les projections générées
- **AND** elle ne modifie ni ne supprime aucun paiement réel, importé ou corrigé

### Requirement: Calcul pur sans stockage local redondant

Le calcul des dates projetées SHALL être une opération pure utilisée par la matérialisation financière et MUST NOT écrire une seconde copie de l’échéancier dans `calculationState`.

#### Scenario: Calcul de l’échéancier

- **WHEN** le moteur calcule les échéances désirées
- **THEN** le calcul retourne des valeurs déterministes sans horodatage volatil
- **AND** aucune clé `<subscriptionId>:projected-charge-dates` n’est créée ou mise à jour
