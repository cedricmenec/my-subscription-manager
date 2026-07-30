## 1. Retrait du fallback et de l'auto-calcul

- [x] 1.1 Supprimer le fallback `billingInterval` → `renewalInterval` dans `computeNextRenewalDateForSub` (calculationEngine.ts)
- [x] 1.2 Supprimer l'auto-calcul de `nextChargeDate = nextRenewalDate` dans le moteur de calcul (calculationEngine.ts)
- [x] 1.3 Supprimer l'auto-calcul de `nextChargeDate` dans `updateSubscription` et `createSubscription` (subscriptions.ts)
- [x] 1.4 Supprimer les paramètres `billingIntervalUnit`/`billingIntervalCount` de `computeNextRenewalDate` (subscriptions.ts)

## 2. Logs de diagnostic next-renewal-date-skip

- [x] 2.1 Ajouter dans le calculateur un log `next-renewal-date-skip` avec `reason` pour chaque abonnement où `computeNextRenewalDateForSub` retourne `undefined`
- [x] 2.2 Ajouter le rendu du log `next-renewal-date-skip` dans `CalculationTimeline.tsx` avec badge ⏭️ et la raison du skip

## 3. Gate de validation nextChargeDate ≤ nextRenewalDate

- [x] 3.1 Ajouter la règle de gate dans `validateSubscriptionInput` (subscriptionValidation.ts) : si `nextChargeDate` et `nextRenewalDate` sont définis, vérifier `nextChargeDate ≤ nextRenewalDate`

## 4. Calculateur projected-charge-dates

- [x] 4.1 Ajouter le calculateur `projected-charge-dates` dans le registre par défaut du moteur, dépendant de `next-renewal-date`
- [x] 4.2 Implémenter la projection des N prochaines échéances (défaut 12) à partir de `nextChargeDate` (fallback `nextRenewalDate`)
- [x] 4.3 Stocker les résultats dans `calculationState` avec la clé `<subId>:projected-charge-dates` au format JSON `{ subscriptionId, projectedDates, generatedAt }`

## 5. Vérification

- [x] 5.1 Vérifier que `pnpm build` compile sans erreur
- [x] 5.2 Vérifier que les tests passent (`pnpm test`)