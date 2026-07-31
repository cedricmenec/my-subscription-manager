## MODIFIED Requirements

### Requirement: Statuts métier et renouvellement tri-état

L'application SHALL gérer les statuts `TRIAL`, `ACTIVE`, `PAUSED`, `CANCELLED_PENDING_END`, `ENDED`, `UNKNOWN` et les modes de continuation `ROLLING`, `AUTOMATIC`, `MANUAL`, `UNKNOWN`. `ROLLING` SHALL représenter une reconduction continue sans renouvellement contractuel distinct ; `AUTOMATIC` et `MANUAL` SHALL être réservés à un renouvellement contractuel à date identifiable.

#### Scenario: Changement de statut vers pause

- **WHEN** l'utilisateur passe un abonnement en statut `PAUSED`
- **THEN** le statut est enregistré localement immédiatement
- **AND** la fiche affiche explicitement l'information de pause et sa date de fin si renseignée

#### Scenario: Reconduction continue explicite

- **WHEN** un service se poursuit jusqu'à résiliation sans échéance contractuelle distincte
- **THEN** `renewalMode` vaut `ROLLING`
- **AND** cette valeur ne dépend pas de l'absence fortuite d'un champ de renouvellement

### Requirement: Gate nextChargeDate ≤ nextRenewalDate

La validation d'un abonnement SHALL vérifier que `nextChargeDate` n'est pas postérieure à `nextRenewalDate` uniquement lorsque `renewalMode` décrit un renouvellement contractuel distinct et que les deux dates sont renseignées. `ROLLING` SHALL ignorer cette gate et ne SHALL pas conserver `nextRenewalDate`.

#### Scenario: nextChargeDate après un renouvellement contractuel → rejet

- **WHEN** un abonnement à renouvellement contractuel saisit `nextChargeDate=2026-09-15` et `nextRenewalDate=2026-08-15`
- **THEN** la validation échoue
- **AND** un message indique que la prochaine échéance ne peut pas être après la date de renouvellement contractuel

#### Scenario: nextChargeDate avant le renouvellement contractuel → accepté

- **WHEN** un abonnement à renouvellement contractuel saisit `nextChargeDate=2026-07-15` et `nextRenewalDate=2026-08-15`
- **THEN** la validation réussit

#### Scenario: Reconduction continue sans gate

- **WHEN** `renewalMode=ROLLING`
- **THEN** aucune règle de gate n'est appliquée sur `nextChargeDate`
- **AND** `nextRenewalDate` est nettoyée plutôt qu'utilisée comme borne

## ADDED Requirements

### Requirement: Invariants des modes de continuation

Le système SHALL nettoyer les champs de renouvellement contractuel incompatibles avec `ROLLING` et SHALL préserver l'indépendance entre cycle de facturation, engagement et renouvellement contractuel.

#### Scenario: Passage à la reconduction continue

- **WHEN** un abonnement est sauvegardé avec `renewalMode=ROLLING`
- **THEN** `renewalIntervalCount`, `renewalIntervalUnit`, `renewalPeriodStartDate`, `nextRenewalDate`, `notifyBeforeRenewal` et `notifyBeforeRenewalDays` sont absents
- **AND** les champs de facturation et d'engagement sont conservés
- **AND** aucun paiement réel ou corrigé n'est modifié

#### Scenario: Donnée incomplète non interprétée

- **WHEN** `renewalMode=UNKNOWN` et les champs de renouvellement sont absents
- **THEN** le système ne transforme pas implicitement l'abonnement en `ROLLING`

### Requirement: Migration locale des reconductions continues

La migration Dexie SHALL convertir de manière idempotente les abonnements automatiques manifestement continus vers `ROLLING`, sans nouvelle table et sans perte locale.

#### Scenario: Cas legacy déterministe migré

- **WHEN** un abonnement `AUTOMATIC` non annuel a des intervalles de facturation et renouvellement égaux
- **AND** `nextChargeDate` et `nextRenewalDate` sont renseignées et égales
- **THEN** la migration positionne `renewalMode=ROLLING`
- **AND** nettoie les champs de renouvellement contractuel
- **AND** laisse intacts l'abonnement, sa facturation, son engagement et ses paiements

#### Scenario: Cas ambigu conservé

- **WHEN** un abonnement ne satisfait pas tous les critères déterministes
- **THEN** son mode n'est pas modifié automatiquement
- **AND** le diagnostic le signale pour revue lorsque ses données sont incohérentes

#### Scenario: Migration hors connexion et répétée

- **WHEN** la migration s'exécute hors connexion ou sur un enregistrement déjà migré
- **THEN** l'état local final est identique
- **AND** aucune écriture supplémentaire n'est produite pour l'enregistrement déjà conforme
