## Purpose

Définir le modèle `Subscription` et ses comportements associés (CRUD, validation, statuts, cycles), conformément à la spécification métier.

## Requirements

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

### Requirement: Statuts métier et renouvellement tri-état

L'application SHALL gérer les statuts `TRIAL`, `ACTIVE`, `PAUSED`, `CANCELLED_PENDING_END`, `ENDED`, `UNKNOWN` et le renouvellement `AUTOMATIC`, `MANUAL`, `UNKNOWN`, conformément à la section 8 et à la section 10.

#### Scenario: Changement de statut vers pause

- **WHEN** l'utilisateur passe un abonnement en statut `PAUSED`
- **THEN** le statut est enregistré localement immédiatement
- **AND** la fiche affiche explicitement l'information de pause et sa date de fin si renseignée

### Requirement: CRUD local-first des abonnements

L'application SHALL confirmer la réussite d'une création ou modification d'abonnement dès validation de la transaction locale Dexie, sans attendre la synchronisation distante, conformément à FUN-CRUD-001, FUN-CRUD-002 et TECH-LF-003.

#### Scenario: Modification hors connexion

- **WHEN** l'appareil est hors connexion et l'utilisateur modifie un abonnement
- **THEN** la modification est persistée localement
- **AND** l'interface indique que la synchronisation est en attente
- **AND** la donnée est toujours disponible après fermeture et réouverture

### Requirement: Liste d'abonnements filtrable et triable

L'application SHALL fournir une liste supportant au minimum recherche texte, filtre de statut, filtre de catégorie, filtre de mode de renouvellement, recherche avancée multi-critères (nom, date, catégorie, montant) et tri par nom, montant, date de création, prochaine échéance, complétude ou date de mise à jour, conformément à FUN-11.3.

#### Scenario: Filtrage des abonnements actifs

- **WHEN** l'utilisateur applique le filtre `ACTIVE`
- **THEN** la liste affiche uniquement les abonnements actifs non archivés
- **AND** le nombre d'éléments affichés est mis à jour sans rechargement manuel

#### Scenario: Tri par nom

- **WHEN** l'utilisateur choisit le tri par nom
- **THEN** la liste est triée par ordre alphabétique

#### Scenario: Tri par montant

- **WHEN** l'utilisateur choisit le tri par montant
- **THEN** la liste est triée par prix courant croissant

#### Scenario: Tri par date de création

- **WHEN** l'utilisateur choisit le tri par date de création
- **THEN** la liste est triée de la plus récente à la plus ancienne

#### Scenario: Filtrage par plage de dates

- **WHEN** l'utilisateur applique un filtre de date min et date max
- **THEN** la liste affiche uniquement les abonnements dont la prochaine échéance est dans l'intervalle

#### Scenario: Filtrage par plage de montant

- **WHEN** l'utilisateur applique un filtre de montant min et montant max
- **THEN** la liste affiche uniquement les abonnements dont le prix est dans l'intervalle

### Requirement: Indicateur de complétude et vue à compléter

L'application SHALL calculer un indicateur de complétude basé sur les champs critiques (`name`, `status`, `price`, `currency`, `billingInterval`, `nextChargeDate`, `renewalMode`) et SHALL exposer une vue « À compléter », conformément à FUN-11.8.

#### Scenario: Abonnement incomplet

- **WHEN** un abonnement est enregistré sans prochaine échéance
- **THEN** il est marqué comme incomplet
- **AND** il apparaît dans la vue « À compléter »

### Requirement: Erreurs de synchronisation sans perte locale

Lorsqu'une synchronisation échoue après une écriture locale réussie, l'application SHALL signaler une erreur de synchronisation sans indiquer de perte locale, conformément à FUN-CRUD-004 et AC-009.

#### Scenario: Échec sync après enregistrement

- **WHEN** la synchronisation distante échoue après sauvegarde locale
- **THEN** l'interface affiche un état d'erreur de synchronisation
- **AND** l'abonnement reste consultable et modifiable localement

### Requirement: Sécurité des entrées utilisateur

Les champs texte libres de la fiche abonnement SHALL être rendus en texte non exécuté et validés côté frontend, et le changement MUST NOT introduire de secret frontend ni de fichier `dexie-cloud.key`, conformément à SEC-002, SEC-003 et SEC-005.

#### Scenario: Saisie d'un texte arbitraire

- **WHEN** l'utilisateur saisit un texte contenant des balises HTML dans les notes
- **THEN** l'interface affiche le contenu comme texte brut
- **AND** aucun script n'est exécuté

### Requirement: Indicateur d'exclusion sur les fiches abonnement

L'application SHALL afficher un indicateur visuel individuel sur chaque abonnement exclu du calcul des coûts consolidés, avec un tooltip expliquant le motif d'exclusion, conformément à l'objectif de transparence des calculs financiers.

#### Scenario: Badge d'exclusion sur la fiche

- **WHEN** un abonnement est affiché dans la liste et qu'il est exclu du calcul des coûts consolidés
- **THEN** un badge ou icône "Exclu" apparaît à côté du nom de l'abonnement
- **AND** un tooltip au survol du badge affiche le motif d'exclusion
- **AND** le motif d'exclusion est lisible (ex: "Devise USD non convertible", "Aucun prix défini")

#### Scenario: Indicateur de conversion active

- **WHEN** un abonnement en devise étrangère est inclus dans le calcul via un taux de conversion configuré
- **THEN** un indicateur visuel montre que la conversion est active
- **AND** le tooltip affiche le taux appliqué (ex: "Taux USD→EUR: 0.92")

### Requirement: Champ currentPrice en unités de devise (phase 2)

Le modèle `Subscription` SHALL exposer un champ `currentPrice` (number) représentant le montant en unités de la devise (ex: 15.00 pour 15 €). Le champ `currentPriceMinor` a été supprimé.

#### Scenario: Création avec prix en unités

- **WHEN** l'utilisateur saisit un prix de "15" dans le champ "Prix"
- **THEN** `currentPrice` est persisté à 15.00

#### Scenario: Migration des données existantes

- **WHEN** la base existante contient des `currentPriceMinor` en centimes
- **THEN** la migration Dexie v4 calcule `currentPrice = currentPriceMinor / 100`
- **AND** la migration Dexie v5 supprime le champ `currentPriceMinor`
