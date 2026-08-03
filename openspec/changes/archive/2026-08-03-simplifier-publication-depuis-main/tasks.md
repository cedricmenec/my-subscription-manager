## 1. Migration de l'état de release

- [x] 1.1 Intégrer dans `main` le commit généré pour la release `0.2.0` afin d'aligner le manifest, `package.json` et `CHANGELOG.md`.
- [x] 1.2 Vérifier que la configuration Release Please conserve les nouveaux tags canoniques `vMAJOR.MINOR.PATCH`.

## 2. Workflow de publication

- [x] 2.1 Configurer le workflow Release Please pour écouter `main` et cibler `main`.
- [x] 2.2 Conserver le déclenchement du déploiement Pages uniquement après création effective d'une release.

## 3. Documentation et spécifications

- [x] 3.1 Mettre à jour le guide développeur avec le flux GitHub Flow, la configuration de protection de `main` et la migration de l'ancienne branche.
- [x] 3.2 Synchroniser la delta spec `publication-releases` dans la spécification principale.

## 4. Vérification

- [x] 4.1 Vérifier statiquement le déclencheur, la branche cible et le format de tags du workflow.
- [x] 4.2 Exécuter lint, tests et build avec la configuration de production requise (lint et tests bloqués localement par des dépendances manquantes ; build réussi).
- [x] 4.3 Vérifier la cohérence entre les artefacts OpenSpec et l'implémentation.
