## ADDED Requirements

### Requirement: Identité déterministe des nouvelles projections

Toute nouvelle échéance `GENERATED/PROJECTED` SHALL utiliser un identifiant déterministe préfixé `pym` dérivé de l’abonnement et de la date civile, afin que deux appareils convergent vers la même entité synchronisée.

#### Scenario: Création concurrente sur deux appareils

- **WHEN** deux appareils projettent la même date pour le même abonnement avant d’avoir synchronisé leurs résultats
- **THEN** ils produisent le même identifiant `pym`
- **AND** Dexie Cloud converge vers une seule échéance logique

#### Scenario: Ancienne projection réutilisée

- **WHEN** une projection existante à identifiant historique correspond à une date désirée
- **THEN** cette projection est conservée ou mise à jour avec son identifiant existant
- **AND** aucune migration destructive globale n’est réalisée

### Requirement: Réconciliation minimale des projections

La rematérialisation SHALL rapprocher les projections intactes par date civile et SHALL effectuer uniquement les créations, mises à jour et suppressions nécessaires.

#### Scenario: Modification du montant

- **WHEN** une projection intacte possède la date désirée mais un montant ou une devise différente
- **THEN** la ligne existante est mise à jour avec `put`
- **AND** son identifiant est conservé

#### Scenario: Date devenue obsolète

- **WHEN** une projection intacte ne correspond plus à aucune date désirée
- **THEN** cette seule projection peut être supprimée

#### Scenario: Nouvelle date

- **WHEN** une date désirée ne possède aucune projection ni échéance protégée
- **THEN** une nouvelle projection est créée avec son identifiant déterministe

### Requirement: Séparation logique et protection des échéances réelles

Une échéance SHALL être remplaçable uniquement si elle est de source `GENERATED`, de statut `PROJECTED` et sans `correctedAt`. Toute autre échéance SHALL être protégée et MUST NOT être modifiée ou supprimée par la régénération.

#### Scenario: Échéance finalisée conservée

- **WHEN** une échéance générée est `ASSUMED_PAID`, `CONFIRMED_PAID`, `SKIPPED` ou `REFUNDED`
- **THEN** la régénération ne la modifie ni ne la supprime

#### Scenario: Échéance corrigée conservée

- **WHEN** une échéance possède `correctedAt`
- **THEN** la régénération ne la modifie ni ne la supprime

#### Scenario: Source métier conservée

- **WHEN** une échéance provient de `MANUAL`, `IMPORTED` ou `N8N`
- **THEN** la régénération ne la modifie ni ne la supprime

#### Scenario: Date protégée non dupliquée

- **WHEN** une échéance protégée existe à une date également calculée par la projection
- **THEN** aucune nouvelle échéance `PROJECTED` n’est créée à cette date
