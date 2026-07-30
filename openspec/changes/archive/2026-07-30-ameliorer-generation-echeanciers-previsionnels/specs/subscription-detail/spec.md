## MODIFIED Requirements

### Requirement: Échéances futures et éléments à vérifier

La fiche SHALL afficher les paiements de l’abonnement dans des groupes compréhensibles, en respectant les dates civiles et les statuts financiers de FUN-11.7. Elle SHALL présenter jusqu’aux douze premières échéances futures produites par l’horizon adaptatif.

#### Scenario: Liste chronologique des échéances futures

- **WHEN** plusieurs paiements `PROJECTED` sont datés d’aujourd’hui ou d’une date future
- **THEN** la fiche affiche au maximum douze échéances par ordre chronologique
- **AND** chaque ligne contient la date, le montant et le statut

#### Scenario: Douze échéances mensuelles

- **WHEN** un abonnement mensuel sans borne de renouvellement possède douze paiements projetés dans son horizon
- **THEN** les douze échéances sont visibles sur la fiche

#### Scenario: Échéance passée non finalisée

- **WHEN** un paiement `PROJECTED` ou `ASSUMED_PAID` possède une date passée
- **THEN** il est présenté dans une zone « À vérifier »
- **AND** il n’est pas présenté comme un paiement historique finalisé

#### Scenario: Aucune échéance disponible

- **WHEN** aucun paiement futur ni `nextChargeDate` n’est disponible
- **THEN** la fiche affiche un état explicite indiquant qu’aucune échéance n’est disponible
