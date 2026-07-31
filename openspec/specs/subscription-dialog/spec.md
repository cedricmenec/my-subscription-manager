## Purpose

Définir les exigences pour le dialogue modal de création et d'édition des abonnements, structuré en sections, réutilisable depuis la liste et le dashboard.
## Requirements

### Requirement: Dialogue modal de création et d'édition d'abonnement

L'application SHALL fournir un dialogue modal de création et d'édition structuré en sections fonctionnelles. La section générale SHALL poser la question « Comment l'abonnement se poursuit-il ? » avec les choix `ROLLING`, `AUTOMATIC`, `MANUAL` et `UNKNOWN`, sans recopier implicitement le cycle de facturation dans le cycle de renouvellement.

#### Scenario: Ouverture du dialogue pour création

- **WHEN** l'utilisateur clique sur « Nouvel abonnement »
- **THEN** un dialogue s'ouvre avec le formulaire vide et le titre « Créer un abonnement »
- **AND** le focus est placé sur le premier champ

#### Scenario: Ouverture du dialogue pour édition

- **WHEN** l'utilisateur clique sur « Modifier »
- **THEN** le dialogue s'ouvre pré-rempli avec le titre « Modifier un abonnement »

#### Scenario: Structure en sections du formulaire

- **WHEN** le dialogue est ouvert
- **THEN** il présente Général, Cycle de facturation, Continuation, Engagement, Pause, Fin de service, URLs et Notes
- **AND** la facturation, l'engagement et le renouvellement contractuel sont présentés comme des concepts indépendants

#### Scenario: Cycle de facturation avec presets

- **WHEN** `billingIntervalCount=1` et `billingIntervalUnit=MONTH`
- **THEN** le sélecteur affiche « Mensuel »
- **WHEN** l'utilisateur sélectionne « Personnalisé »
- **THEN** quantité et unité deviennent modifiables avec un récapitulatif permanent

#### Scenario: Renouvellement conditionnel

- **WHEN** l'utilisateur sélectionne "Automatique" comme mode de renouvellement
- **THEN** la section Renouvellement apparaît
- **AND** les champs quantité/unité sont initialisés avec les valeurs du cycle de facturation
- **AND** `renewalPeriodStartDate` est initialisé avec la valeur de `startDate` (ou de `subscriptionDate` si absent)
- **WHEN** l'utilisateur modifie les champs de la section renouvellement
- **THEN** les valeurs surchargent l'initialisation par défaut

#### Scenario: Calcul du prochain renouvellement

- **WHEN** le formulaire contient `renewalMode=AUTOMATIC`
- **THEN** `nextRenewalDate` est présentée comme calculée automatiquement et non modifiable
- **AND** une valeur existante est affichée en lecture seule

#### Scenario: Engagement conditionnel

- **WHEN** l'utilisateur sélectionne « Avec engagement »
- **THEN** durée, début et fin informative sont affichés
- **WHEN** il sélectionne « Sans engagement »
- **THEN** la section est masquée et ses champs réinitialisés

#### Scenario: Validation et soumission

- **WHEN** l'utilisateur clique sur « Sauvegarder et Fermer »
- **THEN** les validations métier sont appliquées et affichées sous les champs
- **AND** une saisie valide est persistée localement, le dialogue fermé et la liste rafraîchie

#### Scenario: Fermeture du dialogue sans modification

- **WHEN** l'utilisateur annule sans modification
- **THEN** le dialogue se ferme sans sauvegarde et le formulaire est réinitialisé

#### Scenario: Fermeture du dialogue avec modifications en cours

- **WHEN** l'utilisateur annule avec des modifications
- **THEN** une confirmation est demandée et les modifications restent présentes s'il refuse

#### Scenario: Fermeture par clic sur l'arrière-plan

- **WHEN** l'utilisateur clique hors du dialogue sans modification
- **THEN** le dialogue se ferme sans sauvegarde

#### Scenario: Clic sur l'arrière-plan avec modifications en cours

- **WHEN** l'utilisateur clique hors du dialogue avec des modifications
- **THEN** le dialogue reste ouvert et conserve les modifications

#### Scenario: Reconduction continue

- **WHEN** l'utilisateur sélectionne « Reconduction continue »
- **THEN** les champs de renouvellement contractuel sont masqués
- **AND** ils sont nettoyés lors de la sauvegarde
- **AND** les champs de facturation et d'engagement ne sont pas modifiés

#### Scenario: Renouvellement contractuel automatique

- **WHEN** l'utilisateur sélectionne « Renouvellement automatique à date fixe »
- **THEN** la section contractuelle apparaît avec cycle, date de souscription, début de période et prochaine date calculée
- **AND** le cycle contractuel n'est pas initialisé depuis le cycle de facturation

### Requirement: Sauvegarde sans fermeture du dialogue

L'application SHALL fournir un bouton "Sauvegarder" qui persiste la fiche abonnement sans fermer le dialogue, permettant à l'utilisateur de visualiser les résultats des calculs du moteur (prochain renouvellement, échéances) avant de décider de fermer ou de modifier davantage la fiche.

