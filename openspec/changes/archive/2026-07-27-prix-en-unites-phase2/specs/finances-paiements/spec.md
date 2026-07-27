## REMOVED Requirements

### Requirement: Champ amountMinor legacy

**Raison** : Le champ `amountMinor` a été remplacé par `amount` en phase 1. Il n'est plus utilisé par aucun service.

**Migration** : Les données existantes ont déjà `amount` depuis la phase 1. La migration Dexie v5 supprime `amountMinor` des enregistrements.

### Requirement: Propriétés *Minor de FinancialSummary

**Raison** : Les propriétés en centimes (`monthlyEquivalentMinor`, `annualEquivalentMinor`, etc.) sont remplacées par leurs équivalents en unités depuis la phase 1.

**Migration** : Utiliser les propriétés en unités (`monthlyEquivalent`, `annualEquivalent`, etc.).

## MODIFIED Requirements

### Requirement: Paiements synchronisés et statuts financiers

L'application SHALL persister une table synchronisée `payments` avec identifiants globaux, montants en unités de devise, dates civiles et statuts `PROJECTED`, `ASSUMED_PAID`, `CONFIRMED_PAID`, `SKIPPED` et `REFUNDED`, conformément à la section 13.4, RG-FX-001, RG-DAT-006 et AC-016. Le champ `amountMinor` du type `Money` a été supprimé.

#### Scenario: Création d'un paiement projeté

- **WHEN** l'application matérialise un paiement futur pour un abonnement éligible
- **THEN** elle persiste un enregistrement `payments` avec un identifiant global
- **AND** le montant est stocké en unités de devise avec sa devise via le seul champ `amount`
- **AND** la date prévue est stockée au format `YYYY-MM-DD`

### Requirement: Calcul des indicateurs financiers du Lot 3

L'application SHALL calculer le coût mensuel équivalent, le coût annuel équivalent, les décaissements prévus à 30 et 90 jours et les dépenses sur période à partir des abonnements et paiements, conformément à la section 9.2, OBJ-MET-001 et AC-010. L'application SHALL également appliquer les taux de conversion configurés pour inclure les abonnements en devise étrangère dans les totaux consolidés, et SHALL exposer la liste des abonnements exclus avec leur motif d'exclusion. Tous les montants financiers sont exprimés en unités de devise. Les propriétés `*Minor` de `FinancialSummary` sont supprimées.

#### Scenario: Coût équivalent d'un abonnement annuel en unités

- **WHEN** un abonnement est facturé 120.00 en `EUR` avec une périodicité annuelle
- **THEN** le coût mensuel équivalent retourné est 10.00
- **AND** le coût annuel équivalent retourné est 120.00

#### Scenario: Dépenses calculées depuis les statuts de paiement

- **WHEN** des paiements existent sur la période avec des montants en unités
- **THEN** le total des dépenses est calculé en unités de devise
- **AND** les conversions de taux s'appliquent sur les valeurs en unités