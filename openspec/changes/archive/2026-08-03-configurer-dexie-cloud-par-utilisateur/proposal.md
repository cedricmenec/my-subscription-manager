## Why

Le build public lie actuellement tous les utilisateurs à une URL Dexie Cloud injectée par `VITE_DEXIE_CLOUD_URL`, alors qu'Abos est une application individuelle, statique et browser-only. La configuration distante doit appartenir au navigateur de chaque utilisateur sans fragiliser la base IndexedDB et la synchronisation Dexie Cloud déjà utilisées.

## What Changes

- Rendre la configuration d'une URL Dexie Cloud obligatoire dans un écran de démarrage avant toute création ou ouverture de la base applicative.
- Stocker cette URL localement dans le navigateur, hors des tables synchronisées et hors du bundle publié.
- Réutiliser exactement la base IndexedDB existante lorsque l'utilisateur renseigne la même URL Dexie Cloud ; une autre URL sélectionne une base locale distincte sans supprimer ni migrer silencieusement l'ancienne.
- Ajouter dans la page Configuration la consultation et le changement explicite de l'URL, avec avertissement, confirmation et rechargement contrôlé.
- Conserver l'authentification OTP client-side avec `requireAuth: true` ; ne jamais exposer ni utiliser `dexie-cloud.key` dans le frontend.
- Retirer `VITE_DEXIE_CLOUD_URL` du build Vite, du workflow GitHub Pages et de la documentation de publication afin que l'artefact statique soit agnostique de toute base distante.
- Documenter la sauvegarde préalable, la migration de l'installation existante, la configuration initiale et la récupération en cas d'URL erronée.

Ce changement appartient au lot 0 — fondations techniques local-first — et précise FUN-AUTH-001, TECH-LF-004, AC-006, AC-019, SEC-002, SEC-003 et SEC-005.

**Non-objectifs :** créer automatiquement une base Dexie Cloud, ajouter un backend d'authentification, proposer un mode sans Dexie Cloud, déplacer des données entre deux URLs distantes ou supprimer automatiquement une base locale historique.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `socle-local-first-dexie`: initialisation conditionnée par une URL locale obligatoire et préservation de la base existante par identité d'URL.
- `socle-frontend-statique`: build générique sans URL Dexie Cloud injectée et bootstrap préalable à l'application.
- `settings-interface`: écrans de configuration initiale et de changement contrôlé de l'URL Dexie Cloud.
- `publication-releases`: suppression de la variable GitHub `VITE_DEXIE_CLOUD_URL` et vérification d'un artefact sans dépendance distante prédéfinie.

## Impact

Le point d'entrée React, la construction du singleton Dexie, la page Configuration, les styles, les tests, `.env.example`, le workflow Pages et les guides développeur/utilisateur sont concernés. Le schéma métier Dexie, les tables synchronisées, les identifiants, l'authentification OTP et la base distante ne sont pas modifiés. La migration est locale et non destructive : elle sélectionne la base existante à partir de la même URL.
