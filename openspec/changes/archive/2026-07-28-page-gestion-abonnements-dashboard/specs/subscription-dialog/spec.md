## ADDED Requirements

### Requirement: Dialogue modal de création et d'édition d'abonnement

L'application SHALL fournir un dialogue modal pour la création et l'édition des abonnements, structuré en sections (Général, Facturation, Dates, URLs, Notes). Le dialogue est ouvert depuis un bouton "Nouvel abonnement" ou depuis le bouton "Modifier" d'un abonnement existant.

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
  - **Facturation** : Prix, Devise, Cycle (quantité + unité), Engagement (quantité + unité), Renouvellement (quantité + unité)
  - **Dates** : Prochaine échéance, Début de service, Fin de pause, Fin de service
  - **URLs** : URL de gestion, URL de résiliation
  - **Notes** : Instructions de résiliation, Notes

#### Scenario: Validation et soumission

- **WHEN** l'utilisateur clique sur "Enregistrer"
- **THEN** les validations métier sont appliquées
- **AND** si des erreurs existent, elles sont affichées sous les champs concernés
- **AND** si tout est valide, l'abonnement est créé/modifié localement
- **AND** le dialogue se ferme
- **AND** la liste est rafraîchie

#### Scenario: Fermeture du dialogue

- **WHEN** l'utilisateur clique sur "Annuler" ou appuie sur Échap
- **THEN** le dialogue se ferme sans sauvegarder
- **AND** le formulaire est réinitialisé

#### Scenario: Fermeture par clic sur l'arrière-plan

- **WHEN** l'utilisateur clique en dehors du dialogue
- **THEN** le dialogue se ferme sans sauvegarder

### Requirement: Accessibilité du dialogue modal

Le dialogue modal SHALL respecter les critères d'accessibilité : piège de focus, rôle `dialog`, `aria-modal="true"`, `aria-labelledby` sur le titre.

#### Scenario: Piège de focus

- **WHEN** le dialogue est ouvert
- **THEN** le focus est piégé à l'intérieur du dialogue
- **AND** la tabulation cyclique entre les éléments du dialogue
- **AND** l'arrière-plan n'est pas focalisable
