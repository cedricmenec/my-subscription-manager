## Why

Actuellement, les prix sont stockés, saisis et affichés en centimes (ex: 1500 pour 15,00 €). Cela crée une friction UX : l'utilisateur doit saisir "1500" pour dire "15 €", et le format est contre-intuitif. On souhaite passer à une représentation en unités de la devise de base (ex: 15 ou 12.50), cohérente avec l'affichage monétaire standard.

## What Changes

- **Modèle `Subscription`** : ajout d'un champ `currentPrice` (number) en unités de devise, parallèle à `currentPriceMinor` (legacy, conservé pour rétrocompatibilité)
- **Modèle `Money`** : ajout d'un champ `amount` (number) en unités de devise, parallèle à `amountMinor` (legacy, conservé)
- **Migration Dexie v4** : convertir les données existantes : `currentPrice = currentPriceMinor / 100`, `amount = amountMinor / 100`
- **Services finance** : utiliser `currentPrice` (ou `currentPriceMinor / 100` en fallback) dans tous les calculs ; adapter les noms de propriétés dans `FinancialSummary`
- **UI** : champ "Prix" en saisie décimale (remplace "Prix (centimes)") ; `formatMoneyMinor` remplacé par `formatMoney` sans division par 100
- **Tests** : toutes les valeurs de test passent en unités

Les champs legacy (`currentPriceMinor`, `amountMinor`) sont **conservés et maintenus** dans cette phase : chaque écriture mettra à jour les deux champs pour garantir la rétrocompatibilité.

## Capabilities

### New Capabilities

*(aucune — il s'agit d'une modification de représentation, pas d'une nouvelle fonctionnalité)*

### Modified Capabilities
- `abonnements-v2-coeur-metier`: le modèle `Subscription` gagne un champ `currentPrice` en unités ; le champ `currentPriceMinor` devient déprécié mais reste maintenu
- `finances-paiements`: le type `Money` gagne un champ `amount` en unités ; les calculs financiers (`FinancialSummary`, `computeEquivalentMonthlyCost`, etc.) utilisent les unités ; le champ `amountMinor` devient déprécié mais reste maintenu

## Impact

- **`src/data/db.ts`** : types `Subscription`, `Money`, `FinancialSummary` ; migration Dexie v4
- **`src/services/finance.ts`** : calculs, fallback, `FinancialSummary`
- **`src/services/payments.ts`** : référence à `amount` / `amountMinor`
- **`src/services/subscriptions.ts`** : référence à `currentPrice` / `currentPriceMinor`
- **`src/services/subscriptionValidation.ts`** : interface `SubscriptionFormInput`
- **`src/App.tsx`** : formulaire, affichage monétaire, résumé financier
- **Tests** : tous les fichiers `.test.ts` impactés