## Purpose

Définir le modèle `Subscription` et ses comportements associés (CRUD, validation, statuts, cycles), conformément à la spécification métier.
## Requirements
### Requirement: Modèle abonnement v2 structuré

L'application SHALL persister un modèle `Subscription` couvrant au minimum `name`, `status`, `renewalMode`, `currentPrice`, `billingInterval`, `nextChargeDate`, `subscriptionDate`, `managementUrl`, `cancellationUrl`, `cancellationInstructions`, `notes` et les dates de cycle de vie utiles au lot, conformément à la section 13.2 et RG-DAT-006. Le modèle SHALL porter des champs structurés séparant uniquement `billingInterval` (cadence de facturation) et `commitmentInterval` (durée d'engagement renouvelée à échéance), ce dernier faisant office à la fois d'ancienne notion d'engagement informatif et d'ancien `renewalInterval` contractuel. Les champs `renewalIntervalUnit`, `renewalIntervalCount` et `renewalPeriodStartDate` SHALL être supprimés du modèle ; `commitmentIntervalUnit`, `commitmentIntervalCount` et `commitmentStartDate` SHALL être les seuls champs portant la durée et l'ancre de l'engagement. Le champ `currentPrice` est exprimé en unités de la devise (ex: 15.00 pour 15 €). Le champ `currentPriceMinor` a été supprimé. Le champ `renewalStartDate` est renommé en `subscriptionDate`.

#### Scenario: Création avec dates civiles

- **WHEN** l'utilisateur crée un abonnement avec des dates contractuelles
- **THEN** les dates sont persistées au format civil `YYYY-MM-DD`
- **AND** aucune conversion implicite de fuseau n'est appliquée

#### Scenario: Abonnement avec engagement distinct de la facturation

- **WHEN** un abonnement est facturé mensuellement avec un engagement annuel
- **THEN** l'application persiste séparément `billingInterval` (MONTH) et `commitmentInterval` (YEAR)
- **AND** les calculs financiers peuvent s'appuyer sur ces deux champs sans ambiguïté

#### Scenario: Prix en unités de devise (phase 2)

- **WHEN** l'utilisateur enregistre un abonnement avec un prix en unités de devise
- **THEN** `currentPrice` est le seul champ de prix stocké
- **AND** le champ legacy `currentPriceMinor` n'est ni lu ni écrit

#### Scenario: Renommage renewalStartDate → subscriptionDate

- **WHEN** un abonnement existant utilisait le champ `renewalStartDate`
- **THEN** le nouveau champ `subscriptionDate` le remplace
- **AND** la migration Dexie copie `renewalStartDate` → `subscriptionDate`
- **AND** le champ `renewalStartDate` est supprimé de la base

#### Scenario: Absence des champs de renouvellement séparés

- **WHEN** un développeur consulte l'interface `Subscription`
- **THEN** aucun champ `renewalIntervalUnit`, `renewalIntervalCount` ni `renewalPeriodStartDate` n'existe
- **AND** `commitmentIntervalUnit`, `commitmentIntervalCount` et `commitmentStartDate` portent seuls la notion d'engagement/renouvellement

### Requirement: Statuts métier et renouvellement tri-état

L'application SHALL gérer les statuts `TRIAL`, `ACTIVE`, `PAUSED`, `CANCELLED_PENDING_END`, `ENDED`, `UNKNOWN` et les modes de continuation `ROLLING`, `AUTOMATIC`, `UNKNOWN`. La présence d'un engagement SHALL être déterminée exclusivement par la présence de `commitmentIntervalUnit` et `commitmentIntervalCount` (fonction `hasEngagement`), indépendamment de tout rapport avec `billingInterval`. `renewalMode=ROLLING` SHALL impliquer l'absence de `commitmentInterval` ; `renewalMode=AUTOMATIC` SHALL impliquer sa présence. Le mode `MANUAL` n'existe plus.

#### Scenario: Changement de statut vers pause

- **WHEN** l'utilisateur passe un abonnement en statut `PAUSED`
- **THEN** le statut est enregistré localement immédiatement
- **AND** la fiche affiche explicitement l'information de pause et sa date de fin si renseignée

#### Scenario: Reconduction continue explicite

