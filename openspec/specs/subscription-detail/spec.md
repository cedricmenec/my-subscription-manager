## Purpose

Définir la consultation détaillée d’un abonnement, la mise en relief de ses prochaines échéances et l’accès à son historique financier.

## Requirements

### Requirement: Accès direct à la fiche abonnement

L’application SHALL fournir une page de détail accessible par une URL `#/subscriptions/:id`, conformément à la section 11.4, et SHALL permettre de revenir à la liste des abonnements.

#### Scenario: Ouverture depuis la liste

- **WHEN** l’utilisateur active l’action de consultation d’un abonnement
- **THEN** l’URL contient l’identifiant de l’abonnement
- **AND** la fiche correspondante est affichée

#### Scenario: Accès direct hors ligne

- **WHEN** l’utilisateur ouvre directement l’URL d’une fiche après le premier lancement réussi et que les données locales sont disponibles
- **THEN** la fiche est chargée depuis IndexedDB sans attendre le réseau

#### Scenario: Abonnement introuvable

- **WHEN** le chargement local est terminé et aucun abonnement ne correspond à l’identifiant de l’URL
- **THEN** la page affiche un état « Abonnement introuvable »
- **AND** propose un retour vers la liste

### Requirement: Mise en relief des prochaines échéances

La fiche SHALL mettre en évidence le prochain paiement disponible et SHALL mettre en évidence la prochaine date de renouvellement lorsque `renewalMode` vaut `AUTOMATIC`, conformément à AC-012 et à la règle indiquant qu’un renouvellement automatique doit être visible dans toutes les vues d’échéances.

#### Scenario: Prochain paiement matérialisé

- **WHEN** l’abonnement possède au moins un paiement `PROJECTED` daté d’aujourd’hui ou d’une date future
- **THEN** le premier paiement par ordre chronologique est affiché dans la carte « Prochain paiement »
- **AND** son montant, sa devise, sa date civile et son délai relatif sont visibles

#### Scenario: Repli sur la prochaine date de facturation

- **WHEN** aucun paiement futur matérialisé n’est disponible mais que `nextChargeDate` est renseignée
- **THEN** la carte « Prochain paiement » affiche cette date
- **AND** utilise le prix courant lorsqu’il est disponible

#### Scenario: Renouvellement automatique

- **WHEN** `renewalMode` vaut `AUTOMATIC` et `nextRenewalDate` est renseignée
- **THEN** une carte « Prochain renouvellement » affiche la date et son délai relatif

#### Scenario: Date de renouvellement automatique indisponible

- **WHEN** `renewalMode` vaut `AUTOMATIC` et `nextRenewalDate` est absente
- **THEN** la carte de renouvellement affiche « Date non calculable »

#### Scenario: Renouvellement non automatique

- **WHEN** `renewalMode` vaut `MANUAL` ou `UNKNOWN`
- **THEN** aucune carte de prochaine date de renouvellement n’est mise en relief
- **AND** le mode reste visible dans les informations détaillées

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

### Requirement: Informations structurées et édition

La fiche SHALL organiser les informations disponibles en sections couvrant l’identité, la tarification, la facturation, l’engagement et le renouvellement, le cycle de vie, la gestion et l’annulation, les alertes et les commentaires, conformément à la section 11.4.

#### Scenario: Consultation des informations

- **WHEN** l’utilisateur consulte une fiche
- **THEN** tous les champs renseignés du modèle `Subscription` sont accessibles dans une section cohérente
- **AND** les absences significatives sont présentées par un libellé synthétique

#### Scenario: Modification depuis la fiche

- **WHEN** l’utilisateur active « Modifier »
- **THEN** le dialogue d’édition existant s’ouvre avec les valeurs de l’abonnement
- **WHEN** la sauvegarde locale réussit
- **THEN** la fiche reste affichée et reflète les nouvelles valeurs sans attendre Dexie Cloud, conformément à FUN-CRUD-001 et FUN-CRUD-002

### Requirement: Historique des paiements repliable

La fiche SHALL fournir une section d’historique des paiements finalisés de l’abonnement, repliée par défaut, conformément à FUN-11.7 et RG-STA-005.

#### Scenario: Historique fermé initialement

- **WHEN** la fiche est affichée
- **THEN** les paiements `CONFIRMED_PAID`, `SKIPPED` et `REFUNDED` sont regroupés dans une section « Historique des paiements »
- **AND** cette section est repliée par défaut
- **AND** son résumé indique le nombre de paiements

#### Scenario: Ouverture au clavier

- **WHEN** l’utilisateur focalise le résumé de l’historique et l’active au clavier
- **THEN** la liste historique devient accessible
