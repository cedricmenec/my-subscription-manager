## MODIFIED Requirements

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

#### Scenario: Reconduction continue

- **WHEN** l'utilisateur sélectionne « Reconduction continue »
- **THEN** les champs de renouvellement contractuel sont masqués
- **AND** ils sont nettoyés lors de la sauvegarde
- **AND** les champs de facturation et d'engagement ne sont pas modifiés

#### Scenario: Renouvellement contractuel automatique

- **WHEN** l'utilisateur sélectionne « Renouvellement automatique à date fixe »
- **THEN** la section contractuelle apparaît avec cycle, date de souscription, début de période et prochaine date calculée
- **AND** le cycle contractuel n'est pas initialisé depuis le cycle de facturation

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

### Requirement: Contrainte de cohérence nextChargeDate

L'application SHALL empêcher la soumission si `nextChargeDate > nextRenewalDate` pour un renouvellement contractuel distinct. Elle SHALL ne pas appliquer cette contrainte à `ROLLING`, qui ne possède pas de `nextRenewalDate`.

#### Scenario: Validation de cohérence des dates contractuelles

- **WHEN** un abonnement à renouvellement contractuel a `nextChargeDate > nextRenewalDate`
- **THEN** la validation échoue avec un message explicite

#### Scenario: Reconduction continue non bornée par le renouvellement

- **WHEN** `renewalMode=ROLLING`
- **THEN** la validation ne compare pas la prochaine facturation à une date de renouvellement
- **AND** le formulaire peut être soumis si les autres règles sont satisfaites
