# projected-charge-dates Specification

## Purpose
Calculateur idempotent du moteur de calcul pour projeter les N prochaines dates d'échéance par abonnement, en utilisant le cycle de facturation (`billingInterval`). Les résultats sont stockés dans la table locale `calculationState` et peuvent être utilisés par l'UI pour afficher un calendrier d'échéances.

## Requirements

### Requirement: Projection des N prochaines échéances

Le calculateur `projected-charge-dates` SHALL projeter les N prochaines dates d'échéance (par défaut 12) pour chaque abonnement actif non-archivé, en ajoutant cycliquement le `billingInterval` à partir de la date de référence la plus pertinente, et SHALL n'écrire en base que si le résultat diffère de la valeur stockée (idempotence).

#### Scenario: Projection pour un abonnement mensuel

- **WHEN** l'abonnement a `billingIntervalCount=1`, `billingIntervalUnit=MONTH`, `nextChargeDate=2026-08-15`, et n'est pas archivé
- **AND** la projection demande 12 mois
- **THEN** les 12 dates suivantes sont calculées : 2026-08-15, 2026-09-15, 2026-10-15, ..., 2027-07-15
- **AND** le résultat est stocké dans `calculationState` avec la clé `<subId>:projected-charge-dates`

#### Scenario: Projection pour un abonnement annuel

- **WHEN** l'abonnement a `billingIntervalCount=1`, `billingIntervalUnit=YEAR`, `nextChargeDate=2026-01-01`
- **AND** la projection demande 12 mois
- **THEN** les dates suivantes sont calculées : 2026-01-01, 2027-01-01, 2028-01-01, ... jusqu'à couvrir 12 mois
- **AND** seules les dates dans la fenêtre de projection sont incluses

#### Scenario: Abonnement sans nextChargeDate → pas de projection

- **WHEN** l'abonnement n'a pas de `nextChargeDate` renseigné
- **THEN** le calculateur ne projette pas d'échéances pour cet abonnement
- **AND** un log de diagnostic `projected-charge-dates-skip` est écrit avec la raison `missing-next-charge-date`

### Requirement: Date de référence pour la projection

Le calculateur SHALL utiliser `nextChargeDate` comme date de départ de la projection, ou `nextRenewalDate` comme fallback si `nextChargeDate` est absent. Si aucune des deux n'est disponible, l'abonnement est ignoré.

#### Scenario: Projection à partir de nextRenewalDate en fallback

- **WHEN** l'abonnement n'a pas de `nextChargeDate` mais a `nextRenewalDate=2026-09-01`
- **THEN** le calculateur utilise `nextRenewalDate` comme date de départ
- **AND** les échéances projetées sont calculées à partir de cette date

### Requirement: Idempotence et format de stockage

Le calculateur SHALL comparer le résultat JSON calculé avec la valeur stockée dans `calculationState` pour la clé `<subId>:projected-charge-dates`. Si identique, aucune écriture n'est effectuée.

#### Scenario: Pas d'écriture si identique

- **WHEN** le calcul des échéances projetées pour un abonnement donne le même résultat que la valeur précédemment stockée
- **THEN** aucune écriture dans `calculationState` n'est effectuée

#### Scenario: Format des données stockées

- **WHEN** le calculateur stocke les échéances projetées
- **THEN** la valeur est un JSON contenant `{ subscriptionId, projectedDates: string[], generatedAt: string }`
- **AND** la clé est `<subId>:projected-charge-dates`
- **AND** la table utilisée est `calculationState` (table locale, non synchronisée)

### Requirement: Déclencheurs du calculateur

Le calculateur `projected-charge-dates` SHALL dépendre de `next-renewal-date` et SHALL être exécuté après chaque mise à jour de `nextRenewalDate`, ainsi qu'au démarrage et lors du stale-check périodique.

#### Scenario: Exécution après next-renewal-date

- **WHEN** le calculateur `next-renewal-date` termine son exécution avec au moins une mise à jour
- **THEN** le calculateur `projected-charge-dates` est exécuté (via la dépendance déclarée)
- **AND** les échéances projetées sont recalculées pour tous les abonnements concernés

#### Scenario: Exécution au startup

- **WHEN** l'application démarre et que le moteur exécute un run complet
- **THEN** le calculateur `projected-charge-dates` est inclus dans la liste des calculateurs exécutés