## ADDED Requirements

### Requirement: Accès à la fiche détaillée depuis les listes

L’application SHALL proposer une action de consultation distincte de l’édition dans les modes compact et cartes de la liste des abonnements, conformément aux sections 11.3 et 11.4.

#### Scenario: Consultation depuis le mode compact

- **WHEN** l’utilisateur active le nom ou l’action « Voir » d’une ligne du mode compact
- **THEN** la fiche détaillée de cet abonnement est ouverte
- **AND** l’action ne déclenche pas le dialogue d’édition

#### Scenario: Consultation depuis le mode cartes

- **WHEN** l’utilisateur active le nom ou l’action « Voir » d’une carte
- **THEN** la fiche détaillée de cet abonnement est ouverte
- **AND** les actions « Modifier » et « Archiver » restent disponibles séparément
