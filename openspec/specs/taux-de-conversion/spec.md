## Purpose

Définir les garanties pour la configuration et l'application de taux de conversion statiques entre devises, permettant d'inclure les abonnements en devise étrangère dans le calcul des coûts consolidés.

## Requirements

### Requirement: Configuration des taux de conversion statiques

L'application SHALL permettre à l'utilisateur de configurer des taux de conversion statiques entre devises, stockés dans les paramètres synchronisés de l'application, afin d'inclure les abonnements en devise étrangère dans le calcul des coûts consolidés.

#### Scenario: Configuration d'un taux USD→EUR

- **WHEN** l'utilisateur saisit un taux de conversion de 0.92 pour la devise USD
- **THEN** le taux est persisté dans les paramètres de l'application
- **AND** le taux est synchronisé entre les appareils via Dexie Cloud
- **AND** le calcul des coûts consolidés utilise ce taux pour convertir les montants USD en EUR

#### Scenario: Modification d'un taux existant

- **WHEN** l'utilisateur modifie le taux de conversion d'une devise déjà configurée
- **THEN** l'ancien taux est remplacé par le nouveau
- **AND** les calculs financiers sont mis à jour au prochain rafraîchissement

#### Scenario: Suppression d'un taux de conversion

- **WHEN** l'utilisateur supprime un taux de conversion existant
- **THEN** la devise n'est plus convertie
- **AND** les abonnements utilisant cette devise sont exclus du calcul consolidé avec le motif "devise non convertible"

#### Scenario: Validation des taux saisis

- **WHEN** l'utilisateur saisit un taux de conversion négatif ou nul
- **THEN** l'interface affiche une erreur de validation
- **AND** le taux invalide n'est pas persisté

### Requirement: Calcul des coûts consolidés avec conversion

L'application SHALL appliquer les taux de conversion configurés lors du calcul des indicateurs financiers pour inclure les abonnements en devise étrangère dans les totaux consolidés en EUR.

#### Scenario: Abonnement USD converti en EUR

- **WHEN** un abonnement est facturé 1000 centimes USD avec un taux USD→EUR de 0.92
- **THEN** le coût mensuel équivalent en EUR est calculé avec la conversion (montantEUR = montantUSD × 0.92)
- **AND** le montant converti est inclus dans le total consolidé

#### Scenario: Abonnement sans taux de conversion configuré

- **WHEN** un abonnement utilise une devise étrangère sans taux de conversion configuré
- **THEN** l'abonnement est exclu des totaux consolidés
- **AND** le motif d'exclusion est "devise non convertible"
- **AND** l'abonnement apparaît dans la liste des exclus avec un tooltip explicatif

#### Scenario: Conservation des données d'origine

- **WHEN** un abonnement en devise étrangère est inclus dans le calcul consolidé via conversion
- **THEN** le montant et la devise d'origine de l'abonnement restent inchangés en base
- **AND** les paiements projetés conservent leur devise d'origine

### Requirement: Indicateur individuel d'exclusion

L'application SHALL afficher un indicateur visuel individuel pour chaque abonnement exclu du calcul des coûts, avec un tooltip expliquant le motif d'exclusion.

#### Scenario: Tooltip sur abonnement exclu

- **WHEN** un abonnement est exclu du calcul des coûts consolidés
- **THEN** un badge ou icône d'exclusion apparaît sur la fiche de l'abonnement
- **AND** un tooltip au survol affiche le motif d'exclusion (ex: "Devise USD non convertible")

#### Scenario: Abonnement inclus avec conversion

- **WHEN** un abonnement en devise étrangère est inclus dans le calcul via un taux de conversion
- **THEN** un indicateur visuel montre que la conversion est active
- **AND** le tooltip affiche le taux appliqué (ex: "Taux USD→EUR: 0.92")