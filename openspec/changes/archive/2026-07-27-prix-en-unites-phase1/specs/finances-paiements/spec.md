## ADDED Requirements

### Requirement: Champ amount en unités de devise

Le type `Money` SHALL exposer un champ `amount` (number) représentant le montant en unités de la devise (ex: 15.00 pour 15 €). Le champ `amountMinor` est conservé comme legacy et maintenu en écriture pour rétrocompatibilité.

#### Scenario: Paiement avec montant en unités

- **WHEN** un paiement est créé ou matérialisé
- **THEN** `amount.amount` est stocké en unités de devise (ex: 15.00)
- **AND** `amount.amountMinor` est automatiquement mis à jour à `Math.round(amount * 100)`

#### Scenario: Migration des paiements existants

- **WHEN** la base existante contient des `amountMinor` en centimes
- **THEN** la migration Dexie v4 calcule `amount = amountMinor / 100`
- **AND** le champ `amountMinor` reste inchangé

## MODIFIED Requirements

### Requirement: Paiements synchronisés et statuts financiers

L'application SHALL persister une table synchronisée `payments` avec identifiants globaux, montants en unités de devise, dates civiles et statuts `PROJECTED`, `ASSUMED_PAID`, `CONFIRMED_PAID`, `SKIPPED` et `REFUNDED`, conformément à la section 13.4, RG-FX-001, RG-DAT-006 et AC-016.

#### Scenario: Création d'un paiement projeté

- **WHEN** l'application matérialise un paiement futur pour un abonnement éligible
- **THEN** elle persiste un enregistrement `payments` avec un identifiant global
- **AND** le montant est stocké en unités de devise avec sa devise
- **AND** la date prévue est stockée au format `YYYY-MM-DD`

### Requirement: Calcul des indicateurs financiers du Lot 3

L'application SHALL calculer le coût mensuel équivalent, le coût annuel équivalent, les décaissements prévus à 30 et 90 jours et les dépenses sur période à partir des abonnements et paiements, conformément à la section 9.2, OBJ-MET-001 et AC-010. L'application SHALL également appliquer les taux de conversion configurés pour inclure les abonnements en devise étrangère dans les totaux consolidés, et SHALL exposer la liste des abonnements exclus avec leur motif d'exclusion. Tous les montants financiers sont exprimés en unités de devise (ex: 15.00 pour 15 €).

#### Scenario: Coût équivalent d'un abonnement annuel en unités

- **WHEN** un abonnement est facturé 120.00 en `EUR` avec une périodicité annuelle
- **THEN** le coût mensuel équivalent retourné est 10.00
- **AND** le coût annuel équivalent retourné est 120.00

#### Scenario: Dépenses calculées depuis les statuts de paiement

- **WHEN** des paiements existent sur la période avec des montants en unités
- **THEN** le total des dépenses est calculé en unités de devise
- **AND** les conversions de taux s'appliquent sur les valeurs en unités