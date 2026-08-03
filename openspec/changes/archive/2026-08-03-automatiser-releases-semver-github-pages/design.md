## Context

L'application est une SPA React/Vite statique. Elle utilise déjà `base: './'`, une navigation par hash et les variables `VITE_APP_VERSION`, `VITE_APP_ENVIRONMENT` et `VITE_DEXIE_CLOUD_URL`. Le dépôt déclare `0.1.0` dans `package.json`, mais ne possède aucun tag, aucune branche `release` locale, aucun remote configuré et aucun workflow de publication.

Le changement traverse Git, GitHub Actions, GitHub Releases, GitHub Pages et le diagnostic applicatif. Il ne modifie ni IndexedDB ni Dexie Cloud : les données restent locales/synchronisées selon le flux existant et aucune migration de schéma n'est introduite. La frontière de confiance reste celle d'un frontend public : toutes les variables `VITE_*`, notamment l'URL Dexie Cloud, sont visibles dans le bundle et ne doivent contenir aucun secret (AC-019).

## Goals / Non-Goals

**Goals:**

- Faire d'une GitHub Release SemVer l'unique événement normal de mise en production.
- Conserver une décision humaine explicite grâce à une PR de release ciblant `release`.
- Garantir l'alignement entre `package.json`, `CHANGELOG.md`, tag Git, GitHub Release, artefact Pages et version de diagnostic (AC-022).
- Valider lint, tests et build avant chaque déploiement.
- Permettre le redéploiement manuel d'un tag existant pour un rollback opérationnel.
- Fournir un guide développeur en anglais simplifié sous `docs/developers/`, avec exemples et procédures concrètes.

**Non-Goals:**

- Publier le package privé sur npm.
- Créer un backend, une base serveur ou stocker des secrets dans le frontend.
- Gérer des branches de maintenance multiples, des canaux alpha/beta ou des previews de PR.
- Automatiser les paramètres GitHub qui nécessitent des droits administrateur sur un remote non configuré.
- Rendre réversible une migration Dexie : un rollback applicatif reste soumis à la compatibilité du schéma local déjà migré.

## Decisions

### 1. `release` est une branche de promotion, pas l'événement de déploiement

Les changements applicatifs sont promus vers `release` par PR. Un push sur `release` exécute Release Please, qui crée ou met à jour une PR de release. Seule la fusion de cette PR produit un tag et une GitHub Release ; le déploiement est conditionné à la sortie `release_created`.

Alternative rejetée : déployer chaque push sur `release`. Cette approche publierait du code avant qu'une version immuable ne l'identifie et rendrait les merges techniques équivalents à une décision de production.

### 2. Release Please pilote SemVer et le changelog

Release Please analyse les Conventional Commits et utilise la stratégie `node` à la racine. Les tags portent le préfixe `v`. Avant `1.0.0`, `bump-minor-pre-major` conserve les ruptures dans la série `0.x` ; `fix` produit un patch et `feat` produit une minor. Les ruptures utilisent `type!:` ou un footer `BREAKING CHANGE:`.

Le manifeste initialise la version connue à `0.1.0`. Comme cette version n'a jamais été taguée, le bootstrap initial `v0.1.0` reste une opération explicite et documentée, exécutée une seule fois sur le commit validé de `release`.

Alternative rejetée : modifier manuellement la version à chaque release. Cela dupliquerait la décision dans `package.json`, le tag, les notes et le build, avec un risque de désalignement.

### 3. Le déploiement Pages est un workflow réutilisable appelé dans la même exécution

Un workflow de release appelle un workflow Pages réutilisable lorsque Release Please expose `release_created=true`. Le workflow réutilisable reçoit le tag, checkout exactement ce tag, installe Node 22 et pnpm 11.4.0, valide le dépôt, construit `dist/`, charge l'artefact Pages puis le déploie dans l'environnement `github-pages`.

