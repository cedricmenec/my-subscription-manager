## MODIFIED Requirements

### Requirement: Dialogue modal de création et d'édition d'abonnement

L'application SHALL fournir un dialogue modal pour la création et l'édition des abonnements, structuré en sections fonctionnelles (Général, Cycle de facturation, Renouvellement, Engagement, Pause, Fin de service, URLs, Notes). Le dialogue est ouvert depuis un bouton "Nouvel abonnement" ou depuis le bouton "Modifier" d'un abonnement existant.

#### Scenario: Validation et soumission

- **WHEN** l'utilisateur clique sur "Sauvegarder et Fermer"
- **THEN** les validations métier sont appliquées
- **AND** si des erreurs existent, elles sont affichées sous les champs concernés
- **AND** si tout est valide, l'abonnement est créé/modifié localement
- **AND** le dialogue se ferme
- **AND** la liste est rafraîchie

## ADDED Requirements

### Requirement: Sauvegarde sans fermeture du dialogue

L'application SHALL fournir un bouton "Sauvegarder" qui persiste la fiche abonnement sans fermer le dialogue, permettant à l'utilisateur de visualiser les résultats des calculs du moteur (prochain renouvellement, échéances) avant de décider de fermer ou de modifier davantage la fiche.

#### Scenario: Sauvegarde sans fermeture en création

- **WHEN** l'utilisateur remplit le formulaire de création
- **AND** clique sur "Sauvegarder"
- **THEN** les validations métier sont appliquées
- **AND** si des erreurs existent, elles sont affichées sous les champs concernés
- **AND** si tout est valide, l'abonnement est créé localement
- **AND** le dialogue reste ouvert
- **AND** le titre du dialogue passe à "Modifier un abonnement"
- **AND** les champs calculés (nextRenewalDate, nextChargeDate) sont mis à jour avec les valeurs persistées
- **AND** un badge "✓ Enregistré à HH:MM" s'affiche temporairement pendant 2 secondes
- **AND** le formulaire est considéré comme "propre" (Annuler ne demande pas de confirmation)

#### Scenario: Sauvegarde sans fermeture en édition

- **WHEN** l'utilisateur modifie des champs en mode édition
- **AND** clique sur "Sauvegarder"
- **THEN** les validations métier sont appliquées
- **AND** si des erreurs existent, elles sont affichées sous les champs concernés
- **AND** si tout est valide, l'abonnement est modifié localement
- **AND** le dialogue reste ouvert
- **AND** les champs calculés sont mis à jour avec les valeurs persistées
- **AND** un badge "✓ Enregistré à HH:MM" s'affiche temporairement pendant 2 secondes
- **AND** le formulaire est considéré comme "propre"

#### Scenario: Badge de confirmation après sauvegarde

- **WHEN** l'utilisateur clique sur "Sauvegarder" (sans fermeture)
- **AND** la sauvegarde réussit
- **THEN** un badge "✓ Enregistré à HH:MM" apparaît dans la zone des boutons d'action
- **AND** le badge disparaît après 2 secondes
- **AND** l'utilisateur peut cliquer sur "Sauvegarder" à nouveau sans attendre la disparition du badge

#### Scenario: Annuler après une sauvegarde sans fermeture

- **WHEN** l'utilisateur a cliqué sur "Sauvegarder" (sans fermeture)
- **AND** aucune modification supplémentaire n'a été apportée
- **AND** l'utilisateur clique sur "Annuler"
- **THEN** la confirmation de modifications en cours n'est PAS demandée
- **AND** le dialogue se ferme
- **AND** les données déjà persistées sont conservées

#### Scenario: Annuler après une sauvegarde puis des modifications

- **WHEN** l'utilisateur a cliqué sur "Sauvegarder" (sans fermeture)
- **AND** modifie à nouveau le formulaire après la sauvegarde
- **AND** clique sur "Annuler"
- **THEN** la confirmation "Voulez-vous vraiment annuler les modifications en cours ?" est affichée
- **AND** si l'utilisateur confirme, le dialogue se ferme sans sauvegarder les modifications non persistées
- **AND** les données déjà persistées (lors de la sauvegarde précédente) sont conservées