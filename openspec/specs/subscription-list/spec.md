## Purpose

Définir les exigences pour la liste des abonnements avec deux modes d'affichage (compact type Excel et cartes modernes), le tri par colonne, la recherche avancée multi-critères et les indicateurs visuels.

## Requirements

### Requirement: Liste d'abonnements avec deux modes d'affichage

L'application SHALL fournir une liste d'abonnements avec deux modes d'affichage : un mode compact (grille type Excel) et un mode cartes (liste aérée), avec un basculement visuel entre les deux modes. Le mode compact est le mode par défaut.

#### Scenario: Affichage en mode compact

- **WHEN** l'utilisateur ouvre la page Abonnements
- **THEN** la liste s'affiche en mode compact par défaut
- **AND** les colonnes affichées sont : Nom, Statut, Prix, Cycle de facturation, Prochaine échéance, Catégorie
- **AND** chaque ligne affiche des boutons d'action (Modifier, Archiver)

#### Scenario: Archivage d'un abonnement avec confirmation

- **WHEN** l'utilisateur clique sur "Archiver" dans le mode compact ou le mode cartes
- **THEN** un dialogue de confirmation s'affiche avec le titre "Archiver l'abonnement"
- **AND** le message indique le nom de l'abonnement à archiver
- **AND** le bouton "Accepter" est en variante warning (orange)
- **WHEN** l'utilisateur confirme
- **THEN** l'abonnement est archivé (soft delete)
- **AND** un message de confirmation s'affiche : "Abonnement archivé localement. Synchronisation asynchrone en cours."

#### Scenario: Annulation de l'archivage d'un abonnement

- **WHEN** l'utilisateur clique sur "Refuser" dans le dialogue de confirmation
- **THEN** l'abonnement n'est pas archivé

#### Scenario: Basculement vers le mode cartes

- **WHEN** l'utilisateur clique sur le bouton de basculement vers le mode cartes
- **THEN** la liste passe en mode cartes avec des cartes individuelles pour chaque abonnement
- **AND** chaque carte affiche le nom, le statut (avec badge coloré), le prix, la fréquence, la prochaine échéance, la catégorie et les boutons d'action
- **AND** la préférence est persistée dans localStorage

#### Scenario: Retour vers le mode compact

- **WHEN** l'utilisateur clique sur le bouton de basculement vers le mode compact
- **THEN** la liste repasse en mode compact
- **AND** la préférence est persistée dans localStorage

### Requirement: Tri par colonne dans le mode compact

L'application SHALL permettre le tri mono-colonne ascendant/décendant en cliquant sur les en-têtes de colonne dans le mode compact. Les colonnes triables sont : Nom, Prix, Prochaine échéance, Catégorie, Statut.

#### Scenario: Tri par nom

- **WHEN** l'utilisateur clique sur l'en-tête "Nom"
- **THEN** la liste est triée par ordre alphabétique croissant (A→Z)
- **AND** un indicateur visuel (⬍) apparaît sur l'en-tête

#### Scenario: Inversion du tri

- **WHEN** l'utilisateur reclique sur le même en-tête
- **THEN** le tri s'inverse (Z→A)
- **AND** l'indicateur visuel change (⬎)

#### Scenario: Changement de colonne de tri

- **WHEN** l'utilisateur clique sur un autre en-tête
- **THEN** le tri s'applique sur la nouvelle colonne
- **AND** l'indicateur visuel se déplace sur le nouvel en-tête

### Requirement: Recherche avancée multi-critères

L'application SHALL fournir une barre de recherche avancée permettant de filtrer les abonnements par nom, fournisseur, date d'échéance (min/max), catégorie et montant (min/max). Tous les critères sont combinés avec un ET logique.

#### Scenario: Recherche par nom

- **WHEN** l'utilisateur saisit un texte dans le champ de recherche par nom
- **THEN** la liste est filtrée pour n'afficher que les abonnements dont le nom contient le texte saisi (insensible à la casse)

#### Scenario: Filtre par plage de dates

- **WHEN** l'utilisateur saisit une date de début et une date de fin dans les champs de filtre d'échéance
- **THEN** la liste n'affiche que les abonnements dont la prochaine échéance est dans l'intervalle

#### Scenario: Combinaison de critères

- **WHEN** l'utilisateur combine un filtre nom et un filtre catégorie
- **THEN** la liste n'affiche que les abonnements correspondant aux deux critères simultanément

### Requirement: Indicateurs visuels sur les fiches

L'application SHALL conserver les indicateurs visuels existants (badge d'exclusion des totaux consolidés, indicateur de conversion de devise) dans les deux modes d'affichage.

#### Scenario: Badge d'exclusion en mode compact

- **WHEN** un abonnement exclu des totaux est affiché en mode compact
- **THEN** un badge "Exclu" apparaît dans sa ligne
- **AND** un tooltip explique le motif d'exclusion

#### Scenario: Indicateur de conversion en mode cartes

- **WHEN** un abonnement avec devise convertie est affiché en mode cartes
- **THEN** un indicateur visuel montre que la conversion est active

### Requirement: Filtrage par recherche textuelle avec debounce

Le système SHALL filtrer la liste des abonnements en temps réel lorsque l'utilisateur saisit du texte dans le champ de recherche. La recherche SHALL être insensible à la casse et porter sur les champs `name`, `provider` et `notes` de l'abonnement. Un debounce de 300ms évite des recalculs excessifs lors de la frappe.

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

Le système SHALL filtrer la liste selon le mode de continuation sélectionné et SHALL proposer un libellé distinct pour `ROLLING`, `AUTOMATIC`, `MANUAL` et `UNKNOWN` dans les filtres et badges.

#### Scenario: Filtrage par renouvellement automatique

- **WHEN** l'utilisateur sélectionne « Renouvellement automatique »
- **THEN** la liste ne montre que les abonnements dont `renewalMode=AUTOMATIC`

#### Scenario: Filtrage par renouvellement manuel

- **WHEN** l'utilisateur sélectionne « Renouvellement manuel »
- **THEN** la liste ne montre que les abonnements dont `renewalMode=MANUAL`

#### Scenario: Filtrage tous renouvellements

- **WHEN** l'utilisateur sélectionne « Tous »
- **THEN** aucun abonnement n'est exclu par le filtre de continuation

#### Scenario: Filtrage par reconduction continue

- **WHEN** l'utilisateur sélectionne « Reconduction continue »
- **THEN** la liste ne montre que les abonnements dont `renewalMode=ROLLING`

#### Scenario: Filtrage par mode inconnu

- **WHEN** l'utilisateur sélectionne « Inconnu »
- **THEN** la liste ne montre que les abonnements dont `renewalMode=UNKNOWN`

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

### Requirement: Accès à la fiche détaillée depuis les listes

L’application SHALL proposer une action de consultation distincte de l’édition dans les modes compact et cartes de la liste des abonnements, conformément aux sections 11.3 et 11.4.

#### Scenario: Consultation depuis le mode compact

- **WHEN** l’utilisateur active le nom ou l’action « Voir » d’une ligne du mode compact
- **THEN** la fiche détaillée de cet abonnement est ouverte
- **AND** l’action ne déclenche pas le dialogue d’édition

#### Scenario: Consultation depuis le mode cartes

- **WHEN** l’utilisateur active le nom ou l’action « Voir » d’une carte
- **THEN** la fiche détaillée de cet abonnement est ouverte
- **AND** les actions « Modifier » et « Archiver » restent disponibles séparément
