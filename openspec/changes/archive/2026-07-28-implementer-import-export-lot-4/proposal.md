## Why

L'application contient actuellement zéro donnée réelle. Les 37 abonnements existent dans un fichier Excel qu'il faut pouvoir importer. Sans cette fonctionnalité, l'application ne peut pas être utilisée. L'export est nécessaire pour la sauvegarde, la portabilité et l'interopérabilité.

Ce changement correspond au **Lot 4** du plan d'implémentation (Import/Export).

## What Changes

- **Snapshot JSON** : export complet de toutes les tables (subscriptions, categories, payments, settings) dans un fichier JSON unique versionné, et restauration complète par remplacement atomique.
- **Import CSV** : import additif d'abonnements depuis un fichier CSV, avec génération automatique des IDs, détection des doublons de nom (warning non bloquant), et rapport d'import.
- **Export CSV** : export des abonnements et paiements au format CSV.
- **Documentation du schéma** : fichier `docs/import-schema.md` décrivant les formats JSON et CSV pour permettre la transformation externe (IA, script) du fichier Excel existant.
- **Interface utilisateur** : page `/data` avec les actions d'import, export et snapshot.

**Non pris en charge dans ce lot :**
- Import du format XLSX natif (l'utilisateur transforme son fichier Excel en CSV/JSON via un outil externe).
- Import CSV avec IDs explicites (toujours génération auto).
- Import CSV des paiements (uniquement abonnements).
- Fuzzy matching des noms (uniquement comparaison exacte case-insensitive).

## Capabilities

### New Capabilities
- `import-export`: Import et export des données aux formats JSON (snapshot) et CSV (abonnements), avec documentation du schéma pour transformation externe.

### Modified Capabilities
<!-- Aucune spec existante modifiée -->

## Impact

- Nouveau service : `src/services/importExport.ts` (logique métier d'import/export)
- Nouveau service : `src/services/snapshot.ts` (logique de snapshot JSON)
- Nouvelle page : `src/pages/DataPage.tsx` (interface utilisateur)
- Nouveau fichier : `docs/import-schema.md` (documentation du schéma)
- Tables locales Dexie : `importPreview`, `drafts` (déjà prévues dans la spec)
- Dépendances : aucune nouvelle dépendance externe (JSON natif, CSV parsé manuellement ou via une petite lib)