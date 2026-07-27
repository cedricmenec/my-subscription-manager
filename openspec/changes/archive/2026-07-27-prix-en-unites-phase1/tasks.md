## 1. Modèle de données et migration

- [x] 1.1 Ajouter les champs `currentPrice` et `amount` aux types TypeScript (`db.ts`)
- [x] 1.2 Implémenter la migration Dexie v4 : conversion `currentPriceMinor / 100` → `currentPrice`, `amountMinor / 100` → `amount`
- [x] 1.3 Ajouter les helpers de résolution `resolvePrice(sub)` et `resolveAmount(money)` avec fallback legacy

## 2. Services métier

- [x] 2.1 Adapter `finance.ts` : utiliser `resolvePrice` dans `computeEquivalentMonthlyCost`, `computeEquivalentAnnualCost`, `projectSubscriptionPayments`, `buildFinancialSummary` ; ajouter les propriétés en unités dans `FinancialSummary`
- [x] 2.2 Adapter `subscriptions.ts` : dans `createSubscription` et `updateSubscription`, écrire les deux champs (`currentPrice` + `currentPriceMinor = Math.round(currentPrice * 100)`)
- [x] 2.3 Adapter `payments.ts` : dans `materializeProjectedPayments`, écrire les deux champs `amount` + `amountMinor`
- [x] 2.4 Adapter `subscriptionValidation.ts` : interface `SubscriptionFormInput` avec `currentPrice` (optionnel)

## 3. Interface utilisateur

- [x] 3.1 Remplacer le champ "Prix (centimes)" par "Prix" avec saisie décimale dans le formulaire
- [x] 3.2 Remplacer `parseOptionalInteger` par `parseFloat` pour la lecture du prix
- [x] 3.3 Remplacer `formatMoneyMinor` par `formatMoney` sans division par 100
- [x] 3.4 Adapter `toFormState` pour lire `currentPrice` en priorité
- [x] 3.5 Adapter `handleSubmitSubscription` pour envoyer `currentPrice` (et `currentPriceMinor` calculé)
- [x] 3.6 Mettre à jour l'affichage du résumé financier (propriétés en unités)

## 4. Tests

- [x] 4.1 Mettre à jour `finance.test.ts` : valeurs en unités, adapter les assertions
- [x] 4.2 Mettre à jour `payments.test.ts` : valeurs en unités
- [x] 4.3 Mettre à jour `subscriptions.test.ts` : valeurs en unités
- [x] 4.4 Mettre à jour `indexeddb.integration.test.ts` : valeurs en unités
- [x] 4.5 Ajouter un test de migration v4 : vérifier que `currentPrice = currentPriceMinor / 100` et `amount = amountMinor / 100`

## 5. Vérification

- [x] 5.1 Exécuter `pnpm lint` sans erreur
- [x] 5.2 Exécuter `pnpm test` avec tous les tests verts
- [x] 5.3 Exécuter `pnpm build` sans erreur