- **WHEN** un service se poursuit jusqu'à résiliation sans engagement distinct
- **THEN** `renewalMode` vaut `ROLLING`
- **AND** `commitmentIntervalUnit` et `commitmentIntervalCount` sont absents

#### Scenario: Engagement annuel avec facturation annuelle reconnu comme engagement réel

- **WHEN** un abonnement a `billingIntervalUnit=YEAR`, `commitmentIntervalUnit=YEAR` et `renewalMode=AUTOMATIC`
- **THEN** l'engagement est traité comme réel (`hasEngagement=true`)
- **AND** ce traitement ne dépend pas du fait que `commitmentInterval` soit égal à `billingInterval`

#### Scenario: Invariant AUTOMATIC implique un engagement défini

- **WHEN** un abonnement a `renewalMode=AUTOMATIC`
- **THEN** `commitmentIntervalUnit` et `commitmentIntervalCount` sont tous deux définis
- **AND** si l'un des deux est absent, l'abonnement est traité comme incomplet plutôt que comme un engagement valide

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

L'application SHALL calculer un indicateur de complétude basé sur les champs critiques (`name`, `status`, `price`, `currency`, `billingInterval`, `nextChargeDate`, `renewalMode`) et SHALL exposer une vue « À compléter », conformément à FUN-11.8. Le champ `subscriptionDate` remplace `renewalStartDate` dans la liste des champs optionnels de la fiche mais n'entre pas dans le score de complétude.

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

### Requirement: Champ subscriptionDate modifiable

L'application SHALL persister un champ `subscriptionDate` (date civile, `YYYY-MM-DD`) représentant la date de souscription initiale au service. Ce champ est renseigné à la création de l'abonnement et peut être modifié ultérieurement. Il sert d'ancre de secours pour le calcul de `nextRenewalDate` si `commitmentStartDate` est absent.

#### Scenario: Création avec subscriptionDate

- **WHEN** l'utilisateur crée un abonnement et renseigne la date de souscription
- **THEN** `subscriptionDate` est persisté au format civil `YYYY-MM-DD`
- **AND** le champ peut être modifié ultérieurement via l'UI d'édition

#### Scenario: subscriptionDate absent à la création

- **WHEN** l'utilisateur crée un abonnement sans renseigner `subscriptionDate`
- **THEN** le champ reste `undefined` en base
- **AND** le calcul de `nextRenewalDate` utilisera `commitmentStartDate` comme ancre prioritaire, ou échouera si les deux sont absents

### Requirement: Gate nextChargeDate ≤ nextRenewalDate