Ce découpage permet aussi `workflow_dispatch` avec un tag SemVer existant pour redéployer ou restaurer une release. L'appel réutilisable reste dans la même chaîne d'exécution : il ne dépend pas d'un nouvel événement `release` qui serait supprimé par la protection anti-récursion du `GITHUB_TOKEN`.

Alternative rejetée : un second workflow déclenché uniquement par `release: published`. Une release créée par le `GITHUB_TOKEN` ne garantit pas le déclenchement d'une nouvelle exécution.

### 4. Le build échoue si la configuration publique de production manque

Le workflow lit `vars.VITE_DEXIE_CLOUD_URL` et refuse de construire si la valeur est vide. Il fixe `VITE_APP_ENVIRONMENT=production` et dérive `VITE_APP_VERSION` du tag après validation du format `vMAJOR.MINOR.PATCH`.

L'URL Dexie Cloud est une configuration publique intégrée au bundle, pas un secret. Les credentials Dexie Cloud machine, n8n et `dexie-cloud.key` restent exclus conformément à AC-019.

### 5. Les tags de release sont immuables

Un tag `vX.Y.Z` identifie un unique commit. Il n'est ni déplacé ni réutilisé. Une correction crée une nouvelle version. Un rollback redéploie un tag antérieur sans modifier l'historique et le diagnostic affiche alors cette ancienne version.

La version applicative SemVer reste indépendante de la version du schéma Dexie et de la version du format snapshot. Toute release contenant une migration destructive doit documenter son impact et sa stratégie de sauvegarde ; redéployer un ancien frontend ne restaure pas les données migrées.

### 6. La configuration administrative reste documentée et vérifiable manuellement

Le guide développeur décrit la création/protection de `release`, l'activation de Pages avec GitHub Actions, la variable de dépôt, les permissions Actions, le bootstrap, la publication normale et le rollback. Ces réglages ne peuvent pas être appliqués localement sans remote ni autorisation d'administration.

## Risks / Trade-offs

- [Les commits non conventionnels ne déclenchent pas d'incrément et peuvent être absents du changelog] → Documenter les types autorisés et utiliser des titres de PR squash conformes.
- [La variable `VITE_DEXIE_CLOUD_URL` manque] → Faire échouer le build avant la compilation avec un message explicite.
- [La PR automatisée nécessite des permissions GitHub supplémentaires] → Documenter `contents: write`, `pull-requests: write` et l'autorisation de créer des PR via Actions.
- [Deux releases concurrentes pourraient se déployer dans le désordre] → Utiliser un groupe de concurrence `github-pages` et annuler le déploiement obsolète.
- [Un rollback du frontend rencontre une base Dexie déjà migrée] → Vérifier la compatibilité de la version cible et restaurer un snapshot lorsque la migration concernée n'est pas rétrocompatible.
- [Le bootstrap `v0.1.0` est oublié] → Fournir une checklist unique avant d'activer l'automatisation.
- [Une action tierce compromise affecte la supply chain] → Utiliser uniquement des actions reconnues, des versions majeures explicites et conserver les permissions minimales par job.

## Migration Plan

1. Ajouter les fichiers Release Please et les workflows sur `main`.
2. Configurer le remote GitHub, puis créer `release` depuis le commit de référence validé.
3. Configurer la variable publique `VITE_DEXIE_CLOUD_URL`, Pages et les protections de branche/environnement.
4. Exécuter lint, tests et build, puis créer le tag annoté initial `v0.1.0` et la GitHub Release correspondante.
5. Déployer `v0.1.0` via le workflow Pages manuel et vérifier la version dans le diagnostic.
6. Pour les versions suivantes, promouvoir les changements vers `release`, puis fusionner la PR Release Please lorsqu'elle est validée.

Rollback : déclencher manuellement le workflow Pages avec un tag existant. Ne jamais déplacer le tag. Avant un rollback traversant une migration Dexie, contrôler la compatibilité et restaurer un snapshot si nécessaire.

## Open Questions

Aucune question bloquante. Le passage à `1.0.0` restera une décision explicite lorsque les contrats de données et d'import/export seront déclarés stables.
