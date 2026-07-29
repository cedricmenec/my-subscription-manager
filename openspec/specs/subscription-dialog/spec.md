## Purpose

Définir les exigences pour le dialogue modal de création et d'édition des abonnements, structuré en sections, réutilisable depuis la liste et le dashboard.
## Requirements
### Requirement: Dialogue modal de création et d'édition d'abonnement

L'application SHALL fournir un dialogue modal pour la création et l'édition des abonnements, structuré en sections fonctionnelles (Général, Cycle de facturation, Renouvellement, Engagement, Pause, Fin de service, URLs, Notes). Le dialogue est ouvert depuis un bouton "Nouvel abonnement" ou depuis le bouton "Modifier" d'un abonnement existant.

#### Scenario: Ouverture du dialogue pour création

- **WHEN** l'utilisateur clique sur le bouton "Nouvel abonnement"
- **THEN** un dialogue modal s'ouvre avec le formulaire vide
- **AND** le titre du dialogue est "Créer un abonnement"
- **AND** le focus est placé sur le premier champ du formulaire

#### Scenario: Ouverture du dialogue pour édition

- **WHEN** l'utilisateur clique sur "Modifier" sur un abonnement existant
- **THEN** un dialogue modal s'ouvre avec le formulaire pré-rempli
- **AND** le titre du dialogue est "Modifier un abonnement"

#### Scenario: Structure en sections du formulaire

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
- **AND** `renewalPeriodStartDate` est initialisé avec la valeur de `startDate` (ou de `subscriptionDate` si absent)
- **WHEN** l'utilisateur modifie les champs de la section renouvellement
- **THEN** les valeurs surchargent l'initialisation par défaut

#### Scenario: Calcul du prochain renouvellement

- **WHEN** le formulaire est ouvert en création et que `renewalMode=AUTOMATIC`
- **THEN** `nextRenewalDate` est affiché comme "Calculé automatiquement par le moteur" (texte informatif)
- **AND** le champ `nextRenewalDate` n'est pas modifiable
- **AND** la valeur persistée sera déterminée par le calculateur `next-renewal-date` après la soumission
- **WHEN** le formulaire est ouvert en édition d'un abonnement existant avec `nextRenewalDate` renseignée
- **THEN** la date est affichée en lecture seule
- **AND** un label "Mise à jour automatique" est affiché à côté

#### Scenario: Engagement conditionnel

- **WHEN** l'utilisateur sélectionne "Avec engagement"
- **THEN** la section Engagement apparaît avec les champs de durée et date de début
- **AND** la date de fin d'engagement est calculée et affichée de manière informative
- **WHEN** l'utilisateur sélectionne "Sans engagement"
- **THEN** la section Engagement est masquée
- **AND** les champs d'engagement sont réinitialisés

#### Scenario: Validation et soumission

- **WHEN** l'utilisateur clique sur "Enregistrer"
- **THEN** les validations métier sont appliquées
- **AND** si des erreurs existent, elles sont affichées sous les champs concernés
- **AND** si tout est valide, l'abonnement est créé/modifié localement
- **AND** le dialogue se ferme
- **AND** la liste est rafraîchie

#### Scenario: Fermeture du dialogue sans modification

- **WHEN** l'utilisateur clique sur "Annuler" ou appuie sur Échap
- **AND** aucune modification n'a été apportée au formulaire
- **THEN** le dialogue se ferme sans sauvegarder
- **AND** le formulaire est réinitialisé

#### Scenario: Fermeture du dialogue avec modifications en cours

- **WHEN** l'utilisateur clique sur "Annuler" ou appuie sur Échap
- **AND** des modifications ont été apportées au formulaire
- **THEN** une confirmation "Voulez-vous vraiment annuler les modifications en cours ?" est affichée
- **AND** si l'utilisateur confirme, le dialogue se ferme sans sauvegarder
- **AND** si l'utilisateur annule, le dialogue reste ouvert avec les modifications conservées

#### Scenario: Fermeture par clic sur l'arrière-plan

- **WHEN** l'utilisateur clique en dehors du dialogue
- **AND** aucune modification n'a été apportée au formulaire
- **THEN** le dialogue se ferme sans sauvegarder

#### Scenario: Clic sur l'arrière-plan avec modifications en cours

- **WHEN** l'utilisateur clique en dehors du dialogue
- **AND** des modifications ont été apportées au formulaire
- **THEN** le dialogue ne se ferme pas
- **AND** les modifications en cours sont conservées

### Requirement: Accessibilité du dialogue modal

L'application SHALL respecter les critères d'accessibilité pour le dialogue modal.

#### Scenario: Navigation au clavier
- **WHEN** le dialogue est ouvert
- **THEN** le focus est piégé à l'intérieur du dialogue
- **AND** la touche Tab circule entre les éléments interactifs du dialogue

### Requirement: Contrainte de cohérence nextChargeDate

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

