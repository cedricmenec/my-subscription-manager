## ADDED Requirements

### Requirement: Mise en avant de l'exposition financière sur les prochaines échéances

Le dashboard SHALL afficher, à côté de chaque échéance de renouvellement à venir dans la liste des prochaines échéances, un indicateur du montant total en jeu (« exposition financière ») lorsque l'abonnement correspondant a un engagement (`hasEngagement=true`). Cet indicateur SHALL être calculé par la même fonction pure `computeEngagementExposure` que celle utilisée sur la fiche abonnement, sans persistance ni recalcul redondant.

#### Scenario: Échéance de renouvellement avec exposition affichée

- **WHEN** une des cinq prochaines échéances correspond à la date de renouvellement d'un abonnement avec engagement
- **THEN** le montant total en jeu sur la durée de l'engagement est affiché à côté de cette échéance

#### Scenario: Échéance de facturation simple sans engagement

- **WHEN** une des cinq prochaines échéances correspond à un simple prélèvement d'un abonnement sans engagement (`ROLLING` ou `hasEngagement=false`)
- **THEN** aucun indicateur d'exposition n'est affiché pour cette échéance
