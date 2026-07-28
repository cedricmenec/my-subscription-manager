## ADDED Requirements

### Requirement: Page dédiée aux paiements

L'application SHALL fournir une page dédiée aux paiements, accessible depuis un onglet de navigation, reprenant la liste des paiements avec leurs actions (confirmer, ignorer, rembourser).

#### Scenario: Affichage de la page Paiements

- **WHEN** l'utilisateur clique sur l'onglet "Paiements"
- **THEN** la page Paiements est affichée
- **AND** la liste des paiements projetés et enregistrés est affichée
- **AND** chaque paiement affiche son statut, sa date, son montant et l'identifiant de l'abonnement associé

#### Scenario: Actions sur un paiement

- **WHEN** l'utilisateur est sur la page Paiements
- **THEN** les boutons d'action (Confirmer, Ignorer, Rembourser) sont disponibles selon le statut du paiement
- **AND** les actions déclenchent les mêmes comportements que dans la vue actuelle
