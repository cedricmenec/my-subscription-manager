# calculation-engine Specification

## Purpose
Moteur de calcul local-first centralisant la recomposition des données dérivées à partir des tables subscriptions, payments et settings. Gère l'idempotence, le circuit breaker anti-boucle, et le déclenchement par mutation/startup/interval/stale-check/manual. Contient les calculateurs `projected-payments` et `next-renewal-date` dans son registre par défaut.
## Requirements
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

Le moteur de calcul SHALL déclencher un run lorsqu'une création, modification ou suppression survient sur les tables `subscriptions`, `payments` ou `settings`, que l'écriture provienne d'une action locale ou d'une synchronisation Dexie Cloud entrante. Le déclenchement SHALL être protégé par un circuit breaker qui empêche les runs mutation excessifs.

#### Scenario: Modification locale déclenche un run

- **WHEN** un abonnement est modifié localement (par exemple son prix courant)
- **THEN** le moteur planifie un run couvrant les calculateurs concernés par cette table

#### Scenario: Changement reçu par synchronisation déclenche un run

- **WHEN** une modification d'abonnement ou de paiement est reçue par synchronisation Dexie Cloud depuis un autre appareil
- **THEN** le moteur planifie un run de la même façon que pour une modification locale

#### Scenario: Écriture émise par le moteur ne provoque pas de boucle

- **WHEN** un calculateur écrit son propre résultat dans une table surveillée par les triggers de mutation
- **THEN** cette écriture ne déclenche pas un nouveau run en boucle sur ce même résultat
- **AND** le circuit breaker protège contre les runs mutation excessifs
- **AND** l'idempotence garantit qu'aucune écriture n'est effectuée si les données sont identiques

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

Le moteur de calcul SHALL coalescer plusieurs déclenchements de type mutation survenant dans une fenêtre de temps rapprochée en un seul run, et SHALL journaliser distinctement les déclenchements ainsi absorbés. Le circuit breaker SHALL compléter ce mécanisme en bloquant les runs mutation excessifs qui dépasseraient le seuil configuré, même après coalescence.

#### Scenario: Import en masse coalescé en un seul run

- **WHEN** une opération en masse (import CSV, restauration de snapshot) crée ou modifie plusieurs enregistrements en une fraction de seconde
- **THEN** le moteur exécute un seul run consolidé plutôt qu'un run par enregistrement modifié
- **AND** les déclenchements absorbés apparaissent dans l'historique d'exécution comme sautés par anti-tempête

#### Scenario: Circuit breaker protège après coalescence

- **WHEN** des runs mutation se produisent de façon répétée même après coalescence par debounce
- **AND** le seuil de 5 runs en 10 secondes est atteint
- **THEN** le circuit breaker bloque les nouveaux runs mutation
- **AND** un log est écrit dans la catégorie `circuit-breaker`

### Requirement: Persistance des résultats selon leur nature métier

Les calculateurs qui produisent une donnée métier partagée entre appareils SHALL persister leur résultat dans la table synchronisée existante correspondante ; les calculateurs qui produisent une donnée dérivée purement interne au moteur (sans valeur métier propre) SHALL persister leur résultat dans une table locale exclue de la synchronisation Dexie Cloud. La matérialisation SHALL être idempotente et différentielle : seules les projections réellement ajoutées, modifiées ou retirées produisent une écriture.

#### Scenario: Paiements projetés restent une donnée métier synchronisée

- **WHEN** le calculateur de projection des paiements s'exécute
- **THEN** son résultat est écrit dans la table synchronisée des paiements avec le statut `PROJECTED` et la source `GENERATED`
- **AND** aucune seconde copie métier n’est écrite dans `calculationState`

#### Scenario: Donnée interne au moteur non synchronisée

- **WHEN** le moteur enregistre l'horodatage du dernier run réussi ou une donnée agrégée purement interne à son fonctionnement
- **THEN** cette donnée est stockée dans une table locale explicitement exclue de la synchronisation Dexie Cloud

#### Scenario: Réconciliation idempotente des projections

- **WHEN** le calculateur `projected-payments` s'exécute pour un abonnement donné
- **THEN** les paiements existants pour cet abonnement sont chargés
- **AND** les nouvelles projections sont calculées
- **AND** si les projections sont identiques aux existants, aucune écriture n'est effectuée
- **AND** si elles diffèrent, seules les créations, mises à jour et suppressions nécessaires sont écrites dans une transaction atomique
- **AND** les échéances corrigées, finalisées, manuelles, importées ou n8n ne sont jamais affectées

