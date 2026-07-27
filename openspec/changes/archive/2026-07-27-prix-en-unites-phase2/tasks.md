## 1. Modèle de données et migration

- [x] 1.1 Supprimer `currentPriceMinor` de `Subscription` et `amountMinor` de `Money` dans les types TypeScript
- [x] 1.2 Supprimer les propriétés `*Minor` de `FinancialSummary` (interface)
- [x] 1.3 Implémenter la migration Dexie v5 : suppression des champs legacy dans les données stockées

## 2. Services métier

- [x] 2.1 Supprimer les helpers de résolution `resolvePrice` et `resolveAmount` dans `finance.ts`
- [x] 2.2 Supprimer l'écriture duale de `currentPriceMinor` dans `subscriptions.ts`
- [x] 2.3 Supprimer l'écriture duale de `amountMinor` dans `payments.ts`
- [x] 2.4 Supprimer les propriétés `*Minor` de `FinancialSummary` dans `finance.ts`

## 3. Interface utilisateur

- [x] 3.1 Supprimer toutes les références à `currentPriceMinor` dans `App.tsx`
- [x] 3.2 Supprimer toutes les références aux propriétés `*Minor` du résumé financier dans `App.tsx`

## 4. Tests

- [x] 4.1 Mettre à jour `finance.test.ts` : supprimer les références à `currentPriceMinor`, `amountMinor`, `*Minor`
- [x] 4.2 Mettre à jour `payments.test.ts` : supprimer les références legacy
- [x] 4.3 Mettre à jour `subscriptions.test.ts` : supprimer les références legacy
- [x] 4.4 Mettre à jour `indexeddb.integration.test.ts` : supprimer les références legacy
- [x] 4.5 Ajouter un test de migration v5 : vérifier que les champs legacy sont supprimés

## 5. Vérification

- [x] 5.1 Exécuter `pnpm lint` sans erreur
- [x] 5.2 Exécuter `pnpm test` avec tous les tests verts
- [x] 5.3 Exécuter `pnpm build` sans erreur