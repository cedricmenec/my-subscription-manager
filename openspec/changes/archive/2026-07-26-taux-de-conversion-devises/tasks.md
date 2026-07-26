## 1. Fondation — Modèle de données

- [x] 1.1 Ajouter le champ `exchangeRates: Record<string, number>` à l'interface `AppSettings` dans `src/data/db.ts`
- [x] 1.2 Ajouter le type `ExchangeRateEntry` et la fonction de validation des taux de conversion dans `src/services/finance.ts`

## 2. Cœur métier — Calcul avec conversion

- [x] 2.1 Modifier `buildFinancialSummary` pour accepter les taux de conversion et convertir les montants en devise étrangère
- [x] 2.2 Ajouter le champ `excludedSubscriptions: Array<{id: string, reason: string}>` à `FinancialSummary`
- [x] 2.3 Modifier `getFinancialSummary` dans `payments.ts` pour charger et passer les taux de conversion
- [x] 2.4 Modifier le type `FinancialSummaryState` et la fonction `getFinancialSummary` dans `App.tsx` pour intégrer les exclusions individuelles

## 3. Interface utilisateur — Configuration des taux

- [x] 3.1 Ajouter une section de configuration des taux de conversion dans l'interface (App.tsx)
- [x] 3.2 Implémenter l'ajout, la modification et la suppression d'un taux de conversion
- [x] 3.3 Ajouter la validation des taux saisis (doit être un nombre positif)

## 4. Interface utilisateur — Indicateurs d'exclusion

- [x] 4.1 Ajouter un badge/tooltip sur chaque abonnement exclu dans la liste avec le motif d'exclusion
- [x] 4.2 Ajouter un badge/tooltip sur les abonnements convertis indiquant le taux appliqué
- [x] 4.3 Ajouter un affichage du nombre d'abonnements convertis dans le résumé financier

## 5. Tests

- [x] 5.1 Tester `buildFinancialSummary` avec des taux de conversion (USD→EUR)
- [x] 5.2 Tester `buildFinancialSummary` avec un abonnement exclu faute de taux
- [x] 5.3 Tester que les paiements projetés conservent leur devise d'origine
- [x] 5.4 Tester la validation des taux de conversion (taux négatif/nul rejeté)

## 6. Vérification

- [x] 6.1 Vérifier que `pnpm build` passe sans erreur
- [x] 6.2 Vérifier que `pnpm test` passe sans erreur

## 6. Vérification

- [ ] 6.1 Vérifier que `pnpm build` passe sans erreur
- [ ] 6.2 Vérifier que `pnpm test` passe sans erreur