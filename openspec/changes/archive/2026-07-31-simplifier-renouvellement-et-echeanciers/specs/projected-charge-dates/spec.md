## MODIFIED Requirements

### Requirement: Horizon adaptatif des échéances

Le système SHALL projeter les échéances depuis la première occurrence RF-01 selon le cycle de facturation. Il SHALL appliquer `nextRenewalDate` comme borne inclusive uniquement pour un renouvellement contractuel distinct, limiter l'horizon à douze occurrences, projeter une seule occurrence pour une facturation annuelle et toujours appliquer `serviceEndDate` comme borne inclusive.

#### Scenario: Douze échéances mensuelles en reconduction continue

- **WHEN** un abonnement mensuel `ROLLING` a pour prochaine échéance `2026-08-15`
- **THEN** douze échéances sont projetées de `2026-08-15` à `2027-07-15`
- **AND** aucune ancienne `nextRenewalDate` résiduelle ne réduit cette fenêtre

#### Scenario: Compatibilité d'un renouvellement mensuel identique

- **WHEN** un abonnement legacy est facturé et renouvelé automatiquement tous les mois
- **AND** ses deux intervalles sont identiques
- **THEN** `nextRenewalDate` n'est pas utilisée comme borne
- **AND** douze mensualités sont projetées

#### Scenario: Facturation annuelle

- **WHEN** un abonnement est facturé annuellement
- **THEN** une seule échéance future est projetée

#### Scenario: Facturation mensuelle bornée par un renouvellement annuel distinct

- **WHEN** un abonnement mensuel a un renouvellement contractuel annuel et `nextRenewalDate=2026-12-15`
- **AND** sa prochaine échéance est `2026-08-15`
- **THEN** les échéances sont projetées jusqu'au `2026-12-15` inclus
- **AND** aucune échéance postérieure au renouvellement n'est projetée
- **AND** le résultat contient au maximum douze occurrences

#### Scenario: Fin de service prioritaire

- **WHEN** `serviceEndDate` est antérieure à la fin de la fenêtre calculée
- **THEN** aucune échéance postérieure à `serviceEndDate` n'est projetée
- **AND** une occurrence tombant exactement à `serviceEndDate` reste incluse

#### Scenario: Paiements réels ou corrigés protégés

- **WHEN** la matérialisation réconcilie l'échéancier désiré avec les paiements existants
- **THEN** elle ne crée, met à jour ou retire que les projections générées
- **AND** elle ne modifie ni ne supprime aucun paiement réel, importé ou corrigé
