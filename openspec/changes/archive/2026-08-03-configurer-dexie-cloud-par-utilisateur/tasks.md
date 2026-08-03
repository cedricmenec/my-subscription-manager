## 1. Configuration locale et bootstrap

- [x] 1.1 Créer un module de configuration locale qui valide, normalise, lit et écrit l'URL Dexie Cloud sans secret.
- [x] 1.2 Refactorer le point d'entrée pour afficher la configuration obligatoire avant de charger `App` et le singleton Dexie.
- [x] 1.3 Supprimer la résolution de `VITE_DEXIE_CLOUD_URL` et configurer Dexie uniquement avec l'URL locale validée.

## 2. Interfaces utilisateur

- [x] 2.1 Créer le formulaire accessible de configuration initiale avec les consignes de reprise de la base existante.
- [x] 2.2 Afficher l'URL active dans la page Configuration et implémenter son changement confirmé sans purge.
- [x] 2.3 Ajouter les styles responsives nécessaires aux écrans de configuration.

## 3. Publication agnostique

- [x] 3.1 Retirer `VITE_DEXIE_CLOUD_URL` de `.env.example` et du workflow GitHub Pages.
- [x] 3.2 Ajouter une vérification garantissant que le build ne copie aucune configuration ou clé Dexie Cloud locale.

## 4. Documentation

- [x] 4.1 Mettre à jour le guide développeur `docs/developers/releases-and-github-pages.md` pour le build agnostique et la migration sûre.
- [x] 4.2 Créer le guide utilisateur français `docs/users/dexie-cloud-configuration.md` couvrant snapshot, première configuration, authentification, changement et récupération.

## 5. Tests et vérification

- [x] 5.1 Tester automatiquement la validation, la persistance locale et l'absence de modification lors d'une saisie invalide.
- [x] 5.2 Tester le bootstrap obligatoire et le chargement différé de l'application.
- [x] 5.3 Tester la reprise de la même URL et la non-suppression de l'ancienne base lors d'un changement.
- [x] 5.4 Exécuter lint, tests, build de production et validation OpenSpec stricte.
- [x] 5.5 Vérifier la cohérence complète entre l'implémentation, le design et les scénarios avant synchronisation.
