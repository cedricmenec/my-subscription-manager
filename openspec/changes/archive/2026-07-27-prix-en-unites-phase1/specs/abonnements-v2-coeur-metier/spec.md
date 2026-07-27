## ADDED Requirements

### Requirement: Champ currentPrice en unités de devise

Le modèle `Subscription` SHALL exposer un champ `currentPrice` (number) représentant le montant en unités de la devise (ex: 15.00 pour 15 €). Le champ `currentPriceMinor` est conservé comme legacy et maintenu en écriture pour rétrocompatibilité.

#### Scenario: Création avec prix en unités

- **WHEN** l'utilisateur saisit un prix de "15" dans le champ "Prix"
- **THEN** `currentPrice` est persisté à 15.00
- **AND** `currentPriceMinor` est persisté à 1500 (Math.round(15.00 * 100))

#### Scenario: Migration des données existantes

- **WHEN** la base existante contient des `currentPriceMinor` en centimes
- **THEN** la migration Dexie v4 calcule `currentPrice = currentPriceMinor / 100`
- **AND** le champ `currentPriceMinor` reste inchangé

## MODIFIED Requirements

### Requirement: Modèle abonnement v2 structuré

L'application SHALL persister un modèle `Subscription` couvrant au minimum `name`, `status`, `renewalMode`, `currentPrice`, `billingInterval`, `nextChargeDate`, `managementUrl`, `cancellationUrl`, `cancellationInstructions`, `notes` et les dates de cycle de vie utiles au lot, conformément à la section 13.2 et RG-DAT-006. Le modèle SHALL également porter des champs structurés séparant `billingInterval`, `commitmentInterval` et `renewalInterval` afin de représenter les cas de facturation et d'engagement distincts conformément à la section 7.2. Le champ `currentPrice` SHALL être exprimé en unités de la devise (ex: 15.00 pour 15 €). Le champ `currentPriceMinor` est conservé en lecture et écriture pour rétrocompatibilité.

#### Scenario: Création avec dates civiles

- **WHEN** l'utilisateur crée un abonnement avec des dates contractuelles
- **THEN** les dates sont persistées au format civil `YYYY-MM-DD`
- **AND** aucune conversion implicite de fuseau n'est appliquée

#### Scenario: Abonnement avec engagement distinct de la facturation

- **WHEN** un abonnement est facturé mensuellement avec un engagement annuel
- **THEN** l'application peut persister séparément la fréquence de facturation et la durée d'engagement
- **AND** les calculs financiers peuvent s'appuyer sur ces champs sans ambiguïté

#### Scenario: Prix en unités de devise

- **WHEN** l'utilisateur enregistre un abonnement avec un prix en unités de devise
- **THEN** `currentPrice` est stocké en unités (ex: 15.00)
- **AND** `currentPriceMinor` est automatiquement mis à jour pour la rétrocompatibilité
- **AND** la valeur legacy reste cohérente avec la nouvelle valeur