# subscription-dialog Specification (Delta)

## Purpose
Modifications du dialogue de création/édition d'abonnement pour intégrer les nouveaux champs `subscriptionDate` et `renewalPeriodStartDate`, passer `nextRenewalDate` en lecture seule (calculé automatiquement par le moteur), et pré-remplir les intervalles par défaut lors de l'activation du renouvellement automatique.

## MODIFIED Requirements

### Requirement: Dialogue modal de création et d'édition d'abonnement

L'application SHALL fournir un dialogue modal pour la création et l'édition des abonnements, structuré en sections fonctionnelles (Général, Cycle de facturation, Renouvellement, Engagement, Pause, Fin de service, URLs, Notes). Le dialogue est ouvert depuis un bouton "Nouvel abonnement" ou depuis le bouton "Modifier" d'un abonnement existant.

#### Scenario: Structure en sections du formulaire (modifié)

- **WHEN** le dialogue est ouvert
- **THEN** le formulaire est organisé en sections visuellement distinctes :
  - **Général** : Nom, Fournisseur, Plan, Catégorie, Statut, Mode de renouvellement
  - **Cycle de facturation** : Prix, Devise, Cycle (presets Hebdo/Mensuel/Annuel/Personnalisé), Prochaine échéance, Début de service
  - **Renouvellement** : visible seulement si renouvellement automatique ; Cycle de renouvellement, Date de souscription (lecture seule après création), Début de la période en cours (ajustable), Prochain renouvellement (calculé automatiquement, lecture seule)
  - **Engagement** : visible seulement si "Avec engagement" ; Durée d'engagement, Début d'engagement, Fin d'engagement (calculée, informative)
  - **Pause** : visible seulement si statut "En pause" ; Début de pause, Fin de pause
  - **Fin de service** : affichée si renseignée, sinon "Pas de fin de service programmée"
  - **URLs** : URL de gestion, URL de résiliation
  - **Notes** : Instructions de résiliation, Notes

#### Scenario: Renouvellement conditionnel (modifié)

- **WHEN** l'utilisateur sélectionne "Automatique" comme mode de renouvellement
- **THEN** la section Renouvellement apparaît
- **AND** les champs quantité/unité sont initialisés avec les valeurs du cycle de facturation
- **AND** `renewalPeriodStartDate` est initialisé avec la valeur de `startDate` (ou de `subscriptionDate` si absent)
- **WHEN** l'utilisateur modifie les champs de la section renouvellement
- **THEN** les valeurs surchargent l'initialisation par défaut

#### Scenario: Calcul du prochain renouvellement (modifié)

- **WHEN** le formulaire est ouvert en création et que `renewalMode=AUTOMATIC`
- **THEN** `nextRenewalDate` est affiché comme "Calculé automatiquement par le moteur" (texte informatif)
- **AND** le champ `nextRenewalDate` n'est pas modifiable
- **AND** la valeur persistée sera déterminée par le calculateur `next-renewal-date` après la soumission
- **WHEN** le formulaire est ouvert en édition d'un abonnement existant avec `nextRenewalDate` renseignée
- **THEN** la date est affichée en lecture seule
- **AND** un label "Mise à jour automatique" est affiché à côté

### Requirement: Contrainte de cohérence nextChargeDate (Option C)

L'application SHALL empêcher la soumission du formulaire si `nextChargeDate` > `nextRenewalDate` pour un abonnement en statut ACTIVE avec `renewalMode=AUTOMATIC` et `renewalInterval` identique à `billingInterval`.

#### Scenario: Validation de cohérence des dates

- **WHEN** l'utilisateur tente d'enregistrer un abonnement ACTIVE avec `renewalMode=AUTOMATIC`
- **AND** `renewalIntervalUnit=billingIntervalUnit` et `renewalIntervalCount=billingIntervalCount`
- **AND** `nextChargeDate` > `nextRenewalDate`
- **THEN** la validation échoue
- **AND** un message d'erreur "La prochaine échéance ne peut pas être après la date de renouvellement" est affiché

#### Scenario: Validation non bloquante si intervalles différents

- **WHEN** `renewalInterval` ≠ `billingInterval` (ex: renouvellement annuel, facturation mensuelle)
- **AND** `nextChargeDate` > `nextRenewalDate`
- **THEN** la validation n'est pas déclenchée
- **AND** le formulaire peut être soumis normalement