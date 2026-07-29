# abonnements-v2-coeur-metier Specification (Delta)

## Purpose
Modifications du modèle `Subscription` et des comportements associés : renommage de `renewalStartDate` → `subscriptionDate`, ajout de `renewalPeriodStartDate`, `notifyBeforeRenewal`, `notifyBeforeRenewalDays`, et règles de cohérence temporelle, conformément aux besoins du calcul automatique de la date de prochain renouvellement.

## RENAMED Requirements

### Requirement: Modèle abonnement v2 structuré (champ renewalStartDate → subscriptionDate)
**Reason**: Le nom `renewalStartDate` prête à confusion : il ne s'agit pas du début d'une période de renouvellement courante mais de la date de souscription initiale. Le nouveau nom `subscriptionDate` lève cette ambiguïté et permet d'introduire un champ `renewalPeriodStartDate` distinct pour la période en cours.
**FROM**: `renewalStartDate`
**TO**: `subscriptionDate`

## ADDED Requirements

### Requirement: Champ subscriptionDate immuable

L'application SHALL persister un champ `subscriptionDate` (date civile, `YYYY-MM-DD`) représentant la date de souscription initiale au service. Ce champ est renseigné à la création de l'abonnement et n'est jamais modifié par la suite. Il sert d'ancre de secours pour le calcul de `nextRenewalDate`.

#### Scenario: Création avec subscriptionDate

- **WHEN** l'utilisateur crée un abonnement et renseigne la date de souscription
- **THEN** `subscriptionDate` est persisté au format civil `YYYY-MM-DD`
- **AND** une fois créé, le champ n'est pas modifiable via l'UI d'édition

#### Scenario: subscriptionDate absent à la création

- **WHEN** l'utilisateur crée un abonnement sans renseigner `subscriptionDate`
- **THEN** le champ reste `undefined` en base
- **AND** le calcul de `nextRenewalDate` utilisera `renewalPeriodStartDate` comme ancre, ou échouera si les deux sont absents

### Requirement: Champ renewalPeriodStartDate ajustable

L'application SHALL persister un champ `renewalPeriodStartDate` (date civile, `YYYY-MM-DD`) représentant le début de la période de renouvellement en cours. Ce champ est initialisé à la valeur de `subscriptionDate` (ou à la date de création si absent), et peut être ajusté manuellement par l'utilisateur (ex. mois offert par le fournisseur).

#### Scenario: Initialisation automatique du champ

- **WHEN** un abonnement est créé en renouvellement automatique avec `subscriptionDate=2026-01-15`
- **THEN** `renewalPeriodStartDate` est initialisé à `2026-01-15`

#### Scenario: Ajustement manuel

- **WHEN** l'utilisateur modifie `renewalPeriodStartDate` pour le passer de `2026-01-15` à `2026-02-15` (mois offert)
- **THEN** la valeur est persistée
- **AND** le prochain calcul de `nextRenewalDate` utilisera `2026-02-15` comme ancre

### Requirement: Champs d'alerte notifyBeforeRenewal

L'application SHALL persister deux champs d'alerte sur le modèle `Subscription` :
- `notifyBeforeRenewal` (boolean) : indique si une alerte doit être envoyée avant le prochain renouvellement
- `notifyBeforeRenewalDays` (number) : nombre de jours avant le renouvellement pour déclencher l'alerte

Ces champs sont renseignés par le calculateur `next-renewal-date` avec des valeurs par défaut, et peuvent être modifiés par l'utilisateur via l'UI (ultérieurement, hors scope de ce lot).

#### Scenario: Persistance des champs d'alerte

- **WHEN** le calculateur `next-renewal-date` s'exécute et détermine `notifyBeforeRenewal=true` et `notifyBeforeRenewalDays=30`
- **THEN** ces valeurs sont persistées sur l'abonnement
- **AND** les champs sont synchronisés via Dexie Cloud

### Requirement: Migration Dexie des champs de renouvellement

La migration Dexie SHALL copier `renewalStartDate` → `subscriptionDate`, ajouter `renewalPeriodStartDate` (initialisé avec la valeur de `subscriptionDate`), ajouter `notifyBeforeRenewal` et `notifyBeforeRenewalDays` (undefined en attendant le premier run du calculateur), et supprimer le champ `renewalStartDate`.

#### Scenario: Migration des abonnements existants

- **WHEN** la base existante contient des abonnements avec `renewalStartDate` renseigné
- **THEN** la migration copie la valeur dans `subscriptionDate`
- **AND** `renewalPeriodStartDate` est initialisé avec la même valeur
- **AND** `renewalStartDate` est supprimé du schéma
- **AND** `notifyBeforeRenewal` et `notifyBeforeRenewalDays` sont ajoutés avec valeur `undefined`

#### Scenario: Abonnement sans renewalStartDate legacy

- **WHEN** la base existante contient des abonnements sans `renewalStartDate`
- **THEN** `subscriptionDate` reste `undefined`
- **AND** `renewalPeriodStartDate` reste `undefined`
- **AND** ces abonnements seront traités par le calculateur sans ancre (pas de calcul possible)

## MODIFIED Requirements

### Requirement: Indicateur de complétude et vue à compléter

L'application SHALL calculer un indicateur de complétude basé sur les champs critiques (`name`, `status`, `price`, `currency`, `billingInterval`, `nextChargeDate`, `renewalMode`) et SHALL exposer une vue « À compléter », conformément à FUN-11.8. Le champ `subscriptionDate` remplace `renewalStartDate` dans la liste des champs optionnels de la fiche mais n'entre pas dans le score de complétude.

#### Scenario: Abonnement incomplet (inchangé)

- **WHEN** un abonnement est enregistré sans prochaine échéance
- **THEN** il est marqué comme incomplet
- **AND** il apparaît dans la vue « À compléter »