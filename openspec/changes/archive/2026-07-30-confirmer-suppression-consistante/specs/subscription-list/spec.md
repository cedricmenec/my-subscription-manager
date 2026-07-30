## MODIFIED Requirements

### Requirement: Liste d'abonnements avec deux modes d'affichage

L'application SHALL fournir une liste d'abonnements avec deux modes d'affichage : un mode compact (grille type Excel) et un mode cartes (liste aérée), avec un basculement visuel entre les deux modes. Le mode compact est le mode par défaut.

#### Scenario: Archivage d'un abonnement avec confirmation

- **WHEN** l'utilisateur clique sur "Archiver" dans le mode compact ou le mode cartes
- **THEN** un dialogue de confirmation s'affiche avec le titre "Archiver l'abonnement"
- **AND** le message indique le nom de l'abonnement à archiver
- **AND** le bouton "Accepter" est en variante warning (orange)
- **WHEN** l'utilisateur confirme
- **THEN** l'abonnement est archivé (soft delete)
- **AND** un message de confirmation s'affiche : "Abonnement archivé localement. Synchronisation asynchrone en cours."