#### Scenario: Modification de montant sans changement de date

- **WHEN** un abonnement est modifié uniquement sur le montant
- **THEN** le paiement `GENERATED/PROJECTED` de même date est mis à jour en place
- **AND** son identifiant est conservé
- **AND** aucun DELETE suivi d’un CREATE n’est effectué

### Requirement: Historique d'exécution observable

Chaque run SHALL être journalisé avec son déclencheur d'origine, le statut et la durée de chaque calculateur exécuté, et la durée totale du run, dans le journal de diagnostic existant de l'application ; cet historique SHALL rester consultable via une lecture réactive, sans nécessiter d'abonnement à un mécanisme d'événement dédié.

#### Scenario: Consultation de l'historique après un run

- **WHEN** un run se termine, qu'il soit réussi, en erreur, ou partiellement sauté par anti-tempête
- **THEN** une entrée correspondante est visible dans l'historique d'exécution avec le déclencheur, la durée par calculateur et la durée totale
- **AND** l'historique se met à jour automatiquement sans action manuelle de rafraîchissement

#### Scenario: Affichage de l'historique dans le panneau de diagnostic

- **WHEN** l'utilisateur ouvre le panneau de diagnostic
- **THEN** les 20 dernières exécutions du moteur de calcul sont affichées
- **AND** chaque entrée affiche la date, le déclencheur, la durée totale, et le statut de chaque calculateur
- **AND** l'affichage se met à jour automatiquement via `useLiveQuery`

### Requirement: Déclenchement manuel depuis l'interface

Le moteur de calcul SHALL exposer un bouton de déclenchement manuel dans le panneau de diagnostic, permettant à l'utilisateur de lancer un run complet du registre à tout moment.

#### Scenario: Déclenchement manuel complet

- **WHEN** l'utilisateur clique sur le bouton « Recalculer » dans le panneau de diagnostic
- **THEN** le moteur exécute un run complet de tous les calculateurs du registre
- **AND** le bouton est désactivé pendant l'exécution
- **AND** les données affichées dans l'application sont rafraîchies après complétion

#### Scenario: Indicateur d'exécution en cours

- **WHEN** un run manuel est en cours d'exécution
- **THEN** le bouton « Recalculer » affiche un état désactivé avec un indicateur visuel
- **AND** l'utilisateur ne peut pas déclencher un second run tant que le premier n'est pas terminé

### Requirement: Vue de débogage du graphe de dépendances

Le moteur de calcul SHALL exposer une liste textuelle structurée des calculateurs enregistrés et de leurs dépendances déclarées, à des fins de débogage, sans nécessiter de rendu graphique dans cette itération.

#### Scenario: Consultation du graphe déclaré

- **WHEN** un développeur consulte la vue de débogage du moteur
- **THEN** la liste des calculateurs enregistrés est affichée avec, pour chacun, la liste de ses dépendances directes
- **AND** aucun rendu graphique n'est requis pour satisfaire ce besoin

### Requirement: Idempotence de la matérialisation des paiements projetés

Le calculateur `projected-payments` SHALL comparer les paiements remplaçables existants avec les nouvelles projections avant d'écrire. Si les projections sont identiques par date, montant, devise et statut, aucune écriture ne doit être effectuée pour cet abonnement. Cela garantit qu'un recalcul déclenché par synchronisation inter-instance n'entraîne pas de nouvelles écritures si les données n'ont pas changé.

#### Scenario: Recalcul sans changement de données

- **WHEN** le calculateur `projected-payments` s'exécute alors que les abonnements n'ont pas été modifiés depuis la dernière exécution
- **THEN** les paiements remplaçables existants correspondent exactement aux projections
- **AND** aucune écriture n'est effectuée dans la table `payments`

#### Scenario: Changement d'abonnement entraîne une mise à jour ciblée

- **WHEN** un abonnement est modifié sur le montant, la date d'échéance ou l'intervalle
- **THEN** seules les projections divergentes de cet abonnement sont créées, mises à jour ou supprimées
- **AND** les paiements des autres abonnements non modifiés ne sont pas touchés

