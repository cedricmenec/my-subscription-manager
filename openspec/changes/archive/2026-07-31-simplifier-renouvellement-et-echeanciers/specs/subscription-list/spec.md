## MODIFIED Requirements

### Requirement: Filtrage par mode de renouvellement

Le système SHALL filtrer la liste selon le mode de continuation sélectionné et SHALL proposer un libellé distinct pour `ROLLING`, `AUTOMATIC`, `MANUAL` et `UNKNOWN` dans les filtres et badges.

#### Scenario: Filtrage par reconduction continue

- **WHEN** l'utilisateur sélectionne « Reconduction continue »
- **THEN** la liste ne montre que les abonnements dont `renewalMode=ROLLING`

#### Scenario: Filtrage par renouvellement automatique

- **WHEN** l'utilisateur sélectionne « Renouvellement automatique »
- **THEN** la liste ne montre que les abonnements dont `renewalMode=AUTOMATIC`

#### Scenario: Filtrage par renouvellement manuel

- **WHEN** l'utilisateur sélectionne « Renouvellement manuel »
- **THEN** la liste ne montre que les abonnements dont `renewalMode=MANUAL`

#### Scenario: Filtrage par mode inconnu

- **WHEN** l'utilisateur sélectionne « Inconnu »
- **THEN** la liste ne montre que les abonnements dont `renewalMode=UNKNOWN`

#### Scenario: Filtrage tous renouvellements

- **WHEN** l'utilisateur sélectionne « Tous »
- **THEN** aucun abonnement n'est exclu par le filtre de continuation
