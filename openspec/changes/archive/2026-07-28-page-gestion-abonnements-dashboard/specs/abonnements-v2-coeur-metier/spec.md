## MODIFIED Requirements

### Requirement: Liste d'abonnements filtrable et triable

L'application SHALL fournir une liste supportant au minimum recherche texte, filtre de statut, filtre de catégorie, filtre de mode de renouvellement, recherche avancée multi-critères (nom, date, catégorie, montant) et tri par nom, montant, date de création, prochaine échéance, complétude ou date de mise à jour, conformément à FUN-11.3.

#### Scenario: Tri par nom

- **WHEN** l'utilisateur choisit le tri par nom
- **THEN** la liste est triée par ordre alphabétique

#### Scenario: Tri par montant

- **WHEN** l'utilisateur choisit le tri par montant
- **THEN** la liste est triée par prix courant croissant

#### Scenario: Tri par date de création

- **WHEN** l'utilisateur choisit le tri par date de création
- **THEN** la liste est triée de la plus récente à la plus ancienne

#### Scenario: Filtrage par plage de dates

- **WHEN** l'utilisateur applique un filtre de date min et date max
- **THEN** la liste affiche uniquement les abonnements dont la prochaine échéance est dans l'intervalle

#### Scenario: Filtrage par plage de montant

- **WHEN** l'utilisateur applique un filtre de montant min et montant max
- **THEN** la liste affiche uniquement les abonnements dont le prix est dans l'intervalle