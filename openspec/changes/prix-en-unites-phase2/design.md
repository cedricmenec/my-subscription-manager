## Contexte

La phase 1 a introduit les champs `currentPrice` et `amount` en unités de devise, tout en maintenant les champs legacy `currentPriceMinor` et `amountMinor` synchronisés en écriture. Après une période de stabilité, tous les clients ont migré et les données legacy ne sont plus nécessaires. Cette phase les supprime pour simplifier le code.

## Objectifs / Non-Objectifs

**Objectifs :**
- Supprimer `currentPriceMinor` de `Subscription`
- Supprimer `amountMinor` de `Money`
- Supprimer les propriétés `*Minor` de `FinancialSummary`
- Supprimer les helpers de fallback legacy (`resolvePrice`, `resolveAmount`)
- Supprimer l'écriture duale dans les services
- Migration Dexie v5 : suppression des champs legacy des données stockées

**Non-Objectifs :**
- Changer le comportement des calculs financiers (déjà en unités depuis la phase 1)
- Modifier l'interface utilisateur (déjà en unités depuis la phase 1)
- Ajouter ou supprimer d'autres champs

## Décisions

### D1 : Suppression franche des champs legacy

**Choix** : Supprimer complètement `currentPriceMinor` et `amountMinor` des types, services et UI.

**Raison** : Après la phase 1, plus aucun code ne lit ces champs en priorité. Les maintenir ajoute de la complexité sans bénéfice. La migration Dexie v5 définit les champs à `undefined` (Dexie les ignore lors de la synchro si absents).

### D2 : Migration v5 — suppression des champs obsolètes

**Choix** : La migration v5 parcourt les `subscriptions` et `payments` pour supprimer les champs legacy.

**Raison** : Dexie Cloud synchronise l'objet entier. Si un champ legacy est présent dans la base mais pas dans le type, il est ignoré. La migration nettoie les données pour éviter toute confusion.

```typescript
this.version(5)
  .stores({ /* même structure que v4 */ })
  .upgrade(async tx => {
    await tx.table('subscriptions').toCollection().modify(sub => {
      delete sub.currentPriceMinor
      delete sub.billingInterval  // legacy billingInterval déjà supprimé en v3, nettoyage
      sub.schemaVersion = 5
    })
    await tx.table('payments').toCollection().modify(payment => {
      if (payment.amount) {
        delete payment.amount.amountMinor
      }
      payment.schemaVersion = 5
    })
    await tx.table('settings').toCollection().modify(settings => {
      settings.schemaVersion = 5
    })
  })
```

### D3 : Simplification des services

**Choix** : Supprimer les helpers de résolution (`resolvePrice`, `resolveAmount`). Tous les services utilisent directement `subscription.currentPrice` et `money.amount`.

**Raison** : Plus de fallback nécessaire. Le code devient plus simple et plus lisible.

### D4 : Renommage des propriétés FinancialSummary

**Choix** : Supprimer les propriétés `*Minor` et garder uniquement les propriétés en unités (ex: `monthlyEquivalent` devient le seul champ, `monthlyEquivalentMinor` est supprimé).

**Raison** : Un seul format de représentation = moins de confusion.

## Risques / Compromis

| Risque | Mitigation |
|--------|------------|
| **R1** : Un client non migré (phase 1 uniquement) écrit des données avec `currentPriceMinor` | Impossible après la phase 1 : tous les clients ont les deux champs. Si un client non migré survit, il écrit `currentPriceMinor` et `currentPrice` — la phase 2 lit `currentPrice` |
| **R2** : Données Dexie Cloud avec `currentPriceMinor` provenant d'un ancien client | Les champs inconnus sont ignorés par Dexie lors de la synchro. La migration v5 nettoie localement |
| **R3** : Rollback nécessaire | Revenir à la phase 1 = restaurer les types avec `currentPriceMinor` optionnel. Les données existantes sont intactes car la migration v5 ne fait que des `delete` |

## Plan de migration

1. Supprimer `currentPriceMinor` et `amountMinor` des types (`db.ts`)
2. Implémenter la migration Dexie v5 (nettoyage des champs legacy)
3. Supprimer les helpers de résolution dans `finance.ts`
4. Simplifier `subscriptions.ts` (plus d'écriture duale)
5. Simplifier `payments.ts` (plus d'écriture duale)
6. Supprimer les références `*Minor` dans `App.tsx`
7. Mettre à jour tous les tests
8. Valider : `pnpm lint`, `pnpm test`, `pnpm build`

## Questions ouvertes

- Faut-il aussi supprimer `billingInterval` legacy (déjà migré en v3) ? → Oui, la migration v5 nettoie ce champ résiduel.
- Quel délai entre le déploiement de la phase 1 et le début de la phase 2 ? → Au moins une release, pour s'assurer que tous les clients sont migrés.