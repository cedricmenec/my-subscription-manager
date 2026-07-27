## Contexte

Actuellement, tous les montants sont stockés en centimes (minor units) :
- `Subscription.currentPriceMinor` : entier (ex: 1500 pour 15,00 €)
- `Money.amountMinor` : entier (ex: 1500)
- `FinancialSummary.*Minor` : tous les champs en centimes
- Saisie utilisateur : "1500" dans le champ "Prix (centimes)"
- `formatMoneyMinor(amountMinor, currency)` : `amountMinor / 100` pour l'affichage

L'utilisateur souhaite travailler en unités de devise (ex: 15, 12.50) à la fois dans l'UI et dans le stockage, sans contrainte de précision entière.

## Objectifs / Non-Objectifs

**Objectifs :**
- Ajouter un champ `currentPrice` (number) en unités à `Subscription`
- Ajouter un champ `amount` (number) en unités à `Money`
- Faire migrer les données existantes (centimes → unités) via Dexie v4
- Adapter l'UI : saisie décimale, affichage direct, plus de division par 100
- Maintenir les champs legacy (`currentPriceMinor`, `amountMinor`) en écriture pour rétrocompatibilité
- Utiliser `currentPrice` et `amount` en lecture prioritaire, avec fallback sur `currentPriceMinor / 100` et `amountMinor / 100`

**Non-Objectifs :**
- Supprimer les champs legacy (phase 2)
- Modifier le format des taux de change (déjà en décimal)
- Ajouter une bibliothèque de précision décimale (Decimal.js, etc.)
- Modifier l'API publique ou les exports n8n

## Décisions

### D1 : Migration parallèle avec champs legacy maintenus

**Choix** : Ajouter `currentPrice` et `amount` comme nouveaux champs. Les champs `currentPriceMinor` et `amountMinor` sont conservés et mis à jour en écriture.

**Raison** : Dexie Cloud synchronise l'objet entier. Un client sans mise à jour verrait `currentPriceMinor` et fonctionnerait encore. Un client mis à jour lit `currentPrice` en priorité. La migration Dexie v4 convertit les données existantes en une passe.

```typescript
// Subscription — cohabitation des deux champs
export interface Subscription extends SyncedEntity {
  currentPriceMinor?: number   // legacy, maintenu en écriture
  currentPrice?: number        // nouveau, en unités (ex: 15.00)
  // ...
}

// Money — idem
export interface Money {
  amountMinor: number    // legacy, maintenu en écriture
  amount: number         // nouveau, en unités (ex: 15.00)
  currency: string
}
```

### D2 : Précision à 2 décimales sans Decimal.js

**Choix** : Utiliser `Math.round(value * 100) / 100` pour les calculs financiers, pas de bibliothèque externe.

**Raison** : L'utilisateur a explicitement indiqué que la précision au centime près n'est pas critique. `Math.round * 100 / 100` offre une précision suffisante pour un usage personnel. Éviter d'ajouter une dépendance.

### D3 : Migration Dexie v4 atomique

**Choix** : Une migration `.upgrade()` qui convertit tous les enregistrements existants en une transaction Dexie.

**Raison** : Dexie exécute les migrations dans une transaction IndexedDB. Si elle échoue, la base revient à l'état précédent. La migration est déterministe et idempotente (vérifie `schemaVersion`).

```typescript
this.version(4)
  .stores({ /* même structure que v3 */ })
  .upgrade(async tx => {
    // Subscriptions
    await tx.table('subscriptions').toCollection().modify(sub => {
      if (typeof sub.currentPriceMinor === 'number') {
        sub.currentPrice = sub.currentPriceMinor / 100
      }
      sub.schemaVersion = 4
    })
    // Payments
    await tx.table('payments').toCollection().modify(payment => {
      if (payment.amount && typeof payment.amount.amountMinor === 'number') {
        payment.amount.amount = payment.amount.amountMinor / 100
      }
      payment.schemaVersion = 4
    })
    // Settings
    await tx.table('settings').toCollection().modify(settings => {
      settings.schemaVersion = 4
    })
  })
```

### D4 : Lecture avec fallback

**Choix** : Dans les services, créer un helper `resolvePrice(subscription)` et `resolveAmount(money)` qui lisent `currentPrice` en priorité, et tombent sur `currentPriceMinor / 100` si absent.

**Raison** : Permet de supporter les données anciennes qui n'ont pas encore été migrées (ex: si un autre appareil n'a pas fait la migration). Les données fraîchement écrites ont toujours les deux champs.

```typescript
function resolvePrice(sub: Subscription): number | undefined {
  if (typeof sub.currentPrice === 'number') return sub.currentPrice
  if (typeof sub.currentPriceMinor === 'number') return sub.currentPriceMinor / 100
  return undefined
}
```

### D5 : Écriture synchrone des deux champs

**Choix** : Dans `createSubscription` et `updateSubscription`, si `currentPrice` est fourni, calculer `currentPriceMinor = Math.round(currentPrice * 100)`.

**Raison** : Garantit que les deux champs sont toujours cohérents. Un client legacy qui lit `currentPriceMinor` verra la valeur correcte.

### D6 : Renommage des propriétés FinancialSummary

**Choix** : Ajouter des propriétés en unités (ex: `monthlyEquivalent`) à côté des propriétés `*Minor` existantes. Les `*Minor` sont marquées dépréciées en commentaire.

**Raison** : Évite de casser les consommateurs existants tout en exposant les nouvelles valeurs.

## Risques / Compromis

| Risque | Mitigation |
|--------|------------|
| **R1** : Perte de précision décimale dans les calculs | Accepté — l'utilisateur a indiqué que la précision n'est pas critique. `Math.round * 100 / 100` limite les erreurs à < 0,01 € |
| **R2** : Migration échoue sur base volumineuse | Dexie exécute la migration dans une transaction — rollback automatique. Données personnelles, volume faible |
| **R3** : Incohérence entre `currentPrice` et `currentPriceMinor` après écriture | L'écriture synchrone des deux champs garantit la cohérence. Si un autre client non migré écrit, le fallback en lecture corrige |
| **R4** : Synchronisation Dexie Cloud avec clients mixtes (v3 et v4) | Dexie Cloud synchronise objet complet. Un client v3 ignore `currentPrice` et lit `currentPriceMinor` — correct. Un client v4 lit `currentPrice` — correct. Les deux champs sont toujours présents |

## Plan de migration

1. Modifier les types TypeScript (`db.ts`)
2. Implémenter la migration Dexie v4
3. Ajouter les helpers de résolution (fallback)
4. Adapter les services (`finance.ts`, `payments.ts`, `subscriptions.ts`)
5. Modifier l'interface utilisateur (`App.tsx`)
6. Mettre à jour tous les tests
7. Valider : `pnpm lint`, `pnpm test`, `pnpm build`

## Questions ouvertes

- Faut-il aussi exposer `currentPrice` dans les exports n8n ? → Oui, mais dans un changement séparé.
- Quel format pour les imports CSV/JSON ? → À définir (phase 2 ou changement dédié).