## 1. Fondations du modèle métier

- [x] 1.1 Étendre les types métier `Subscription` et `RenewalMode` avec les statuts et champs de cycle de vie du lot.
- [x] 1.2 Ajouter la table `categories` synchronisée avec clés globales et index minimaux.
- [x] 1.3 Introduire une nouvelle version Dexie avec migration déterministe depuis la version actuelle.

## 2. Services et validations

- [x] 2.1 Implémenter les validateurs de formulaire abonnement (obligatoires, cohérence des dates civiles, mode de renouvellement).
- [x] 2.2 Implémenter les helpers CRUD local-first (create, update ciblé, archive logique, lecture filtrée).
- [x] 2.3 Implémenter le calcul de complétude (champs critiques + indicateurs lisibles UI).

## 3. Interface Abonnements v2

- [x] 3.1 Construire la liste des abonnements avec recherche, filtres statut/catégorie/renouvellement et tri principal.
- [x] 3.2 Construire le formulaire création/édition avec messages d'erreur en français et enregistrement local immédiat.
- [x] 3.3 Ajouter la vue « À compléter » basée sur l'indicateur de complétude.
- [x] 3.4 Conserver l'indicateur global de synchronisation et relier l'état des opérations locales au nouveau CRUD.

## 4. Tests

- [x] 4.1 Ajouter des tests unitaires des règles de validation et des transitions de statuts (RG-STA-* applicables au lot).
- [x] 4.2 Ajouter des tests d'intégration IndexedDB pour migration, CRUD local et archivage logique.
- [x] 4.3 Ajouter un test hors connexion: création/modification d'un abonnement sans réseau, persistance après réouverture.
- [x] 4.4 Ajouter un test de comportement sync-error: donnée locale conservée et UI explicite.

## 5. Vérification et conformité

- [x] 5.1 Exécuter `pnpm lint`, `pnpm test` et `pnpm build` avec succès.
- [x] 5.2 Vérifier l'absence de secret frontend et de fichier `dexie-cloud.key`.
- [x] 5.3 Vérifier la couverture des critères AC-008, AC-009, AC-011 et AC-012 pertinents pour ce lot.
