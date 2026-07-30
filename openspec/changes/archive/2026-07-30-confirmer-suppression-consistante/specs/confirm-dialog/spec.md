## ADDED Requirements

### Requirement: Dialogue de confirmation de suppression

Le système SHALL fournir un composant React réutilisable `ConfirmDialog` qui affiche une boîte de dialogue de confirmation avant toute action destructrice (suppression ou archivage). Le dialogue utilise l'élément natif `<dialog>` avec `showModal()`.

#### Scenario: Ouverture du dialogue de confirmation

- **WHEN** l'utilisateur déclenche une action destructrice (clique sur "Supprimer" ou "Archiver")
- **THEN** un dialogue de confirmation s'affiche avec un titre, un message explicatif, et deux boutons "Accepter" et "Refuser"
- **AND** le focus est piégé à l'intérieur du dialogue

#### Scenario: Confirmation de l'action

- **WHEN** l'utilisateur clique sur le bouton "Accepter" dans le dialogue de confirmation
- **THEN** l'action destructrice est exécutée
- **AND** le dialogue se ferme

#### Scenario: Annulation de l'action

- **WHEN** l'utilisateur clique sur le bouton "Refuser" dans le dialogue de confirmation
- **THEN** l'action destructrice n'est pas exécutée
- **AND** le dialogue se ferme

#### Scenario: Fermeture par la touche Échap

- **WHEN** l'utilisateur appuie sur la touche Échap pendant que le dialogue est ouvert
- **THEN** l'action destructrice n'est pas exécutée
- **AND** le dialogue se ferme

#### Scenario: Fermeture par clic en dehors du dialogue

- **WHEN** l'utilisateur clique en dehors de la boîte de dialogue (sur le voile semi-transparent)
- **THEN** l'action destructrice n'est pas exécutée
- **AND** le dialogue se ferme

### Requirement: Adaptation du libellé selon le contexte

Le composant SHALL permettre de personnaliser le titre, le message, et le libellé des boutons pour s'adapter au contexte (archivage vs suppression).

#### Scenario: Libellé pour archivage (soft delete)

- **WHEN** l'action est un archivage d'abonnement
- **THEN** le titre affiche "Archiver l'abonnement"
- **AND** le message précise que l'abonnement sera archivé mais pas définitivement supprimé

#### Scenario: Libellé pour suppression (hard delete)

- **WHEN** l'action est une suppression de catégorie ou de taux de change
- **THEN** le titre affiche "Supprimer"
- **AND** le message précise que la suppression est définitive

### Requirement: Variante visuelle danger/warning

Le composant SHALL supporter une variante visuelle `danger` (rouge) pour les suppressions définitives et `warning` (orange) pour les archivages, appliquée au bouton de confirmation.

#### Scenario: Variante danger pour suppression

- **WHEN** le dialogue est configuré en mode `danger`
- **THEN** le bouton "Accepter" utilise la classe CSS `danger-button`

#### Scenario: Variante warning pour archivage

- **WHEN** le dialogue est configuré en mode `warning`
- **THEN** le bouton "Accepter" utilise la classe CSS `warning-button`

### Requirement: Indicateur de chargement pendant l'exécution

Le composant SHALL gérer l'état de chargement lorsque l'action de confirmation est asynchrone.

#### Scenario: Confirmation avec chargement

- **WHEN** l'utilisateur clique sur "Accepter" et que l'action est asynchrone
- **THEN** le bouton "Accepter" est désactivé
- **AND** un indicateur de chargement est affiché
- **AND** le bouton "Refuser" est également désactivé pendant l'exécution