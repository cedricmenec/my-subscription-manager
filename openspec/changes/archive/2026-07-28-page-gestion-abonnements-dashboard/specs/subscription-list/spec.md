## ADDED Requirements

### Requirement: Liste d'abonnements avec deux modes d'affichage

L'application SHALL fournir une liste d'abonnements avec deux modes d'affichage : un mode compact (grille type Excel) et un mode cartes (liste aérée), avec un basculement visuel entre les deux modes. Le mode compact est le mode par défaut.

#### Scenario: Affichage en mode compact

- **WHEN** l'utilisateur ouvre la page Abonnements
- **THEN** la liste s'affiche en mode compact par défaut
- **AND** les colonnes affichées sont : Nom, Statut, Prix, Cycle de facturation, Prochaine échéance, Catégorie
- **AND** chaque ligne affiche des boutons d'action (Modifier, Archiver)

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