La validation d'un abonnement SHALL vérifier que `nextChargeDate` n'est pas postérieure à `nextRenewalDate` dès que `hasEngagement` est vrai (c'est-à-dire dès que `commitmentIntervalUnit`/`commitmentIntervalCount` sont définis) et que les deux dates sont renseignées, indépendamment du rapport entre `commitmentInterval` et `billingInterval`. En l'absence d'engagement, cette gate SHALL être ignorée et `nextRenewalDate` SHALL rester absente.

#### Scenario: nextChargeDate après nextRenewalDate → rejet

- **WHEN** l'utilisateur saisit `nextChargeDate=2026-09-15` et `nextRenewalDate=2026-08-15` sur un abonnement avec engagement
- **THEN** la validation échoue
- **AND** un message d'erreur indique que la prochaine échéance ne peut pas être après la date de renouvellement

#### Scenario: nextChargeDate avant nextRenewalDate → accepté

- **WHEN** l'utilisateur saisit `nextChargeDate=2026-07-15` et `nextRenewalDate=2026-08-15`
- **THEN** la validation réussit

#### Scenario: nextRenewalDate non défini → pas de gate

- **WHEN** `nextRenewalDate` n'est pas défini
- **THEN** aucune règle de gate n'est appliquée sur `nextChargeDate`
- **AND** la validation ne rejette pas l'abonnement pour ce motif

#### Scenario: Engagement annuel/annuel soumis à la gate

- **WHEN** un abonnement a `billingIntervalUnit=commitmentIntervalUnit=YEAR` et `nextChargeDate=2026-09-15`, `nextRenewalDate=2026-08-15`
- **THEN** la validation échoue avec le même message que pour tout engagement, sans exception liée à l'égalité des intervalles

### Requirement: Champ renewalPeriodStartDate ajustable

L'application SHALL persister un champ `renewalPeriodStartDate` (date civile, `YYYY-MM-DD`) représentant le début de la période de renouvellement en cours. Ce champ est initialisé à la valeur de `subscriptionDate` (ou à la date de création si absent), et peut être ajusté manuellement par l'utilisateur (ex. mois offert par le fournisseur).

#### Scenario: Initialisation automatique du champ

- **WHEN** un abonnement est créé en renouvellement automatique avec `subscriptionDate=2026-01-15`
- **THEN** `renewalPeriodStartDate` est initialisé à `2026-01-15`

#### Scenario: Ajustement manuel

- **WHEN** l'utilisateur modifie `renewalPeriodStartDate` pour le passer de `2026-01-15` à `2026-02-15` (mois offert)
- **THEN** la valeur est persistée
- **AND** le prochain calcul de `nextRenewalDate` utilisera `2026-02-15` comme ancre

### Requirement: Champs d'alerte notifyBeforeRenewal

L'application SHALL persister deux champs d'alerte sur le modèle `Subscription` :
- `notifyBeforeRenewal` (boolean) : indique si une alerte doit être envoyée avant le prochain renouvellement
- `notifyBeforeRenewalDays` (number) : nombre de jours avant le renouvellement pour déclencher l'alerte

Ces champs sont renseignés par le calculateur `next-renewal-date` avec des valeurs par défaut, et peuvent être modifiés par l'utilisateur via l'UI (ultérieurement, hors scope de ce lot).

#### Scenario: Persistance des champs d'alerte

- **WHEN** le calculateur `next-renewal-date` s'exécute et détermine `notifyBeforeRenewal=true` et `notifyBeforeRenewalDays=30`
- **THEN** ces valeurs sont persistées sur l'abonnement
- **AND** les champs sont synchronisés via Dexie Cloud

### Requirement: Migration Dexie des champs de renouvellement

La migration Dexie SHALL copier `renewalStartDate` → `subscriptionDate`, ajouter `renewalPeriodStartDate` (initialisé avec la valeur de `subscriptionDate`), ajouter `notifyBeforeRenewal` et `notifyBeforeRenewalDays` (undefined en attendant le premier run du calculateur), et supprimer le champ `renewalStartDate`.

#### Scenario: Migration des abonnements existants

- **WHEN** la base existante contient des abonnements avec `renewalStartDate` renseigné
- **THEN** la migration copie la valeur dans `subscriptionDate`
- **AND** `renewalPeriodStartDate` est initialisé avec la même valeur
- **AND** `renewalStartDate` est supprimé du schéma
- **AND** `notifyBeforeRenewal` et `notifyBeforeRenewalDays` sont ajoutés avec valeur `undefined`

#### Scenario: Abonnement sans renewalStartDate legacy

- **WHEN** la base existante contient des abonnements sans `renewalStartDate`
- **THEN** `subscriptionDate` reste `undefined`
- **AND** `renewalPeriodStartDate` reste `undefined`
- **AND** ces abonnements seront traités par le calculateur sans ancre (pas de calcul possible)

### Requirement: Invariants des modes de continuation

Le système SHALL nettoyer les champs de renouvellement contractuel incompatibles avec `ROLLING` et SHALL préserver l'indépendance entre cycle de facturation, engagement et renouvellement contractuel.

#### Scenario: Passage à la reconduction continue

- **WHEN** un abonnement est sauvegardé avec `renewalMode=ROLLING`
- **THEN** `renewalIntervalCount`, `renewalIntervalUnit`, `renewalPeriodStartDate`, `nextRenewalDate`, `notifyBeforeRenewal` et `notifyBeforeRenewalDays` sont absents
- **AND** les champs de facturation et d'engagement sont conservés
- **AND** aucun paiement réel ou corrigé n'est modifié

#### Scenario: Donnée incomplète non interprétée

- **WHEN** `renewalMode=UNKNOWN` et les champs de renouvellement sont absents
- **THEN** le système ne transforme pas implicitement l'abonnement en `ROLLING`

### Requirement: Migration locale des reconductions continues

La migration Dexie SHALL convertir de manière idempotente les abonnements automatiques manifestement continus vers `ROLLING`, sans nouvelle table et sans perte locale.

#### Scenario: Cas legacy déterministe migré

- **WHEN** un abonnement `AUTOMATIC` non annuel a des intervalles de facturation et renouvellement égaux
- **AND** `nextChargeDate` et `nextRenewalDate` sont renseignées et égales
- **THEN** la migration positionne `renewalMode=ROLLING`
- **AND** nettoie les champs de renouvellement contractuel
- **AND** laisse intacts l'abonnement, sa facturation, son engagement et ses paiements

#### Scenario: Cas ambigu conservé

- **WHEN** un abonnement ne satisfait pas tous les critères déterministes
- **THEN** son mode n'est pas modifié automatiquement
- **AND** le diagnostic le signale pour revue lorsque ses données sont incohérentes

#### Scenario: Migration hors connexion et répétée

- **WHEN** la migration s'exécute hors connexion ou sur un enregistrement déjà migré
- **THEN** l'état local final est identique
- **AND** aucune écriture supplémentaire n'est produite pour l'enregistrement déjà conforme

### Requirement: Migration Dexie v6 — fusion engagement/renouvellement

La base Dexie SHALL migrer vers la version 6 en fusionnant les champs de renouvellement contractuel dans les champs d'engagement et en éliminant le mode `MANUAL`, conformément aux règles suivantes :
- `renewalIntervalUnit`/`renewalIntervalCount` sont copiés vers `commitmentIntervalUnit`/`commitmentIntervalCount` s'ils sont absents, puis supprimés.
- `renewalPeriodStartDate` est copié vers `commitmentStartDate` s'il est absent, puis supprimé.
- `renewalMode=MANUAL` est requalifié `AUTOMATIC` si un engagement est reconstituable, sinon `UNKNOWN`.
- Les abonnements `AUTOMATIC` legacy avec `billingIntervalUnit == renewalIntervalUnit` et `billingIntervalCount == renewalIntervalCount` sont normalisés : `commitmentInterval*` vidé et `renewalMode=ROLLING` si l'unité n'est pas `YEAR` ; `commitmentInterval*` conservé et `renewalMode=AUTOMATIC` si l'unité est `YEAR`.
- Chaque abonnement migré de façon ambiguë ou dégradée écrit un log de diagnostic dans `diagnosticLogs` permettant une revue manuelle a posteriori.

#### Scenario: Fusion simple sans ambiguïté

- **WHEN** un abonnement a `renewalMode=AUTOMATIC`, `renewalIntervalUnit=MONTH`, `renewalIntervalCount=1`, `renewalPeriodStartDate=2026-01-15`, et aucun `commitmentInterval` préexistant
- **THEN** après migration, `commitmentIntervalUnit=MONTH`, `commitmentIntervalCount=1`, `commitmentStartDate=2026-01-15`
- **AND** `renewalIntervalUnit`, `renewalIntervalCount`, `renewalPeriodStartDate` n'existent plus sur l'enregistrement

#### Scenario: Cas ambigu non-annuel normalisé en ROLLING

- **WHEN** un abonnement legacy a `renewalMode=AUTOMATIC`, `billingIntervalUnit=MONTH`, `renewalIntervalUnit=MONTH`, mêmes counts
- **THEN** après migration, `renewalMode=ROLLING`
- **AND** `commitmentIntervalUnit`/`commitmentIntervalCount` sont absents
- **AND** un log de diagnostic de migration est écrit pour cet abonnement

#### Scenario: Cas ambigu annuel préservé comme engagement

- **WHEN** un abonnement legacy a `renewalMode=AUTOMATIC`, `billingIntervalUnit=YEAR`, `renewalIntervalUnit=YEAR`, mêmes counts
- **THEN** après migration, `renewalMode=AUTOMATIC`, `commitmentIntervalUnit=YEAR`, `commitmentIntervalCount` correspondant
- **AND** un log de diagnostic de migration signale la préservation de cet engagement

#### Scenario: Mode MANUAL sans données suffisantes

- **WHEN** un abonnement a `renewalMode=MANUAL` sans `renewalIntervalUnit` ni `renewalPeriodStartDate` ni `subscriptionDate`
- **THEN** après migration, `renewalMode=UNKNOWN`
- **AND** un log de diagnostic de migration signale la dégradation

