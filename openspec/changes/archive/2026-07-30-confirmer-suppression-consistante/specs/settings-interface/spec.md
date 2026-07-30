## MODIFIED Requirements

### Requirement: Gestion des catégories dans la page Configuration

La page Configuration SHALL permettre de lister, créer et supprimer des catégories d'abonnement.

#### Scenario: Suppression d'une catégorie avec confirmation

- **WHEN** l'utilisateur clique "Supprimer" sur une catégorie
- **THEN** un dialogue de confirmation s'affiche avec le message "Supprimer la catégorie {nom} ?"
- **AND** le bouton "Accepter" est en variante danger (rouge)
- **WHEN** l'utilisateur confirme
- **THEN** la catégorie est supprimée
- **AND** les abonnements liés à cette catégorie ne sont pas supprimés (leur catégorie devient vide)

### Requirement: Gestion des taux de conversion dans la page Configuration

La page Configuration SHALL permettre de lister, ajouter et supprimer des taux de conversion entre devises étrangères et EUR.

#### Scenario: Suppression d'un taux de conversion avec confirmation

- **WHEN** l'utilisateur clique "Supprimer" sur un taux
- **THEN** un dialogue de confirmation s'affiche avec le message "Supprimer le taux de conversion {currency} → EUR ?"
- **AND** le bouton "Accepter" est en variante danger (rouge)
- **WHEN** l'utilisateur confirme
- **THEN** le taux est supprimé
- **AND** les abonnements dans cette devise sont exclus des totaux consolidés