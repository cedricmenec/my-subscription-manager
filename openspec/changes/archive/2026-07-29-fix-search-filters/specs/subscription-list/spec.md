## ADDED Requirements

### Requirement: Filtrage par recherche textuelle
Le système SHALL filtrer la liste des abonnements en temps réel lorsque l'utilisateur saisit du texte dans le champ de recherche. La recherche doit être insensible à la casse et porter sur les champs `name`, `provider` et `notes` de l'abonnement.

#### Scenario: Recherche par nom d'abonnement
- **WHEN** l'utilisateur tape "netflix" dans le champ de recherche
- **THEN** la liste ne montre que les abonnements dont le champ `name` contient "netflix" (insensible à la casse)

#### Scenario: Recherche par fournisseur
- **WHEN** l'utilisateur tape "spotify" dans le champ de recherche
- **THEN** la liste ne montre que les abonnements dont le champ `provider` contient "spotify" (insensible à la casse)

#### Scenario: Recherche par notes
- **WHEN** l'utilisateur tape "pro" dans le champ de recherche
- **THEN** la liste ne montre que les abonnements dont le champ `notes` contient "pro" (insensible à la casse)

#### Scenario: Recherche vide
- **WHEN** le champ de recherche est vide ou effacé
- **THEN** le filtre de recherche textuelle ne retire aucun abonnement (tous passent le filtre)

#### Scenario: Recherche avec debounce
- **WHEN** l'utilisateur tape rapidement "netflix"
- **THEN** le filtrage ne se déclenche qu'après 300ms d'inactivité de frappe

### Requirement: Filtrage par statut
Le système SHALL filtrer la liste des abonnements selon le statut sélectionné dans le filtre avancé.

#### Scenario: Filtrage par statut actif
- **WHEN** l'utilisateur sélectionne "Actif" dans le filtre de statut
- **THEN** la liste ne montre que les abonnements dont le statut est `ACTIVE`

#### Scenario: Filtrage par statut en pause
- **WHEN** l'utilisateur sélectionne "En pause" dans le filtre de statut
- **THEN** la liste ne montre que les abonnements dont le statut est `PAUSED`

#### Scenario: Filtrage par tous les statuts
- **WHEN** l'utilisateur sélectionne "Tous" dans le filtre de statut
- **THEN** aucun abonnement n'est exclu par le filtre de statut

### Requirement: Filtrage par catégorie
Le système SHALL filtrer la liste des abonnements selon la catégorie sélectionnée dans le filtre avancé.

#### Scenario: Filtrage par catégorie sélectionnée
- **WHEN** l'utilisateur sélectionne une catégorie spécifique (ex: "Streaming")
- **THEN** la liste ne montre que les abonnements dont le `categoryId` correspond à cette catégorie

#### Scenario: Filtrage toutes catégories
- **WHEN** l'utilisateur sélectionne "Toutes" dans le filtre de catégorie
- **THEN** aucun abonnement n'est exclu par le filtre de catégorie

#### Scenario: Abonnement sans catégorie
- **WHEN** un abonnement n'a pas de `categoryId` défini
- **THEN** il n'apparaît pas quand une catégorie spécifique est sélectionnée, mais apparaît quand "Toutes" est sélectionné

### Requirement: Filtrage par mode de renouvellement
Le système SHALL filtrer la liste des abonnements selon le mode de renouvellement sélectionné.

#### Scenario: Filtrage par renouvellement automatique
- **WHEN** l'utilisateur sélectionne "Automatique" dans le filtre de renouvellement
- **THEN** la liste ne montre que les abonnements dont le `renewalMode` est `AUTOMATIC`

#### Scenario: Filtrage par renouvellement manuel
- **WHEN** l'utilisateur sélectionne "Manuel" dans le filtre de renouvellement
- **THEN** la liste ne montre que les abonnements dont le `renewalMode` est `MANUAL`

#### Scenario: Filtrage tous renouvellements
- **WHEN** l'utilisateur sélectionne "Tous" dans le filtre de renouvellement
- **THEN** aucun abonnement n'est exclu par le filtre de renouvellement

### Requirement: Filtrage abonnements incomplets
Le système SHALL permettre d'afficher uniquement les abonnements dont la fiche est incomplète.

#### Scenario: Activation du filtre incomplet
- **WHEN** l'utilisateur active le filtre "Abonnements incomplets"
- **THEN** la liste ne montre que les abonnements pour lesquels `computeSubscriptionCompletion(isComplete)` retourne `false`

#### Scenario: Désactivation du filtre incomplet
- **WHEN** l'utilisateur désactive le filtre "Abonnements incomplets"
- **THEN** tous les abonnements (complets et incomplets) sont visibles selon les autres filtres

### Requirement: Combinaison de filtres
Le système SHALL combiner tous les filtres actifs avec une logique ET (intersection).

#### Scenario: Recherche + catégorie
- **WHEN** l'utilisateur tape "netflix" ET sélectionne la catégorie "Streaming"
- **THEN** la liste ne montre que les abonnements qui correspondent aux DEUX critères simultanément

#### Scenario: Tous les filtres combinés
- **WHEN** l'utilisateur active plusieurs filtres (recherche, statut, catégorie, renouvellement, dates, montants)
- **THEN** la liste ne montre que les abonnements qui satisfont TOUS les filtres actifs simultanément
