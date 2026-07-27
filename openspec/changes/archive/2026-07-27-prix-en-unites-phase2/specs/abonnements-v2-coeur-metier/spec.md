## REMOVED Requirements

### Requirement: Champ currentPriceMinor legacy

**Raison** : Le champ `currentPriceMinor` a été remplacé par `currentPrice` en phase 1. Il n'est plus utilisé par aucun service.

**Migration** : Les données existantes ont déjà `currentPrice` depuis la phase 1. La migration Dexie v5 supprime `currentPriceMinor` des enregistrements.

### Requirement: Écriture duale currentPrice + currentPriceMinor

**Raison** : L'écriture duale était nécessaire pendant la phase 1 pour la rétrocompatibilité. Après suppression de `currentPriceMinor`, l'écriture duale n'a plus de sens.

**Migration** : `createSubscription` et `updateSubscription` n'écrivent plus que `currentPrice`.

## MODIFIED Requirements

### Requirement: Modèle abonnement v2 structuré

L'application SHALL persister un modèle `Subscription` couvrant au minimum `name`, `status`, `renewalMode`, `currentPrice`, `billingInterval`, `nextChargeDate`, `managementUrl`, `cancellationUrl`, `cancellationInstructions`, `notes` et les dates de cycle de vie utiles au lot, conformément à la section 13.2 et RG-DAT-006. Le modèle SHALL également porter des champs structurés séparant `billingInterval`, `commitmentInterval` et `renewalInterval` afin de représenter les cas de facturation et d'engagement distincts conformément à la section 7.2. Le champ `currentPrice` est exprimé en unités de la devise (ex: 15.00 pour 15 €). Le champ `currentPriceMinor` a été supprimé.

#### Scenario: Création avec dates civiles

- **WHEN** l'utilisateur crée un abonnement avec des dates contractuelles
- **THEN** les dates sont persistées au format civil `YYYY-MM-DD`
- **AND** aucune conversion implicite de fuseau n'est appliquée

#### Scenario: Abonnement avec engagement distinct de la facturation

- **WHEN** un abonnement est facturé mensuellement avec un engagement annuel
- **THEN** l'application peut persister séparément la fréquence de facturation et la durée d'engagement
- **AND** les calculs financiers peuvent s'appuyer sur ces champs sans ambiguïté

#### Scenario: Prix en unités de devise (phase 2)

- **WHEN** l'utilisateur enregistre un abonnement avec un prix en unités de devise
- **THEN** `currentPrice` est le seul champ de prix stocké
- **AND** le champ legacy `currentPriceMinor` n'est ni lu ni écrit