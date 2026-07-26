## MODIFIED Requirements

### Requirement: Calcul des indicateurs financiers du Lot 3

L'application SHALL calculer le coût mensuel équivalent, le coût annuel équivalent, les décaissements prévus à 30 et 90 jours et les dépenses sur période à partir des abonnements et paiements, conformément à la section 9.2, OBJ-MET-001 et AC-010. L'application SHALL également appliquer les taux de conversion configurés pour inclure les abonnements en devise étrangère dans les totaux consolidés, et SHALL exposer la liste des abonnements exclus avec leur motif d'exclusion.

#### Scenario: Coût équivalent d'un abonnement annuel

- **WHEN** un abonnement est facturé 12000 centimes en `EUR` avec une périodicité annuelle
- **THEN** le coût mensuel équivalent retourné est 1000 centimes
- **AND** le coût annuel équivalent retourné est 12000 centimes

#### Scenario: Dépenses calculées depuis les statuts de paiement

- **WHEN** une période contient des paiements `ASSUMED_PAID`, `CONFIRMED_PAID` et `REFUNDED`
- **THEN** les dépenses incluent les montants supposés et confirmés
- **AND** les remboursements diminuent le total
- **AND** les paiements `PROJECTED` ne sont pas comptés comme dépense réalisée

#### Scenario: Abonnement USD inclus avec taux de conversion

- **WHEN** un abonnement est facturé 1000 centimes USD et un taux de conversion USD→EUR de 0.92 est configuré
- **THEN** le coût mensuel équivalent est calculé en convertissant le montant en EUR via le taux
- **AND** l'abonnement est compté dans `includedSubscriptionCount`
- **AND** le montant converti contribue aux totaux `monthlyEquivalentMinor` et `annualEquivalentMinor`

#### Scenario: Abonnement exclu faute de taux de conversion

- **WHEN** un abonnement utilise une devise étrangère sans taux de conversion configuré
- **THEN** l'abonnement est exclu des totaux consolidés
- **AND** il apparaît dans la liste des exclus avec le motif "devise non convertible"
- **AND** le compteur `excludedCurrencySubscriptionCount` est incrémenté

### Requirement: Limites explicites du premier incrément

Le premier incrément de cette capacité MUST limiter ses calculs aux cas déterministes du MVP et SHALL conserver les cas complexes comme amélioration future documentée, notamment les promotions, essais et renouvellements contractuels divergents, conformément au choix de lot incrémental décrit dans la proposition.

#### Scenario: Conversion de devise incluse dans le périmètre MVP

- **WHEN** un abonnement nécessite une conversion de devise avec un taux statique configuré
- **THEN** l'application applique la conversion et inclut le montant dans les totaux
- **AND** le calcul reste déterministe et basé sur les données locales

## REMOVED Requirements

### Requirement: Limites explicites du premier incrément (mention du taux de change)

**Reason**: La mention "taux de change consolidés" comme cas complexe hors périmètre est supprimée car désormais implémentée dans ce changement.

**Migration**: Le scénario "Cas complexe hors périmètre" est mis à jour pour ne plus mentionner les taux de change comme hors périmètre.