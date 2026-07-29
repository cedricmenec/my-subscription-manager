# unsaved-changes-guard Specification

## Purpose
TBD - created by archiving change empecher-fermeture-dialog-sans-sauvegarde. Update Purpose after archive.
## Requirements
### Requirement: Protection contre la fermeture du dialogue avec modifications non sauvegardées

L'application SHALL empêcher la perte involontaire de données lorsque l'utilisateur tente de fermer un dialogue contenant des modifications non sauvegardées.

#### Scenario: Clic sur l'arrière-plan sans modification

- **WHEN** l'utilisateur clique en dehors du dialogue
- **AND** aucune modification n'a été apportée au formulaire
- **THEN** le dialogue se ferme sans sauvegarder
- **AND** le formulaire est réinitialisé

#### Scenario: Clic sur l'arrière-plan avec modifications en cours

- **WHEN** l'utilisateur clique en dehors du dialogue
- **AND** des modifications ont été apportées au formulaire
- **THEN** le dialogue ne se ferme pas
- **AND** les modifications en cours sont conservées

#### Scenario: Touche Échap sans modification

- **WHEN** l'utilisateur appuie sur la touche Échap
- **AND** aucune modification n'a été apportée au formulaire
- **THEN** le dialogue se ferme sans sauvegarder
- **AND** le formulaire est réinitialisé

#### Scenario: Touche Échap avec modifications en cours

- **WHEN** l'utilisateur appuie sur la touche Échap
- **AND** des modifications ont été apportées au formulaire
- **THEN** une confirmation "Voulez-vous vraiment annuler les modifications en cours ?" est affichée
- **AND** si l'utilisateur confirme, le dialogue se ferme sans sauvegarder
- **AND** si l'utilisateur annule, le dialogue reste ouvert avec les modifications conservées

#### Scenario: Bouton Annuler sans modification

- **WHEN** l'utilisateur clique sur le bouton "Annuler"
- **AND** aucune modification n'a été apportée au formulaire
- **THEN** le dialogue se ferme sans sauvegarder
- **AND** le formulaire est réinitialisé

#### Scenario: Bouton Annuler avec modifications en cours

- **WHEN** l'utilisateur clique sur le bouton "Annuler"
- **AND** des modifications ont été apportées au formulaire
- **THEN** une confirmation "Voulez-vous vraiment annuler les modifications en cours ?" est affichée
- **AND** si l'utilisateur confirme, le dialogue se ferme sans sauvegarder
- **AND** si l'utilisateur annule, le dialogue reste ouvert avec les modifications conservées

#### Scenario: Soumission réussie

- **WHEN** l'utilisateur clique sur "Enregistrer"
- **AND** le formulaire est valide
- **THEN** le dialogue se ferme sans confirmation après sauvegarde
- **AND** les modifications sont persistées

### Requirement: Détection de formulaire modifié

Le système SHALL détecter si le formulaire a été modifié par rapport à son état initial.

#### Scenario: Comparaison avec l'état initial

- **WHEN** le dialogue est ouvert
- **THEN** l'état initial du formulaire est enregistré
- **WHEN** l'utilisateur modifie un champ du formulaire
- **THEN** le système détecte que le formulaire est modifié
- **WHEN** l'utilisateur restaure tous les champs à leur valeur initiale
- **THEN** le système détecte que le formulaire n'est plus modifié

