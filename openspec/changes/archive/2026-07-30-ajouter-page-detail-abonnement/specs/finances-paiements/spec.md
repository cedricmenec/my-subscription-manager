## ADDED Requirements

### Requirement: Conservation des paiements corrigés pendant la rematérialisation

La rematérialisation des échéances SHALL préserver tout paiement généré qui a été corrigé ou dont le statut n’est plus `PROJECTED`, conformément à RG-STA-005, FUN-11.7 et à la règle imposant que toute correction reste conservée dans l’historique.

#### Scenario: Paiement confirmé conservé

- **WHEN** un paiement de source `GENERATED` a le statut `CONFIRMED_PAID`
- **AND** le moteur rematérialise les projections de son abonnement
- **THEN** le paiement confirmé n’est ni supprimé ni remplacé

#### Scenario: Paiement corrigé conservé

- **WHEN** un paiement de source `GENERATED` possède `correctedAt`
- **AND** le moteur rematérialise les projections de son abonnement
- **THEN** le paiement corrigé n’est ni supprimé ni remplacé

#### Scenario: Absence de doublon à une date préservée

- **WHEN** une nouvelle projection calculée possède la même date qu’un paiement préservé
- **THEN** aucun nouveau paiement `PROJECTED` n’est créé pour cette date et cet abonnement

#### Scenario: Projection future obsolète remplacée

- **WHEN** un paiement de source `GENERATED` a le statut `PROJECTED`, ne possède pas `correctedAt` et ne correspond plus aux projections calculées
- **THEN** il peut être supprimé et remplacé par la projection à jour

### Requirement: Consultation locale des paiements par abonnement

L’application SHALL permettre de sélectionner localement les paiements non supprimés d’un abonnement et de les ordonner par date, conformément à FUN-11.7 et TECH-LF-006.

#### Scenario: Filtrage par abonnement hors ligne

- **WHEN** la fiche d’un abonnement est consultée sans réseau
- **THEN** seuls ses paiements non supprimés sont affichés
- **AND** leur consultation ne dépend pas d’une réponse Dexie Cloud
