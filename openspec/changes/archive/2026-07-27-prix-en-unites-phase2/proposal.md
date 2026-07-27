## Why

La phase 1 a introduit les champs `currentPrice` et `amount` en unités de devise tout en maintenant les champs legacy `currentPriceMinor` et `amountMinor` pour rétrocompatibilité. Une fois la phase 1 déployée et stable, les champs legacy n'ont plus d'utilité et peuvent être supprimés pour simplifier le code.

## What Changes

- **Supprimer** le champ `currentPriceMinor` de `Subscription`
- **Supprimer** le champ `amountMinor` de `Money`
- **Supprimer** les propriétés `*Minor` de `FinancialSummary`
- **Simplifier** les services : plus de fallback legacy, plus d'écriture duale
- **Simplifier** l'UI : plus de référence à `*Minor`
- **Migration Dexie v5** : supprimer les champs legacy des données existantes

## Capabilities

### New Capabilities

*(aucune)*

### Modified Capabilities

- `abonnements-v2-coeur-metier`: le champ `currentPriceMinor` est supprimé du modèle `Subscription`
- `finances-paiements`: le champ `amountMinor` est supprimé du type `Money` ; les propriétés `*Minor` sont supprimées de `FinancialSummary`

## Impact

- **`src/data/db.ts`** : types simplifiés, migration v5
- **`src/services/finance.ts`** : suppression des helpers de fallback, `FinancialSummary` simplifié
- **`src/services/payments.ts`** : plus de référence à `amountMinor`
- **`src/services/subscriptions.ts`** : plus d'écriture duale
- **`src/App.tsx`** : plus de référence aux champs legacy
- **Tests** : tous les fichiers `.test.ts` impactés