#### Scenario: Boucle inter-instances cassée par l'idempotence

- **WHEN** l'instance A modifie un abonnement
- **AND** l'instance B reçoit la modification par synchronisation Dexie Cloud
- **AND** l'instance B exécute le calculateur `projected-payments`
- **THEN** les projections calculées par B sont identiques aux projections déjà synchronisées
- **AND** B n'effectue aucune écriture dans `payments`
- **AND** aucune synchronisation retour n'est générée
- **AND** la boucle de recalcul est cassée

### Requirement: Circuit breaker anti-boucle

Le moteur de calcul SHALL intégrer un circuit breaker qui détecte les runs mutation excessifs et bloque temporairement les nouveaux runs mutation pour éviter une boucle de recalcul incontrôlée. Le circuit breaker n'affecte que les runs de type `mutation` ; les runs `manual`, `startup`, `interval` et `stale-check` ne sont jamais bloqués.

#### Scenario: Seuil de runs mutation dépassé

- **WHEN** plus de 5 runs de type `mutation` sont déclenchés en 10 secondes
- **THEN** le circuit breaker bloque les nouveaux runs `mutation` pendant 30 secondes
- **AND** un log est écrit dans `diagnosticLogs` avec la catégorie `circuit-breaker`

#### Scenario: Run manuel non bloqué par le circuit breaker

- **WHEN** le circuit breaker est actif (blocage des runs mutation)
- **AND** l'utilisateur déclenche un run manuel
- **THEN** le run manuel est exécuté normalement, sans être bloqué par le circuit breaker

#### Scenario: Levée du blocage après expiration

- **WHEN** le circuit breaker a bloqué les runs `mutation`
- **AND** 30 secondes se sont écoulées depuis le blocage
- **THEN** les runs `mutation` sont à nouveau autorisés
- **AND** le circuit breaker repasse en état inactif

### Requirement: Calculateur next-renewal-date dans le registre par défaut

Le registre par défaut du moteur de calcul (`createDefaultRegistry`) SHALL inclure un calculateur identifié par `next-renewal-date`, sans dépendances déclarées, qui implémente la logique de calcul automatique de `nextRenewalDate` conformément à la spec `next-renewal-date-calculator`.

#### Scenario: Présence dans le registre

- **WHEN** le moteur de calcul est initialisé sans registre surchargé
- **THEN** le calculateur `next-renewal-date` est présent dans le registre par défaut
- **AND** son id est `'next-renewal-date'`
- **AND** sa liste `dependsOn` est vide

#### Scenario: Exécution lors d'un run complet

- **WHEN** un run complet du registre est déclenché (startup, interval, manual complet)
- **THEN** le calculateur `next-renewal-date` est exécuté
- **AND** son résultat (ok ou error) est consigné dans l'historique d'exécution

#### Scenario: Exécution ciblée

- **WHEN** un run est déclenché avec la sélection `['next-renewal-date']`
- **THEN** seul ce calculateur est exécuté
- **AND** les autres calculateurs du registre ne sont pas exécutés

### Requirement: Orchestration unique des échéances prévisionnelles

Le registre par défaut SHALL matérialiser les échéances financières par le seul calculateur `projected-payments`; il MUST NOT maintenir une seconde projection `projected-charge-dates` dans `calculationState`.

#### Scenario: Run complet

- **WHEN** un run startup, mutation, interval, stale-check ou manual est exécuté
- **THEN** `projected-payments` calcule et réconcilie l’échéancier adaptatif
- **AND** aucun calculateur séparé `projected-charge-dates` n’est exécuté

### Requirement: Réconciliation différentielle observable

Le calculateur `projected-payments` SHALL compter séparément les créations, mises à jour et suppressions réellement écrites et SHALL journaliser ces compteurs sans exposer les données métier complètes.

#### Scenario: Montant modifié à date inchangée

- **WHEN** le montant désiré d’une projection diffère et que sa date reste identique
- **THEN** la projection existante est mise à jour en place
- **AND** le résultat journalisé incrémente `updateCount`
- **AND** aucun DELETE suivi d’un CREATE n’est effectué

#### Scenario: Aucun changement

- **WHEN** toutes les projections désirées correspondent aux projections existantes
- **THEN** les compteurs de création, mise à jour et suppression valent zéro
- **AND** aucune écriture synchronisée n’est effectuée
