## Context

Le dépôt contient actuellement un socle React/Vite statique et en français, sans persistance métier ni synchronisation. Le prochain incrément doit établir une architecture local-first conforme au cadrage : IndexedDB comme source locale de vérité via Dexie.js, synchronisation via Dexie Cloud, authentification obligatoire, et interface réactive même hors connexion.

Contraintes structurantes :
- TECH-LF-001 à TECH-LF-007.
- FUN-AUTH-001 à FUN-AUTH-004.
- FUN-CRUD-001 à FUN-CRUD-004.
- SEC-002, SEC-003, AC-002 à AC-009, AC-019.

## Goals / Non-Goals

**Goals:**
- Poser un schéma Dexie v1 minimal mais extensible, compatible multi-appareils.
- Garantir la validation locale des écritures sans dépendre du réseau.
- Exposer un état de synchronisation compréhensible et exploitable dans l’UI.
- Distinguer explicitement déconnexion et purge locale.
- Fournir un diagnostic technique minimal pour faciliter l’exploitation.

**Non-Goals:**
- Implémenter les écrans métier complets (liste, fiche, paiements).
- Implémenter les workflows n8n ou la logique d’alertes.
- Introduire un backend applicatif, une API métier custom, ou une base distante propriétaire.

## Decisions

### Décision 1 : Schéma Dexie v1 minimal avec séparation sync/local
- Tables synchronisées initiales : `subscriptions`, `settings`.
- Tables locales initiales : `localSettings`, `diagnosticLogs`.
- Clés : identifiants globaux (`@id`) sur tables synchronisées, aucune clé auto-incrémentée `++id` sur ces tables.
- Versionnement : `db.version(1).stores(...)` pour poser une base stable de migration.

Alternatives rejetées :
- Stocker tout en `localStorage` : rejeté (non conforme TECH-LF et trop limité).
- Mettre toutes les tables en sync dès Lot 1 : rejeté pour limiter le risque et garder un incrément testable.

### Décision 2 : Dexie Cloud comme unique canal de sync/auth
- Utiliser `dexie-cloud-addon` et `cloud.configure({ requireAuth: true, ... })`.
- Interdire tout appel frontend direct à l’API REST Dexie Cloud pour la logique métier interactive (TECH-LF-005).

Alternatives rejetées :
- API maison de synchronisation : rejetée (interdit par l’architecture backendless).
- Utiliser un autre BaaS pour ce lot : rejeté (hors cadrage et augmenterait le coût de migration).

### Décision 3 : Modèle UI local-first explicite
- Toute écriture est validée localement et l’UI confirme immédiatement la persistance locale.
- L’UI expose un statut global de synchronisation dérivé de l’état Dexie Cloud réel, pas uniquement de `navigator.onLine` (TECH-LF-007).
- Les erreurs de synchronisation ne sont jamais affichées comme perte de donnée locale (FUN-CRUD-004).

Alternatives rejetées :
- Attendre un ACK réseau avant confirmation utilisateur : rejeté (contredit FUN-CRUD-001/002).

### Décision 4 : Purge locale et déconnexion séparées
- `Déconnexion` : fin de session auth.
- `Purge locale` : suppression de la copie IndexedDB de l’appareil, sans suppression distante (FUN-AUTH-003/004).

Alternatives rejetées :
- Purge implicite à la déconnexion : rejetée (risque utilisateur élevé et non conforme).

### Décision 5 : Frontière de secrets stricte
- Variables frontend limitées à `VITE_DEXIE_CLOUD_URL`, `VITE_APP_VERSION`, `VITE_APP_ENVIRONMENT`.
- Aucun secret machine Dexie Cloud, aucun `dexie-cloud.key`, aucun token long-lived dans le dépôt ou le bundle (SEC-002, SEC-003).

## Risks / Trade-offs

- [État de synchronisation difficile à rendre lisible] → Définir un mapping explicite vers cinq états UX stables (synchro OK, en attente, en cours, hors connexion, erreur).
- [Conflits multi-appareils non totalement traités en Lot 1] → Limiter ce lot au socle et planifier des tests de convergence plus complets au lot suivant.
- [Dépendance à Dexie Cloud pendant l’onboarding d’un nouvel appareil] → Message d’état dédié “synchronisation initiale en cours” et fallback local quand la base existe déjà.
- [Risque de fuite d’informations dans le diagnostic] → Limiter la vue diagnostic à des métadonnées techniques sans contenu métier.

## Migration Plan

1. Introduire la classe de base Dexie v1 et ouvrir la base au démarrage applicatif.
2. Brancher l’addon Dexie Cloud avec `requireAuth: true` et `unsyncedTables`.
3. Ajouter les primitives d’auth, purge locale et indicateur de sync global.
4. Ajouter la vue de diagnostic minimale.
5. Vérifier lint, tests et build.

Rollback :
- Retirer les modules Dexie et revenir à l’UI statique si un défaut bloquant est détecté.
- Supprimer la base locale de test via purge locale pour repartir d’un état propre.

Impact migration :
- Première version de schéma (`version(1)`), sans migration de versions antérieures.
- Les évolutions ultérieures devront ajouter des versions incrémentales sans modifier rétroactivement la v1.

## Open Questions

- Le socle doit-il inclure une route dédiée de connexion dès ce lot, ou un panneau minimal embarqué dans la page principale ?
- Souhaite-t-on activer dès ce lot un petit jeu de données de démonstration local non synchronisé pour faciliter les tests manuels ?
- Quel niveau de granularité est attendu pour les événements du diagnostic local dans `diagnosticLogs` ?
