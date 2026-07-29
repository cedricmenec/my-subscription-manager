## ADDED Requirements

### Requirement: Registre de calculateurs et graphe de dépendances

Le moteur de calcul SHALL exposer un registre de calculateurs identifiés par un id stable, chacun déclarant une liste explicite de dépendances (`dependsOn`), et SHALL exécuter les calculateurs demandés dans l'ordre de leurs dépendances (tri topologique incluant les dépendances transitives).

#### Scenario: Exécution respectant une dépendance déclarée

- **WHEN** un run est demandé pour un calculateur qui dépend d'un autre calculateur du registre
- **THEN** le moteur exécute d'abord la dépendance
- **AND** exécute ensuite le calculateur demandé

#### Scenario: Dépendance manquante détectée à l'initialisation

- **WHEN** un calculateur déclare une dépendance vers un id absent du registre
- **THEN** le moteur rejette l'initialisation avec une erreur explicite désignant le calculateur et la dépendance manquante

### Requirement: Sélection des calculateurs à exécuter

Le moteur de calcul SHALL permettre d'exécuter soit l'intégralité du registre, soit un sous-ensemble explicite de calculateurs désignés par leurs ids.

#### Scenario: Exécution complète du registre

- **WHEN** un run est déclenché sans sélection explicite de calculateurs
- **THEN** tous les calculateurs du registre sont exécutés dans l'ordre du graphe de dépendances

#### Scenario: Exécution ciblée sur une sélection

- **WHEN** un run est déclenché avec une liste explicite d'ids de calculateurs
- **THEN** seuls ces calculateurs et leurs dépendances transitives sont exécutés
- **AND** les calculateurs du registre non sélectionnés et non requis comme dépendance ne sont pas exécutés

### Requirement: Déclenchement par mutation de données

Le moteur de calcul SHALL déclencher un run lorsqu'une création, modification ou suppression survient sur les tables `subscriptions`, `payments` ou `settings`, que l'écriture provienne d'une action locale ou d'une synchronisation Dexie Cloud entrante.

#### Scenario: Modification locale déclenche un run

- **WHEN** un abonnement est modifié localement (par exemple son prix courant)
- **THEN** le moteur planifie un run couvrant les calculateurs concernés par cette table

#### Scenario: Changement reçu par synchronisation déclenche un run

- **WHEN** une modification d'abonnement ou de paiement est reçue par synchronisation Dexie Cloud depuis un autre appareil
- **THEN** le moteur planifie un run de la même façon que pour une modification locale

#### Scenario: Écriture émise par le moteur ne provoque pas de boucle

- **WHEN** un calculateur écrit son propre résultat dans une table surveillée par les triggers de mutation
- **THEN** cette écriture ne déclenche pas un nouveau run en boucle sur ce même résultat

### Requirement: Déclenchement au démarrage, périodique et par péremption

Le moteur de calcul SHALL supporter un déclenchement au démarrage de l'application, un déclenchement périodique configurable, et un déclenchement par péremption comparant le temps écoulé depuis le dernier run complet réussi à un seuil global configuré.

#### Scenario: Recalcul complet au démarrage

- **WHEN** l'application démarre
- **THEN** le moteur exécute un run complet du registre

#### Scenario: Recalcul périodique

- **WHEN** une minuterie périodique est configurée avec un intervalle donné
- **THEN** le moteur exécute un run complet à chaque expiration de cet intervalle tant que l'application reste ouverte

#### Scenario: Recalcul déclenché par péremption globale

- **WHEN** le temps écoulé depuis le dernier run complet réussi dépasse le seuil global configuré
- **THEN** le moteur exécute un run complet au prochain point de contrôle (démarrage ou tick de minuterie)

### Requirement: Déclenchement manuel

Le moteur de calcul SHALL exposer une API de déclenchement manuel, invocable depuis une action utilisateur ou de façon programmatique, capable de lancer l'intégralité du registre ou une sélection, et SHALL exposer un état "en cours d'exécution" observable pendant le run.

#### Scenario: Déclenchement manuel complet

- **WHEN** un déclenchement manuel complet est invoqué
- **THEN** le moteur exécute tous les calculateurs du registre
- **AND** un état "en cours" est observable depuis le déclenchement jusqu'à la fin du run

### Requirement: Anti-tempête (debounce) des déclenchements rapprochés

Le moteur de calcul SHALL coalescer plusieurs déclenchements de type mutation survenant dans une fenêtre de temps rapprochée en un seul run, et SHALL journaliser distinctement les déclenchements ainsi absorbés.

#### Scenario: Import en masse coalescé en un seul run

- **WHEN** une opération en masse (import CSV, restauration de snapshot) crée ou modifie plusieurs enregistrements en une fraction de seconde
- **THEN** le moteur exécute un seul run consolidé plutôt qu'un run par enregistrement modifié
- **AND** les déclenchements absorbés apparaissent dans l'historique d'exécution comme sautés par anti-tempête

### Requirement: Persistance des résultats selon leur nature métier

Les calculateurs qui produisent une donnée métier partagée entre appareils SHALL persister leur résultat dans la table synchronisée existante correspondante ; les calculateurs qui produisent une donnée dérivée purement interne au moteur (sans valeur métier propre) SHALL persister leur résultat dans une table locale exclue de la synchronisation Dexie Cloud.

#### Scenario: Paiements projetés restent une donnée métier synchronisée

- **WHEN** le calculateur de projection des paiements s'exécute
- **THEN** son résultat est écrit dans la table synchronisée des paiements avec le statut `PROJECTED` et la source `GENERATED`
- **AND** ce comportement reste identique à celui existant avant l'introduction du moteur

#### Scenario: Donnée interne au moteur non synchronisée

- **WHEN** le moteur enregistre l'horodatage du dernier run réussi ou une donnée agrégée purement interne à son fonctionnement
- **THEN** cette donnée est stockée dans une table locale explicitement exclue de la synchronisation Dexie Cloud

### Requirement: Historique d'exécution observable

Chaque run SHALL être journalisé avec son déclencheur d'origine, le statut et la durée de chaque calculateur exécuté, et la durée totale du run, dans le journal de diagnostic existant de l'application ; cet historique SHALL rester consultable via une lecture réactive, sans nécessiter d'abonnement à un mécanisme d'événement dédié.

#### Scenario: Consultation de l'historique après un run

- **WHEN** un run se termine, qu'il soit réussi, en erreur, ou partiellement sauté par anti-tempête
- **THEN** une entrée correspondante est visible dans l'historique d'exécution avec le déclencheur, la durée par calculateur et la durée totale
- **AND** l'historique se met à jour automatiquement sans action manuelle de rafraîchissement

### Requirement: Vue de débogage du graphe de dépendances

Le moteur de calcul SHALL exposer une liste textuelle structurée des calculateurs enregistrés et de leurs dépendances déclarées, à des fins de débogage, sans nécessiter de rendu graphique dans cette itération.

#### Scenario: Consultation du graphe déclaré

- **WHEN** un développeur consulte la vue de débogage du moteur
- **THEN** la liste des calculateurs enregistrés est affichée avec, pour chacun, la liste de ses dépendances directes
- **AND** aucun rendu graphique n'est requis pour satisfaire ce besoin
