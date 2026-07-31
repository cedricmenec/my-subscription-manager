## MODIFIED Requirements

### Requirement: Dialogue modal de création et d'édition d'abonnement

L'application SHALL fournir un dialogue modal de création et d'édition structuré en sections fonctionnelles. La section générale SHALL poser la question « Comment l'abonnement se poursuit-il ? » avec les choix `ROLLING`, `AUTOMATIC` et `UNKNOWN`, sans recopier implicitement le cycle de facturation dans le cycle d'engagement. L'option `MANUAL` n'existe plus.

#### Scenario: Ouverture du dialogue pour création

- **WHEN** l'utilisateur clique sur « Nouvel abonnement »
- **THEN** un dialogue s'ouvre avec le formulaire vide et le titre « Créer un abonnement »
- **AND** le focus est placé sur le premier champ

#### Scenario: Ouverture du dialogue pour édition

- **WHEN** l'utilisateur clique sur « Modifier »
- **THEN** le dialogue s'ouvre pré-rempli avec le titre « Modifier un abonnement »

#### Scenario: Structure en sections du formulaire

- **WHEN** le dialogue est ouvert
- **THEN** il présente Général, Cycle de facturation, Engagement, Pause, Fin de service, URLs et Notes
- **AND** la facturation et l'engagement sont présentés comme deux concepts indépendants dans une section « Engagement » unique (fusion des anciennes sections Continuation et Engagement)

#### Scenario: Cycle de facturation avec presets

- **WHEN** `billingIntervalCount=1` et `billingIntervalUnit=MONTH`
- **THEN** le sélecteur affiche « Mensuel »
- **WHEN** l'utilisateur sélectionne « Personnalisé »
- **THEN** quantité et unité deviennent modifiables avec un récapitulatif permanent

#### Scenario: Engagement conditionnel

- **WHEN** l'utilisateur sélectionne « Renouvellement automatique » comme mode de continuation
- **THEN** la section Engagement affiche quantité, unité et date de début (`commitmentStartDate`)
- **AND** les champs quantité/unité ne sont pas pré-remplis depuis le cycle de facturation
- **AND** `commitmentStartDate` est initialisé avec la valeur de `startDate` (ou de `subscriptionDate` si absent)
- **WHEN** l'utilisateur sélectionne « Reconduction continue »
- **THEN** la section Engagement est masquée et ses champs réinitialisés

#### Scenario: Calcul du prochain renouvellement

- **WHEN** le formulaire contient `renewalMode=AUTOMATIC`
- **THEN** `nextRenewalDate` est présentée comme calculée automatiquement et non modifiable
- **AND** une valeur existante est affichée en lecture seule

#### Scenario: Aperçu de l'exposition financière

- **WHEN** le formulaire contient `renewalMode=AUTOMATIC` avec `commitmentInterval`, `billingInterval` et `currentPrice` renseignés
- **THEN** un badge affiche le montant total en jeu sur la durée de l'engagement (ex: « 180 € en jeu »)
- **WHEN** l'un de ces champs est manquant
- **THEN** le badge n'est pas affiché

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
- **THEN** les champs d'engagement sont masqués
- **AND** ils sont nettoyés lors de la sauvegarde
- **AND** les champs de facturation ne sont pas modifiés

#### Scenario: Renouvellement automatique à date fixe

- **WHEN** l'utilisateur sélectionne « Renouvellement automatique »
- **THEN** la section Engagement apparaît avec cycle, date de souscription, début de période et prochaine date calculée
- **AND** le cycle d'engagement n'est pas initialisé depuis le cycle de facturation

### Requirement: Contrainte de cohérence nextChargeDate

L'application SHALL empêcher la soumission si `nextChargeDate > nextRenewalDate` dès que `hasEngagement` est vrai, indépendamment du rapport entre `commitmentInterval` et `billingInterval`. Elle SHALL ne pas appliquer cette contrainte à `ROLLING` ou à tout abonnement sans engagement, qui ne possède pas de `nextRenewalDate`.

#### Scenario: Validation de cohérence des dates

- **WHEN** l'utilisateur tente d'enregistrer un abonnement ACTIVE avec `renewalMode=AUTOMATIC`
- **AND** `nextChargeDate` > `nextRenewalDate`
- **THEN** la validation échoue
- **AND** un message d'erreur "La prochaine échéance ne peut pas être après la date de renouvellement" est affiché

#### Scenario: Validation appliquée même si les intervalles coïncident

- **WHEN** `commitmentInterval == billingInterval` (ex: engagement annuel, facturation annuelle)
- **AND** `nextChargeDate` > `nextRenewalDate`
- **THEN** la validation échoue de la même façon que pour tout engagement, sans exception liée à l'égalité des intervalles

#### Scenario: Reconduction continue non bornée par le renouvellement

- **WHEN** `renewalMode=ROLLING`
- **THEN** la validation ne compare pas la prochaine facturation à une date de renouvellement
- **AND** le formulaire peut être soumis si les autres règles sont satisfaites
