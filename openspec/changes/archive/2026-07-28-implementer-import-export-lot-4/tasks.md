## 1. Fondations

- [x] 1.1 Créer `docs/import-schema.md` avec la documentation du format JSON snapshot et CSV import/export
- [x] 1.2 Ajouter les types `ImportReport`, `SnapshotEnvelope`, `CsvImportRow` dans `src/data/db.ts`
- [x] 1.3 Ajouter les tables locales `importPreview` et `drafts` dans le schéma Dexie (version 6 avec migration)
- [x] 1.4 Implémenter le parseur CSV utilitaire (sans dépendance externe) dans `src/services/csvParser.ts`

## 2. Service Snapshot JSON

- [x] 2.1 Implémenter `exportSnapshot()` dans `src/services/snapshot.ts` : lit toutes les tables synchronisées et produit l'enveloppe JSON
- [x] 2.2 Implémenter `restoreSnapshot(file)` dans `src/services/snapshot.ts` : valide le format, soft-delete tout existant, importe dans une transaction rw multi-table
- [x] 2.3 Ajouter la validation du format snapshot (enveloppe, version, structure)

## 3. Service Import CSV

- [x] 3.1 Implémenter `previewCsvImport(file)` dans `src/services/importExport.ts` : parse le CSV, valide chaque ligne, détecte les doublons de nom, retourne un rapport d'aperçu
- [x] 3.2 Implémenter `confirmCsvImport(preview)` dans `src/services/importExport.ts` : crée les abonnements valides en transaction Dexie, génère les IDs, retourne le rapport final

## 4. Service Export CSV

- [x] 4.1 Implémenter `exportSubscriptionsCsv()` dans `src/services/importExport.ts` : exporte les abonnements au format CSV
- [x] 4.2 Implémenter `exportPaymentsCsv()` dans `src/services/importExport.ts` : exporte les paiements au format CSV

## 5. Interface utilisateur

- [x] 5.1 Créer la page `src/pages/DataPage.tsx` avec les sections Snapshot, Import CSV, Export CSV
- [x] 5.2 Ajouter la route `/data` dans `App.tsx` avec navigation depuis la TopBar
- [x] 5.3 Implémenter le composant de sélection de fichier avec aperçu avant confirmation
- [x] 5.4 Implémenter l'affichage du rapport d'import/export/snapshot

## 6. Tests

- [x] 6.1 Tests unitaires du parseur CSV (lignes valides, invalides, guillemets, en-tête)
- [x] 6.2 Tests unitaires du snapshot (export, restauration, format invalide)
- [x] 6.3 Tests d'intégration IndexedDB de l'import CSV (création, doublons, lignes invalides)
- [x] 6.4 Tests d'intégration IndexedDB de la restauration snapshot (remplacement atomique)
- [x] 6.5 Tests d'export CSV (vérification du format produit)

## 7. Vérification

- [x] 7.1 Exécuter `pnpm lint`, `pnpm test` et `pnpm build` avec succès
- [x] 7.2 Vérifier l'absence de secret frontend et de fichier `dexie-cloud.key`
- [x] 7.3 Vérifier la couverture des critères AC-017, AC-018 et FUN-PORT-001 à FUN-PORT-005