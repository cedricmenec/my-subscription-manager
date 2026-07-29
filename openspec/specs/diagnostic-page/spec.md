# diagnostic-page Specification

## Purpose
Fournir une page applicative dédiée aux outils de diagnostic du moteur de calcul et de la synchronisation, permettant le troubleshooting visuel des boucles de recalcul et de la consommation du quota Dexie Cloud.

## Requirements

### Requirement: Page Diagnostic accessible depuis la navigation

Le système SHALL fournir une page « Diagnostic » accessible depuis la barre de navigation principale de l'application, au même titre que les pages Dashboard, Abonnements, Paiements, Paramètres et Données.

#### Scenario: Navigation vers la page Diagnostic

- **WHEN** l'utilisateur clique sur l'onglet « Diagnostic » dans la barre de navigation
- **THEN** la page Diagnostic s'affiche
- **AND** l'URL contient le fragment `#/diagnostic`

### Requirement: Jauge du quota de synchronisation

La page Diagnostic SHALL afficher une jauge visuelle du nombre de synchronisations Dexie Cloud effectuées dans les 5 dernières minutes, avec le seuil du plan gratuit (50 syncs) comme référence.

#### Scenario: Affichage de la jauge de synchronisation

- **WHEN** l'utilisateur consulte la page Diagnostic
- **THEN** une jauge visuelle indique le nombre de syncs utilisées / 50
- **AND** la jauge change de couleur en fonction du niveau d'utilisation (vert < 50%, orange < 80%, rouge >= 80%)

### Requirement: Timeline des exécutions du moteur de calcul

La page Diagnostic SHALL afficher une timeline des exécutions récentes du moteur de calcul, avec pour chaque exécution le déclencheur, la durée, le statut et le détail des calculateurs exécutés.

#### Scenario: Affichage de la timeline

- **WHEN** l'utilisateur consulte la page Diagnostic
- **THEN** les 20 dernières exécutions du moteur de calcul sont affichées dans une liste chronologique
- **AND** chaque entrée affiche l'heure, le déclencheur, la durée totale, le statut
- **AND** les entrées avec une durée anormalement longue (> 1000ms) sont mises en évidence

### Requirement: Impact en écritures par run

La page Diagnostic SHALL afficher, pour chaque run du moteur de calcul, le nombre d'écritures (DELETE et CREATE) effectuées dans la table `payments`, permettant de visualiser l'impact de l'idempotence.

#### Scenario: Visualisation de l'impact

- **WHEN** un run du moteur de calcul s'est exécuté
- **THEN** le nombre de DELETEs et CREATEs effectués est affiché
- **AND** un run avec zéro écriture est clairement identifié comme « idempotent »

### Requirement: Statut du circuit breaker

La page Diagnostic SHALL afficher le statut actuel du circuit breaker : actif ou inactif, le seuil configuré, et l'heure de début du blocage si actif.

#### Scenario: Circuit breaker inactif

- **WHEN** le circuit breaker est inactif
- **THEN** un indicateur vert « Inactif » est affiché avec le seuil configuré
- **AND** aucun blocage en cours n'est signalé

#### Scenario: Circuit breaker actif

- **WHEN** le circuit breaker est actif (blocage des runs mutation)
- **THEN** un indicateur rouge « Bloqué » est affiché
- **AND** l'heure de début et l'heure de fin estimée du blocage sont affichées
- **AND** le nombre de runs mutation détectés est affiché

### Requirement: Identité de l'instance locale

La page Diagnostic SHALL afficher l'identifiant unique de l'instance locale (généré au démarrage de l'application), permettant de distinguer les logs provenant de différentes instances.

#### Scenario: Affichage de l'ID d'instance

- **WHEN** l'utilisateur consulte la page Diagnostic
- **THEN** l'ID unique de l'instance locale est affiché
- **AND** le nombre de runs émis par cette instance est affiché
- **AND** la date de démarrage de l'instance est affichée