#### Scenario: Sauvegarde sans fermeture en création

- **WHEN** l'utilisateur remplit le formulaire de création
- **AND** clique sur "Sauvegarder"
- **THEN** les validations métier sont appliquées
- **AND** si des erreurs existent, elles sont affichées sous les champs concernés
- **AND** si tout est valide, l'abonnement est créé localement
- **AND** le dialogue reste ouvert
- **AND** le titre du dialogue passe à "Modifier un abonnement"
- **AND** les champs calculés (nextRenewalDate, nextChargeDate) sont mis à jour avec les valeurs persistées
- **AND** un badge "✓ Enregistré à HH:MM" s'affiche temporairement pendant 2 secondes
- **AND** le formulaire est considéré comme "propre" (Annuler ne demande pas de confirmation)

#### Scenario: Sauvegarde sans fermeture en édition

- **WHEN** l'utilisateur modifie des champs en mode édition
- **AND** clique sur "Sauvegarder"
- **THEN** les validations métier sont appliquées
- **AND** si des erreurs existent, elles sont affichées sous les champs concernés
- **AND** si tout est valide, l'abonnement est modifié localement
- **AND** le dialogue reste ouvert
- **AND** les champs calculés sont mis à jour avec les valeurs persistées
- **AND** un badge "✓ Enregistré à HH:MM" s'affiche temporairement pendant 2 secondes
- **AND** le formulaire est considéré comme "propre"

#### Scenario: Badge de confirmation après sauvegarde

- **WHEN** l'utilisateur clique sur "Sauvegarder" (sans fermeture)
- **AND** la sauvegarde réussit
- **THEN** un badge "✓ Enregistré à HH:MM" apparaît dans la zone des boutons d'action
- **AND** le badge disparaît après 2 secondes
- **AND** l'utilisateur peut cliquer sur "Sauvegarder" à nouveau sans attendre la disparition du badge

#### Scenario: Annuler après une sauvegarde sans fermeture

- **WHEN** l'utilisateur a cliqué sur "Sauvegarder" (sans fermeture)
- **AND** aucune modification supplémentaire n'a été apportée
- **AND** l'utilisateur clique sur "Annuler"
- **THEN** la confirmation de modifications en cours n'est PAS demandée
- **AND** le dialogue se ferme
- **AND** les données déjà persistées sont conservées

#### Scenario: Annuler après une sauvegarde puis des modifications

- **WHEN** l'utilisateur a cliqué sur "Sauvegarder" (sans fermeture)
- **AND** modifie à nouveau le formulaire après la sauvegarde
- **AND** clique sur "Annuler"
- **THEN** la confirmation "Voulez-vous vraiment annuler les modifications en cours ?" est affichée
- **AND** si l'utilisateur confirme, le dialogue se ferme sans sauvegarder les modifications non persistées
- **AND** les données déjà persistées (lors de la sauvegarde précédente) sont conservées

### Requirement: Accessibilité du dialogue modal

L'application SHALL respecter les critères d'accessibilité pour le dialogue modal.

#### Scenario: Navigation au clavier
- **WHEN** le dialogue est ouvert
- **THEN** le focus est piégé à l'intérieur du dialogue
- **AND** la touche Tab circule entre les éléments interactifs du dialogue

### Requirement: Contrainte de cohérence nextChargeDate

L'application SHALL empêcher la soumission si `nextChargeDate > nextRenewalDate` pour un renouvellement contractuel distinct. Elle SHALL ne pas appliquer cette contrainte à `ROLLING`, qui ne possède pas de `nextRenewalDate`.

#### Scenario: Validation de cohérence des dates

- **WHEN** l'utilisateur tente d'enregistrer un abonnement ACTIVE avec `renewalMode=AUTOMATIC`
- **AND** `renewalIntervalUnit=billingIntervalUnit` et `renewalIntervalCount=billingIntervalCount`
- **AND** `nextChargeDate` > `nextRenewalDate`
- **THEN** la validation échoue
- **AND** un message d'erreur "La prochaine échéance ne peut pas être après la date de renouvellement" est affiché

#### Scenario: Validation non bloquante si intervalles différents

- **WHEN** `renewalInterval` ≠ `billingInterval` (ex: renouvellement annuel, facturation mensuelle)
- **AND** `nextChargeDate` > `nextRenewalDate`
- **THEN** la validation n'est pas déclenchée
- **AND** le formulaire peut être soumis normalement

#### Scenario: Validation de cohérence des dates contractuelles

- **WHEN** un abonnement à renouvellement contractuel a `nextChargeDate > nextRenewalDate`
- **THEN** la validation échoue avec un message explicite

#### Scenario: Reconduction continue non bornée par le renouvellement

- **WHEN** `renewalMode=ROLLING`
- **THEN** la validation ne compare pas la prochaine facturation à une date de renouvellement
- **AND** le formulaire peut être soumis si les autres règles sont satisfaites
