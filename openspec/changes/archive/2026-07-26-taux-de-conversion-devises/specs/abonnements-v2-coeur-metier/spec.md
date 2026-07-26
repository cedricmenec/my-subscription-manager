## ADDED Requirements

### Requirement: Indicateur d'exclusion sur les fiches abonnement

L'application SHALL afficher un indicateur visuel individuel sur chaque abonnement exclu du calcul des coûts consolidés, avec un tooltip expliquant le motif d'exclusion, conformément à l'objectif de transparence des calculs financiers.

#### Scenario: Badge d'exclusion sur la fiche

- **WHEN** un abonnement est affiché dans la liste et qu'il est exclu du calcul des coûts consolidés
- **THEN** un badge ou icône "Exclu" apparaît à côté du nom de l'abonnement
- **AND** un tooltip au survol du badge affiche le motif d'exclusion
- **AND** le motif d'exclusion est lisible (ex: "Devise USD non convertible", "Aucun prix défini")

#### Scenario: Indicateur de conversion active

- **WHEN** un abonnement en devise étrangère est inclus dans le calcul via un taux de conversion configuré
- **THEN** un indicateur visuel montre que la conversion est active
- **AND** le tooltip affiche le taux appliqué (ex: "Taux USD→EUR: 0.92")