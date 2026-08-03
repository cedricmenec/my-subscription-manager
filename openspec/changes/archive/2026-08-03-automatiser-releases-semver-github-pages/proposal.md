## Why

Le dépôt ne possède actuellement ni processus de publication, ni tags Git, ni historique de releases, alors que l'application doit produire un build statique déployable et exposer sa version dans le diagnostic (architecture cible, AC-019 et AC-022). Un processus explicite est nécessaire pour rendre chaque mise en production traçable, reproductible et distincte d'un simple merge technique sur la branche `release`.

## What Changes

- Introduire une politique Semantic Versioning pour l'application, avec des tags immuables `vMAJOR.MINOR.PATCH` et une convention Conventional Commits.
- Automatiser la préparation des versions avec une PR Release Please ciblant la branche protégée `release`, incluant la mise à jour de `package.json` et de `CHANGELOG.md`.
- Publier une GitHub Release et déployer sur GitHub Pages uniquement après fusion explicite de la PR de release, depuis le commit tagué et après validation du lint, des tests et du build.
- Injecter la version SemVer publiée et l'environnement `production` dans le build Vite afin que le diagnostic réponde à AC-022 sans exposer de données métier.
- Documenter le bootstrap de `v0.1.0`, la préparation d'une release, les règles d'incrément, les permissions GitHub, la configuration publique Dexie Cloud et la procédure de rollback.
- Préserver AC-019 : seules des variables frontend publiques peuvent être intégrées au build ; aucun secret Dexie Cloud, n8n ou credential machine n'est publié.
- Ce changement appartient au lot 0 (socle, pipeline et hébergement statique) de la spécification.
- Hors périmètre : publication sur npm, gestion de plusieurs trains de versions, préversions alpha/beta, déploiements de prévisualisation par PR, domaine personnalisé et réalisation complète des fonctionnalités PWA/service worker décrites par AC-020 et AC-021.

## Capabilities

### New Capabilities

- `publication-releases`: Politique SemVer, préparation contrôlée des releases, tags et GitHub Releases, déploiement GitHub Pages, bootstrap et rollback.

### Modified Capabilities

- `diagnostic-dialog`: La version affichée dans un build publié doit correspondre à la version SemVer de la GitHub Release déployée.

## Impact

- Nouveaux workflows dans `.github/workflows/` et configuration Release Please à la racine.
- Mise à jour de `package.json` et création/maintenance de `CHANGELOG.md` lors des releases ; le lockfile pnpm reste inchangé tant que les dépendances ne changent pas.
- Build Vite alimenté par `VITE_DEXIE_CLOUD_URL`, `VITE_APP_VERSION` et `VITE_APP_ENVIRONMENT`.
- Configuration GitHub requise : branche `release`, Pages avec source GitHub Actions, variable publique Dexie Cloud, permissions Actions et protection de branche/environnement.
- Nouvelle documentation dans `docs/developers/` pour les mainteneurs du projet.
