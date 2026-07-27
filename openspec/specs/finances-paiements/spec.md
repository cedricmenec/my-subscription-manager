## Purpose

Définir les garanties métier et techniques du Lot 3 pour Abos: persistance local-first des paiements, projection des échéances financières, calcul des indicateurs financiers essentiels et correction manuelle de l'historique sans backend applicatif personnalisé.

## Requirements

### Requirement: Paiements synchronisés et statuts financiers

L'application SHALL persister une table synchronisée `payments` avec identifiants globaux, montants en unités de devise, dates civiles et statuts `PROJECTED`, `ASSUMED_PAID`, `CONFIRMED_PAID`, `SKIPPED` et `REFUNDED`, conformément à la section 13.4, RG-FX-001, RG-DAT-006 et AC-016. Le champ `amountMinor` du type `Money` a été supprimé.

#### Scenario: Création d'un paiement projeté

- **WHEN** l'application matérialise un paiement futur pour un abonnement éligible
- **THEN** elle persiste un enregistrement `payments` avec un identifiant global
- **AND** le montant est stocké en unités de devise avec sa devise
- **AND** la date prévue est stockée au format `YYYY-MM-DD`

### Requirement: Projection locale des échéances financières

L'application SHALL calculer localement les prochaines échéances financières nécessaires au résumé 30 et 90 jours sans attendre Dexie Cloud, conformément à TECH-LF-001, TECH-LF-003, RG-DAT-002, RG-DAT-003, RG-DAT-004, RG-PAU-001 et RG-CAN-002.

#### Scenario: Projection mensuelle simple

- **WHEN** un abonnement actif possède un prix, une périodicité mensuelle et une prochaine échéance connue
- **THEN** l'application calcule les échéances suivantes sur la fenêtre demandée
- **AND** les échéances sont visibles même hors connexion

#### Scenario: Suspension pendant une pause

- **WHEN** un abonnement est en statut `PAUSED` avec une date `pauseUntil`
- **THEN** aucune charge récurrente n'est générée entre la date courante et `pauseUntil`
- **AND** la projection reprend uniquement après la fin de pause si la règle est déterministe

#### Scenario: Arrêt à la fin du service

- **WHEN** un abonnement possède une `serviceEndDate`
- **THEN** l'application n'affiche aucune échéance au-delà de cette date
- **AND** un abonnement `ENDED` ne génère aucune nouvelle charge

### Requirement: Calcul des indicateurs financiers du Lot 3

L'application SHALL calculer le coût mensuel équivalent, le coût annuel équivalent, les décaissements prévus à 30 et 90 jours et les dépenses sur période à partir des abonnements et paiements, conformément à la section 9.2, OBJ-MET-001 et AC-010. L'application SHALL également appliquer les taux de conversion configurés pour inclure les abonnements en devise étrangère dans les totaux consolidés, et SHALL exposer la liste des abonnements exclus avec leur motif d'exclusion. Tous les montants financiers sont exprimés en unités de devise. Les propriétés `*Minor` de `FinancialSummary` sont supprimées.

#### Scenario: Coût équivalent d'un abonnement annuel en unités

- **WHEN** un abonnement est facturé 120.00 en `EUR` avec une périodicité annuelle
- **THEN** le coût mensuel équivalent retourné est 10.00
- **AND** le coût annuel équivalent retourné est 120.00

#### Scenario: Dépenses calculées depuis les statuts de paiement

- **WHEN** une période contient des paiements `ASSUMED_PAID`, `CONFIRMED_PAID` et `REFUNDED`
- **THEN** les dépenses incluent les montants supposés et confirmés
- **AND** les remboursements diminuent le total
- **AND** les paiements `PROJECTED` ne sont pas comptés comme dépense réalisée

#### Scenario: Abonnement USD inclus avec taux de conversion

- **WHEN** un abonnement est facturé 10.00 USD et un taux de conversion USD→EUR de 0.92 est configuré
- **THEN** le coût mensuel équivalent est calculé en convertissant le montant en EUR via le taux
- **AND** l'abonnement est compté dans `includedSubscriptionCount`
- **AND** le montant converti contribue aux totaux `monthlyEquivalent` et `annualEquivalent`

#### Scenario: Abonnement exclu faute de taux de conversion

- **WHEN** un abonnement utilise une devise étrangère sans taux de conversion configuré
- **THEN** l'abonnement est exclu des totaux consolidés
- **AND** il apparaît dans la liste des exclus avec le motif "devise non convertible"
- **AND** le compteur `excludedCurrencySubscriptionCount` est incrémenté

### Requirement: Correction manuelle sans perte d'historique

L'application SHALL permettre de corriger localement un paiement projeté ou supposé sans modifier rétroactivement le tarif courant de l'abonnement, conformément à la section 9.3, RG-STA-005 et FUN-11.7.

#### Scenario: Confirmation d'un paiement supposé

- **WHEN** l'utilisateur confirme un paiement `ASSUMED_PAID`
- **THEN** le paiement passe au statut `CONFIRMED_PAID`
- **AND** la correction est persistée localement immédiatement
- **AND** l'abonnement conserve son prix courant inchangé

#### Scenario: Annulation d'un prélèvement prévu

- **WHEN** l'utilisateur indique qu'une échéance ne doit pas être prélevée
- **THEN** le paiement correspondant passe au statut `SKIPPED`
- **AND** l'historique reste consultable pour analyse ultérieure

### Requirement: Résumé financier local-first en interface

L'application SHALL afficher un résumé financier local-first distinguant coûts équivalents, décaissements futurs et dépenses passées, ainsi qu'une liste de paiements avec leur statut, conformément à FUN-CRUD-003, TECH-LF-006 et AC-008.

#### Scenario: Consultation hors connexion du résumé financier

- **WHEN** l'utilisateur ouvre l'application hors connexion après une première synchronisation réussie
- **THEN** le résumé financier est calculé depuis IndexedDB
- **AND** la liste des paiements reste visible avec ses statuts
- **AND** l'interface distingue visuellement `PROJECTED`, `ASSUMED_PAID` et `CONFIRMED_PAID`

### Requirement: Limites explicites du premier incrément

Le premier incrément de cette capacité MUST limiter ses calculs aux cas déterministes du MVP et SHALL conserver les cas complexes comme amélioration future documentée, notamment les promotions, essais et renouvellements contractuels divergents, conformément au choix de lot incrémental décrit dans la proposition.

#### Scenario: Conversion de devise incluse dans le périmètre MVP

- **WHEN** un abonnement nécessite une conversion de devise avec un taux statique configuré
- **THEN** l'application applique la conversion et inclut le montant dans les totaux
- **AND** le calcul reste déterministe et basé sur les données locales

### Requirement: Champ amount en unités de devise (phase 2)

Le type `Money` SHALL exposer un champ `amount` (number) représentant le montant en unités de la devise (ex: 15.00 pour 15 €). Le champ `amountMinor` a été supprimé.

#### Scenario: Paiement avec montant en unités

- **WHEN** un paiement est créé ou matérialisé
- **THEN** `amount.amount` est stocké en unités de devise (ex: 15.00)

#### Scenario: Migration des paiements existants

- **WHEN** la base existante contient des `amountMinor` en centimes
- **THEN** la migration Dexie v4 calcule `amount = amountMinor / 100`
- **AND** la migration Dexie v5 supprime le champ `amountMinor`