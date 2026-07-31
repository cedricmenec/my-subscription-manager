## MODIFIED Requirements

### Requirement: Mise en relief des prochaines échéances

La fiche SHALL mettre en évidence le prochain paiement disponible indépendamment du mode de continuation. Elle SHALL mettre en évidence une prochaine date de renouvellement uniquement pour un renouvellement contractuel distinct et SHALL afficher explicitement le libellé « Reconduction continue » pour `ROLLING` sans carte de renouvellement.

#### Scenario: Prochain paiement matérialisé

- **WHEN** l'abonnement possède au moins un paiement `PROJECTED` daté d'aujourd'hui ou d'une date future
- **THEN** le premier paiement chronologique est affiché dans la carte « Prochain paiement »
- **AND** son montant, sa devise, sa date civile et son délai relatif sont visibles

#### Scenario: Repli sur la prochaine date de facturation

- **WHEN** aucun paiement futur matérialisé n'est disponible mais que `nextChargeDate` est renseignée
- **THEN** la carte « Prochain paiement » affiche cette date
- **AND** utilise le prix courant lorsqu'il est disponible

#### Scenario: Renouvellement automatique contractuel

- **WHEN** `renewalMode=AUTOMATIC` et `nextRenewalDate` est renseignée
- **THEN** une carte « Prochain renouvellement » affiche la date et son délai relatif

#### Scenario: Date contractuelle indisponible

- **WHEN** `renewalMode=AUTOMATIC` et `nextRenewalDate` est absente
- **THEN** la carte de renouvellement affiche « Date non calculable »

#### Scenario: Reconduction continue

- **WHEN** `renewalMode=ROLLING`
- **THEN** aucune carte « Prochain renouvellement » n'est affichée
- **AND** « Reconduction continue » reste visible dans les informations détaillées

#### Scenario: Renouvellement sans calcul automatique

- **WHEN** `renewalMode` vaut `MANUAL` ou `UNKNOWN`
- **THEN** aucune carte de prochaine date automatique n'est mise en relief
- **AND** le mode reste visible dans les informations détaillées
