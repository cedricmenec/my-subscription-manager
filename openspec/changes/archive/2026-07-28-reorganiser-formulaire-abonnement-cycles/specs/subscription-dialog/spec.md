## MODIFIED Requirements

### Requirement: Dialogue modal de création et d'édition d'abonnement

L'application SHALL fournir un dialogue modal pour la création et l'édition des abonnements, structuré en sections fonctionnelles (Général, Cycle de facturation, Renouvellement, Engagement, Pause, Fin de service, URLs, Notes). Le dialogue est ouvert depuis un bouton "Nouvel abonnement" ou depuis le bouton "Modifier" d'un abonnement existant.

#### Scenario: Structure en sections du formulaire (modifié)

- **WHEN** le dialogue est ouvert
- **THEN** le formulaire est organisé en sections visuellement distinctes :
  - **Général** : Nom, Fournisseur, Plan, Catégorie, Statut, Mode de renouvellement
  - **Cycle de facturation** : Prix, Devise, Cycle (presets Hebdo/Mensuel/Annuel/Personnalisé), Prochaine échéance, Début de service
  - **Renouvellement** : visible seulement si renouvellement automatique ; Cycle de renouvellement, Début période de renouvellement, Prochain renouvellement (calculé)
  - **Engagement** : visible seulement si "Avec engagement" ; Durée d'engagement, Début d'engagement, Fin d'engagement (calculée, informative)
  - **Pause** : visible seulement si statut "En pause" ; Début de pause, Fin de pause
  - **Fin de service** : affichée si renseignée, sinon "Pas de fin de service programmée"
  - **URLs** : URL de gestion, URL de résiliation
  - **Notes** : Instructions de résiliation, Notes

#### Scenario: Cycle de facturation avec presets

- **WHEN** l'utilisateur ouvre le formulaire avec un abonnement dont `billingIntervalCount=1` et `billingIntervalUnit=MONTH`
- **THEN** le sélecteur de cycle affiche "Mensuel"
- **WHEN** l'utilisateur sélectionne "Personnalisé"
- **THEN** les champs Quantité et Unité deviennent visibles et modifiables
- **AND** un texte récapitulatif s'affiche en permanence (ex: "Toutes les 2 semaines")

#### Scenario: Renouvellement conditionnel

- **WHEN** l'utilisateur sélectionne "Automatique" comme mode de renouvellement
- **THEN** la section Renouvellement apparaît
- **AND** les champs quantité/unité sont initialisés avec les valeurs du cycle de facturation
- **WHEN** l'utilisateur modifie les champs de la section renouvellement
- **THEN** les valeurs surchargent l'initialisation par défaut

#### Scenario: Calcul du prochain renouvellement

- **WHEN** l'utilisateur renseigne une date de début de période de renouvellement
- **THEN** la date de prochain renouvellement est calculée par ajout du cycle de renouvellement
- **AND** la date est affichée de manière informative dans le formulaire
- **AND** la valeur est persistée dans `nextRenewalDate` à la soumission

#### Scenario: Engagement conditionnel

- **WHEN** l'utilisateur sélectionne "Avec engagement"
- **THEN** la section Engagement apparaît avec les champs de durée et date de début
- **AND** la date de fin d'engagement est calculée et affichée de manière informative
- **WHEN** l'utilisateur sélectionne "Sans engagement"
- **THEN** la section Engagement est masquée
- **AND** les champs d'engagement sont réinitialisés

#### Scenario: Pause avec bouton dédié

- **WHEN** l'utilisateur clique sur "Mettre en pause"
- **THEN** la section Pause apparaît avec le début de pause (par défaut aujourd'hui) et la fin de pause
- **AND** le statut de l'abonnement passe à `PAUSED` à la soumission
- **WHEN** le statut de l'abonnement n'est pas `PAUSED` et que l'utilisateur n'a pas cliqué sur "Mettre en pause"
- **THEN** la section Pause est masquée

#### Scenario: Fin de service

- **WHEN** l'abonnement a une date de fin de service renseignée
- **THEN** la date est affichée dans une section dédiée
- **WHEN** l'abonnement n'a pas de date de fin de service
- **THEN** le message "Pas de fin de service programmée" est affiché

### Requirement: Accessibilité du dialogue modal

Le dialogue modal SHALL respecter les critères d'accessibilité : piège de focus, rôle `dialog`, `aria-modal="true"`, `aria-labelledby` sur le titre. Les sections conditionnelles (Renouvellement, Engagement, Pause) SHALL être accessibles au clavier lors de leur apparition.

#### Scenario: Accès clavier aux sections conditionnelles

- **WHEN** une section conditionnelle (Renouvellement, Engagement, Pause) apparaît
- **THEN** les champs de la section sont accessibles au clavier
- **AND** le focus est correctement géré lors de l'apparition/disparition des sections

## REMOVED Requirements

### Requirement: (contenu de la section Facturation et Dates remplacé)
**Reason**: Les sections "Facturation" et "Dates" sont remplacées par les sections fonctionnelles "Cycle de facturation", "Renouvellement", "Engagement", "Pause" et "Fin de service".
**Migration**: Les données existantes sont conservées et réaffectées dans les nouvelles sections.