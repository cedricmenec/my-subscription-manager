## ADDED Requirements

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

Le système SHALL projeter les échéances à partir de la première occurrence RF-01 selon une fenêtre adaptative bornée par la périodicité, `nextRenewalDate` et `serviceEndDate`, conformément à RG-STA-003, RG-PAU-001 et RG-CAN-002.

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

- **WHEN** `serviceEndDate` est antérieure à la fin de la fenêtre adaptative
- **THEN** aucune échéance postérieure à `serviceEndDate` n’est projetée

### Requirement: Calcul pur sans stockage local redondant

Le calcul des dates projetées SHALL être une opération pure utilisée par la matérialisation financière et MUST NOT écrire une seconde copie de l’échéancier dans `calculationState`.

#### Scenario: Calcul de l’échéancier

- **WHEN** le moteur calcule les échéances désirées
- **THEN** le calcul retourne des valeurs déterministes sans horodatage volatil
- **AND** aucune clé `<subscriptionId>:projected-charge-dates` n’est créée ou mise à jour

## REMOVED Requirements

### Requirement: Projection des N prochaines échéances

**Reason**: La projection fixe de douze occurrences et son stockage séparé sont remplacés par RF-01 et l’horizon adaptatif matérialisé uniquement dans `payments`.

**Migration**: Les consommateurs utilisent les paiements `PROJECTED`; les anciennes entrées locales deviennent inertes.

### Requirement: Date de référence pour la projection

**Reason**: Le fallback de facturation vers `nextRenewalDate` mélangeait cycle financier et cycle contractuel. RF-01 utilise l’ancre de facturation, tandis que `nextRenewalDate` borne seulement la fenêtre.

**Migration**: Les abonnements sans `nextChargeDate` ne produisent pas de paiement projeté.

### Requirement: Idempotence et format de stockage

**Reason**: Le JSON local avec `generatedAt` est redondant et non idempotent.

**Migration**: L’idempotence est assurée par la réconciliation de la table synchronisée `payments`.

### Requirement: Déclencheurs du calculateur

**Reason**: Le calculateur séparé est retiré du registre.

**Migration**: Les mêmes déclencheurs exécutent `projected-payments`, qui appelle le calcul pur d’échéancier.
