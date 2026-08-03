## 1. Configuration du versionnement

- [x] 1.1 Ajouter la configuration Release Please racine avec stratégie Node, tags préfixés par `v`, politique pre-major et version initiale `0.1.0`.
- [x] 1.2 Ajouter le workflow de préparation des releases sur la branche `release` avec permissions minimales et sorties de version/tag réutilisables.

## 2. Publication GitHub Pages

- [x] 2.1 Ajouter un workflow Pages réutilisable et manuel qui valide un tag SemVer, checkout ce tag et prépare Node 22 avec pnpm 11.4.0.
- [x] 2.2 Faire échouer le pipeline si `VITE_DEXIE_CLOUD_URL` manque, injecter la version et l'environnement de production, puis exécuter lint, tests et build figé.
- [x] 2.3 Charger uniquement `dist/` comme artefact Pages et le déployer avec les permissions et la concurrence appropriées.
- [x] 2.4 Relier la création effective d'une GitHub Release au workflow Pages sans déployer les simples pushes sur `release`.

## 3. Documentation développeur

- [x] 3.1 Créer `docs/developers/releases-and-github-pages.md` en anglais simplifié avec SemVer, Conventional Commits, architecture des workflows et configurations GitHub requises.
- [x] 3.2 Documenter dans ce guide le bootstrap de `v0.1.0`, la checklist de publication, la vérification du diagnostic et le rollback avec les limites de migration Dexie.

## 4. Vérification

- [x] 4.1 Vérifier statiquement la cohérence des workflows, des permissions, des versions d'actions, des références de variables et de la configuration Release Please.
- [x] 4.2 Exécuter la suite de tests, le lint et le build de production avec une URL Dexie Cloud de test, puis confirmer que la version de release est intégrée à `dist/` sans fichier sensible.
