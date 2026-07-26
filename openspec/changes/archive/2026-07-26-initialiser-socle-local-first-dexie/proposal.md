## Why

Le projet dispose d’un socle UI statique mais n’a pas encore de fondation local-first pour persister les données, gérer l’authentification et synchroniser entre appareils. Ce changement implémente la première tranche du Lot 1 afin de débloquer les capacités métier tout en respectant AC-002 à AC-009, TECH-LF-001 à TECH-LF-007 et FUN-AUTH-001 à FUN-AUTH-004.

## What Changes

- Ajouter le socle Dexie.js local avec schéma versionné et tables synchronisées + locales, sans `++id` sur les tables synchronisées.
- Intégrer `dexie-cloud-addon` avec `requireAuth: true` et configuration publique via variables `VITE_*`.
- Ajouter les primitives d’authentification (connexion, déconnexion) et la purge locale distincte de la déconnexion.
- Exposer un indicateur global de synchronisation basé sur l’état réel Dexie Cloud.
- Ajouter une vue de diagnostic minimale pour l’état local, réseau et synchronisation.
- Ajouter les tests de base couvrant ouverture DB, écriture locale, mode hors-ligne, et statut de synchronisation.

Non-goals explicites :
- Pas de CRUD métier complet des abonnements (Lot 2).
- Pas de calculs financiers, import/export, ni alertes n8n (Lots 3 à 5).
- Pas de backend applicatif personnalisé.

## Capabilities

### New Capabilities
- `socle-local-first-dexie`: fondation local-first avec Dexie.js, Dexie Cloud, auth, sync state visible, purge locale et diagnostic minimal.

### Modified Capabilities
- Aucune.

## Impact

- Code frontend impacté : initialisation de base locale, services d’auth/sync, composants d’état global, écran de diagnostic.
- Dépendances : ajout de Dexie.js et `dexie-cloud-addon` (et utilitaires de typage/validation si nécessaires).
- Stockage : création du schéma IndexedDB v1 avec séparation stricte entre tables synchronisées et locales.
- Sécurité : aucune clé machine ni secret n’est introduit côté frontend (AC-019, SEC-002, SEC-003).
