## Context

Le dépôt contient uniquement la spécification de référence et la structure OpenSpec. Cette première tranche du Lot 0 doit créer un socle frontend minimal, exécutable et vérifiable sans anticiper le modèle métier, IndexedDB, Dexie Cloud ou la PWA.

Le livrable doit rester une application browser-only dont toutes les ressources de production sont générées dans `dist`. Aucun stockage persistant ni flux réseau n'est introduit par ce changement ; il n'y a donc ni migration de données ni nouvelle frontière de confiance.

## Goals / Non-Goals

**Goals:**

- Établir un projet React et TypeScript construit par Vite.
- Fournir une première vue applicative sobre et en français.
- Rendre le lint, les tests et le build exécutables par des commandes pnpm stables.
- Produire un livrable statique compatible avec AC-001.
- Préparer les seules variables publiques décrites dans la section 24.4.

**Non-Goals:**

- Ajouter un routeur, une bibliothèque de composants ou une gestion d'état globale.
- Installer Dexie.js, Dexie Cloud, un service worker ou un ordonnanceur.
- Définir le modèle de données ou implémenter une fonctionnalité métier.
- Configurer la CI, un hébergeur ou un backend.

## Decisions

### Decision: utiliser pnpm et un manifeste explicite

Le dépôt utilisera pnpm, disponible dans l'environnement, avec une version de gestionnaire déclarée dans `package.json`. Les scripts `dev`, `lint`, `test` et `build` constitueront l'interface d'automatisation du projet.

L'alternative npm n'apporte aucun avantage fonctionnel et multiplierait les fichiers de verrouillage. Le projet conservera un seul lockfile pnpm.

### Decision: conserver une structure Vite minimale

Le point d'entrée `src/main.tsx` montera un composant `App` dans la page Vite. La configuration TypeScript séparera les options applicatives et Node selon le modèle courant de Vite. Le build TypeScript sera validé avant le build Vite.

Un framework avec rendu serveur est rejeté : il contredirait l'objectif de build statique browser-only et introduirait une surface serveur inutile.

### Decision: tester le comportement visible

Vitest utilisera un environnement DOM et Testing Library pour vérifier le rendu de l'interface. Les tests cibleront les textes et rôles accessibles plutôt que la structure interne des composants.

Les tests end-to-end sont reportés à un changement ultérieur : le présent incrément ne contient ni navigation ni workflow métier.

### Decision: utiliser CSS sans bibliothèque visuelle

Le socle utilisera une feuille CSS locale, responsive et accessible. Cette décision évite d'imposer prématurément un design system avant l'apparition des écrans métier.

### Decision: traiter les variables Vite comme configuration publique

Un fichier `.env.example` documentera `VITE_DEXIE_CLOUD_URL`, `VITE_APP_VERSION` et `VITE_APP_ENVIRONMENT`. Aucun secret ni fichier `dexie-cloud.key` ne sera ajouté. Les variables ne seront pas encore consommées tant que les capacités concernées n'existent pas.

## Risks / Trade-offs

- [Les versions de dépendances peuvent évoluer rapidement] -> Le lockfile pnpm figera l'installation vérifiée.
- [Le premier écran contient peu de fonctions] -> Le limiter à une structure applicative et un état vide cohérent, sans simuler un CRUD non implémenté.
- [L'absence initiale de PWA ne satisfait pas AC-020] -> Conserver AC-020 hors périmètre et planifier une évolution dédiée.
- [Node.js 24 peut révéler des incompatibilités d'outillage] -> Exécuter lint, tests et build dans l'environnement réel avant archivage.

## Migration Plan

1. Installer les dépendances et générer le lockfile pnpm.
2. Exécuter le lint et les tests.
3. Construire `dist` et vérifier son caractère statique.
4. En cas d'échec, supprimer uniquement les fichiers introduits par ce changement ; aucune donnée utilisateur ni migration n'est concernée.

## Open Questions

Aucune question ne bloque ce changement. Le choix du routeur, du plugin PWA, de la bibliothèque de validation et de la stratégie de déploiement sera effectué dans les changements qui les introduiront.
