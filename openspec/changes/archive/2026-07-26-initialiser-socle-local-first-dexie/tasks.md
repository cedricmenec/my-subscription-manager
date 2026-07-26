## 1. Fondations Dexie local-first

- [x] 1.1 Ajouter les dépendances Dexie.js et `dexie-cloud-addon`.
- [x] 1.2 Créer la base Dexie v1 avec séparation tables synchronisées/locales et identifiants globaux sur tables synchronisées.
- [x] 1.3 Configurer Dexie Cloud avec `requireAuth: true`, variables `VITE_*` publiques et `unsyncedTables`.

## 2. Services d’authentification et de synchronisation

- [x] 2.1 Implémenter les primitives de connexion, déconnexion et lecture de l’identité connectée.
- [x] 2.2 Implémenter la purge locale distincte de la déconnexion.
- [x] 2.3 Implémenter un adaptateur d’état de synchronisation global basé sur l’état réel Dexie Cloud.

## 3. Intégration UI minimale

- [x] 3.1 Afficher un indicateur global de synchronisation dans l’interface.
- [x] 3.2 Afficher l’état local des opérations (enregistré localement, en attente de sync, synchronisé, erreur sync).
- [x] 3.3 Ajouter une vue diagnostic minimale (version app, DB locale, identité, réseau, statut sync, date dernière sync si disponible).

## 4. Tests et vérification

- [x] 4.1 Ajouter des tests unitaires pour la configuration DB et le mapping d’état de synchronisation.
- [x] 4.2 Ajouter des tests d’intégration IndexedDB pour ouverture, écriture locale et persistance.
- [x] 4.3 Ajouter un scénario de test hors ligne validant qu’une écriture locale ne dépend pas du réseau.
- [x] 4.4 Exécuter `pnpm lint`, `pnpm test` et `pnpm build` avec succès.

## 5. Sécurité et conformité

- [x] 5.1 Vérifier qu’aucun secret ni fichier `dexie-cloud.key` n’est introduit.
- [x] 5.2 Vérifier que le frontend n’embarque que des variables de configuration publiques.
- [x] 5.3 Vérifier la conformité du lot avec AC-002 à AC-009 et AC-019.
