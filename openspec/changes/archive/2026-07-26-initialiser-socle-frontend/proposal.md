## Why

Le projet ne dispose encore d'aucun socle exécutable. Le Lot 0 doit fournir une application React et TypeScript construite par Vite, testable et produisant un livrable statique conforme à AC-001, avant d'introduire les capacités métier et local-first.

## What Changes

- Initialiser un projet frontend React, TypeScript et Vite géré avec pnpm.
- Fournir une première interface applicative en français.
- Configurer ESLint, Vitest et Testing Library.
- Ajouter des commandes reproductibles de développement, lint, test et build.
- Documenter les variables d'environnement frontend publiques prévues par la section 24.4.
- Vérifier que le build produit un répertoire `dist` statique sans serveur applicatif.

## Non-objectifs

- Ne pas ajouter Dexie.js, IndexedDB, Dexie Cloud ou l'authentification.
- Ne pas implémenter la PWA, le service worker, la CI ou le déploiement.
- Ne pas implémenter le CRUD ou les règles métier des abonnements.
- Ne pas créer de backend applicatif.

Ce changement couvre la première tranche du Lot 0 « fondations » et prépare les changements ultérieurs relatifs à AC-002 à AC-022.

## Capabilities

### New Capabilities

- `socle-frontend-statique`: Exécution locale, interface française, contrôles qualité et génération d'un build frontend statique conforme à AC-001.

### Modified Capabilities

Aucune.

## Impact

- Nouveaux fichiers de projet à la racine et sous `src/`.
- Nouvelles dépendances d'exécution : React et React DOM.
- Nouvelles dépendances de développement : Vite, TypeScript, ESLint, Vitest, Testing Library et environnement DOM de test.
- Nouvelles commandes pnpm pour le développement, le lint, les tests et le build.
- Aucun service distant, stockage métier, secret ou API n'est introduit.
