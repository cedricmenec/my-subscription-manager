## Context

Le moteur de calcul local-first existe déjà avec un registre de calculateurs, un circuit breaker anti-boucle, et des déclenchements par mutation/startup/interval/stale-check/manual. Il contient actuellement un seul calculateur : `projected-payments`.

Le modèle `Subscription` stocke `nextRenewalDate`, mais cette valeur est calculée uniquement au moment de la création/modification dans `subscriptions.ts` (fonction `computeNextRenewalDate`). Elle n'est jamais rafraîchie : un abonnement mensuel créé il y a 6 mois a toujours la même date de prochain renouvellement qu'à sa création.

Par ailleurs, le champ `renewalStartDate` est ambigu : son nom suggère le début de la période de renouvellement en cours, mais il est traité comme la date de la toute première période (ancre génésique). Il faut le renommer et introduire un champ de période en cours ajustable.

## Goals / Non-Goals

**Goals:**
- Rendre `nextRenewalDate` automatique et toujours à jour via le moteur de calcul
- Renommer `renewalStartDate` → `subscriptionDate` (date de souscription initiale, immuable)
- Ajouter `renewalPeriodStartDate` (début de la période en cours, ajustable)
- Ajouter les champs d'alerte `notifyBeforeRenewal` et `notifyBeforeRenewalDays` (renseignés par le calculateur)
- Créer le calculateur `next-renewal-date` dans le registre par défaut (sans dépendances)
- Appliquer les règles d'arrêt ENDED/CANCELLED_PENDING_END sur `nextRenewalDate`
- Mettre `nextRenewalDate` en lecture seule dans l'UI (calculé automatiquement)
- Règle de cohérence `nextChargeDate > nextRenewalDate` lorsque les intervalles sont identiques
- Migration Dexie préservant les données existantes

**Non-Goals:**
- Implémenter un module d'alerting ou une table d'alertes (sera fait ultérieurement)
- Modifier le comportement des paiements projetés (`projected-payments`)
- Ajouter un champ `lastRenewalDate` (l'algo de boucle while sur `renewalPeriodStartDate` le rend inutile)
- Modifier le circuit breaker ou le mécanisme de déclenchement du moteur

## Decisions

### D1. Calculateur `next-renewal-date` sans dépendances

Le calculateur `next-renewal-date` est indépendant de `projected-payments` car il travaille uniquement sur la table `subscriptions` en lecture et écriture. Il peut être exécuté seul.

**Alternative rejetée** : Dépendre de `projected-payments`. Les deux calculateurs n'ont pas de relation de données — `next-renewal-date` pourrait être exécuté plus souvent (tous les jours) sans impacter les paiements projetés.

### D2. Idempotence par comparaison de la date calculée vs stockée

Le calculateur suit le même pattern que `projected-payments`:
1. Charger tous les abonnements actifs non archivés
2. Pour chacun, calculer `nextRenewalDate`
3. Comparer avec la valeur existante
4. Si différent → écriture. Si identique → skip

**Alternative rejetée** : Toujours écrire. L'écriture provoquerait une mutation, qui déclencherait un run, qui écrirait à nouveau → boucle. L'idempotence casse la boucle (grâce au `mutationSuppressionUntil` de 5s dans le moteur et à l'absence d'écriture si identique).

### D3. Ancre : `renewalPeriodStartDate` prioritaire, `subscriptionDate` en fallback

```
function computeNextRenewalDate(subscription):
  anchor = subscription.renewalPeriodStartDate
        ?? subscription.subscriptionDate
        ?? undefined

  if anchor is undefined:
    return undefined (pas de calcul possible)

  while anchor < todayCivilDate():
    anchor = addInterval(anchor, renewalIntervalUnit, renewalIntervalCount)

  return anchor
```

**Alternative rejetée** : Utiliser `nextChargeDate` comme ancre. Bien que tentant, `nextChargeDate` et `nextRenewalDate` sont deux concepts différents (facturation vs renouvellement contractuel). Les lier implicitement créerait de la confusion.

### D4. Renommage `renewalStartDate` → `subscriptionDate` avec migration Dexie

Le champ `renewalStartDate` n'est actuellement utilisé que dans :
- `src/data/db.ts` : définition du modèle
- `src/services/subscriptions.ts` : CRUD (computeNextRenewalDate, createSubscription, updateSubscription)
- `src/components/SubscriptionDialog.tsx` : formulaire (toFormState, handleSubmit)
- `src/services/subscriptionValidation.ts` : validation (SubscriptionFormInput)

Migration Dexie (nouvelle version après la v7 actuelle) :
1. Copier `renewalStartDate` → `subscriptionDate` sur chaque abonnement
2. Initialiser `renewalPeriodStartDate` avec `subscriptionDate` si présent
3. Ajouter `notifyBeforeRenewal` et `notifyBeforeRenewalDays` avec `undefined`
4. Supprimer le champ `renewalStartDate` du schéma Dexie

### D5. `nextRenewalDate` en lecture seule dans l'UI

Le champ `nextRenewalDate` passe en lecture seule dans le dialogue :
- **Création** : pas de champ modifiable, texte "Calculé automatiquement après enregistrement"
- **Édition** : affichage de la date en lecture seule avec label "Mise à jour automatique"

`renewalPeriodStartDate` est le seul champ ajustable dans la section Renouvellement (permet de corriger la période en cours sans toucher au calcul).

### D6. Règle de cohérence conditionnelle

La validation `nextChargeDate > nextRenewalDate` est activée uniquement quand :
```
renewalMode = 'AUTOMATIC'
AND renewallIntervalUnit = billingIntervalUnit
AND renewalIntervalCount = billingIntervalCount
```

Cela couvre le cas standard (mensuel, annuel simple) sans bloquer les cas légitimes où les intervalles diffèrent.

## Architecture du calculateur

```
┌─────────────────────────────────────────────────────────────────┐
│  calculateur: next-renewal-date                                 │
│  dependsOn: []                                                  │
│                                                                 │
│  run(context) {                                                 │
│    subscriptions = db.subscriptions (hors archivés/deleted)     │
│    today = todayCivilDate()                                     │
│                                                                 │
│    for each sub in subscriptions:                               │
│      oldDate = sub.nextRenewalDate                              │
│      oldNotifyRenewal = sub.notifyBeforeRenewal                 │
│      oldNotifyDays = sub.notifyBeforeRenewalDays                │
│                                                                 │
│      newDate = computeNextRenewal(sub, today)                   │
│                                                                 │
│      // Appliquer les règles d'arrêt                            │
│      if sub.status === 'ENDED':                                 │
│        newDate = undefined                                      │
│      if sub.status === 'CANCELLED_PENDING_END'                  │
│         AND sub.serviceEndDate < today:                         │
│        newDate = undefined                                      │
│                                                                 │
│      // Déterminer les alertes (première initialisation)        │
│      newNotify, newDays =                                        │
│        computeDefaultAlert(sub, newDate)                         │
│                                                                 │
│      // Idempotence : n'écrire que si changement                │
│      if newDate ≠ oldDate                                        │
│         OR newNotify ≠ oldNotifyRenewal                          │
│         OR newDays ≠ oldNotifyDays:                              │
│        db.subscriptions.put({...sub,                              │
│          nextRenewalDate: newDate,                                │
│          notifyBeforeRenewal: newNotify,                         │
│          notifyBeforeRenewalDays: newDays,                       │
│          updatedAt: new Date(),                                   │
│        })                                                        │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  computeNextRenewalDate(sub, today): string | undefined         │
│                                                                 │
│  if sub.renewalMode ≠ 'AUTOMATIC': return undefined              │
│                                                                 │
│  anchor = sub.renewalPeriodStartDate                             │
│        ?? sub.subscriptionDate                                   │
│        ?? undefined                                              │
│  if anchor is undefined: return undefined                       │
│                                                                 │
│  if no sub.renewalIntervalUnit: return undefined                 │
│                                                                 │
│  result = anchor                                                 │
│  while result < today:                                           │
│    result = addIntervalToCivilDate(                              │
│      result,                                                     │
│      sub.renewalIntervalUnit,                                    │
│      sub.renewalIntervalCount ?? 1,                              │
│    )                                                             │
│  return result                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  computeDefaultAlert(sub): (boolean, number)                    │
│                                                                 │
│  if sub.notifyBeforeRenewal is defined:                         │
│    return (sub.notifyBeforeRenewal, sub.notifyBeforeRenewalDays)│
│                                                                 │
│  if sub.renewalMode === 'MANUAL':                               │
│    return (true, 7)                                             │
│                                                                 │
│  if (unit === 'MONTH' and count <= 1)                          │
│   or (unit === 'WEEK' and count <= 4):                          │
│    return (true, 7)  // opt-in                                  │
│                                                                 │
│  if unit === 'YEAR' or (unit === 'MONTH' and count >= 6):      │
│    return (false, 30)  // opt-out                               │
│                                                                 │
│  return (true, 7)  // fallback                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Flux de données

```
Sauvegarde abonnement (formulaire)
         │
         ▼
  createSubscription / updateSubscription
         │
         ▼
  Validation (SubscriptionValidationError si incohérence)
         │
         ▼
  Écriture IndexedDB (Dexie put)
         │
         ▼
  Déclenchement moteur (mutation)
         │
         ▼
  Debounce 300ms
         │
         ▼
  calculateur next-renewal-date
         │
         ▼
  Lecture tous les abonnements
  → Pour chacun : calcul de nextRenewalDate
  → Comparaison avec valeur existante
  → Écriture uniquement si changement
         │
         ▼
  Mutation suppression (5s) → pas de boucle
```

## Impacts sur le formulaire

### Section Renouvellement (état actif)

```
┌─ Renouvellement ──────────────────────────────────────────┐
│  Cycle: [ quantité ] [ unité ▼ ]   (prérempli billing)     │
│  Date de souscription : 2024-01-15  (lecture seule)       │
│  Début période en cours : [ 2026-01-15 ]  (ajustable)     │
│  Prochain renouvellement : 2027-01-15  (calculé auto)     │
│                             🞬 Mise à jour automatique     │
└────────────────────────────────────────────────────────────┘
```

### Cohérence des champs

| Champ | Création | Édition | Calculé par |
|-------|----------|---------|-------------|
| `subscriptionDate` | Modifiable | Lecture seule | Utilisateur |
| `renewalPeriodStartDate` | Prérempli (startDate) | Ajustable | UI/défaut |
| `nextRenewalDate` | Lecture seule | Lecture seule | Moteur |
| `notifyBeforeRenewal` | Non affiché | Non affiché | Moteur (ce lot) |

## Migration Dexie

Nouvelle version de base = v8 (actuellement v7).

```typescript
// Nouvelle version dans db.ts
db.version(8).stores({
  subscriptions: [
    'id, status, categoryId, renewalMode, billingIntervalUnit, ' +
    'nextChargeDate, nextRenewalDate, updatedAt, archivedAt, deletedAt',
    // Les nouveaux champs sont ajoutés mais n'ont pas besoin d'être indexés
  ].join('')
}).upgrade(tx => {
  return tx.table('subscriptions').toCollection().modify(sub => {
    // Renommage renewalStartDate → subscriptionDate
    if ('renewalStartDate' in sub) {
      sub.subscriptionDate = sub.renewalStartDate
      delete sub.renewalStartDate
    }
    // Initialisation de renewalPeriodStartDate
    if (!('renewalPeriodStartDate' in sub) && sub.subscriptionDate) {
      sub.renewalPeriodStartDate = sub.subscriptionDate
    }
    // Ajout des champs d'alerte (undefined)
    if (!('notifyBeforeRenewal' in sub)) {
      sub.notifyBeforeRenewal = undefined
    }
    if (!('notifyBeforeRenewalDays' in sub)) {
      sub.notifyBeforeRenewalDays = undefined
    }
  })
})
```

## Documentation

- **Developer guide** : `docs/developers/calculation-engine.md` → ajouter une section "Calculateur next-renewal-date" décrivant l'algo, l'ancre, les règles d'arrêt, et les alertes.
- **User guide** : `docs/users/calculation-engine.md` → ajouter une section "Renouvellement automatique" expliquant le calcul et la différence entre `subscriptionDate` et `renewalPeriodStartDate`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Boucle de recalcul inter-instances** : Instance A écrit un abonnement → sync → Instance B recalcule → écrit `nextRenewalDate` → sync retour → Instance A re-déclenche | L'idempotence casse la boucle : si `nextRenewalDate` calculé = valeur déjà stockée, aucune écriture n'est effectuée. Le `mutationSuppressionUntil` (5s) protège contre les réactions en chaîne rapides. |
| **Performance sur grand volume** : Le calculateur itère sur tous les abonnements à chaque run. Avec 500 abonnements, le calcul est négligeable (< 1ms par abonnement). | Accepté. Si nécessaire, un filtre `WHERE nextRenewalDate < today OR nextRenewalDate IS NULL` pourrait être ajouté. |
| **`subscriptionDate` perdu si pas saisi en création** : L'utilisateur ne remplit pas `subscriptionDate` → pas d'ancre de fallback. | `renewalPeriodStartDate` reste le seul moyen d'ancrer le calcul. Le calculateur logue un avertissement de diagnostic. |
| **Changement de fuseau horaire** : Les dates civiles n'ont pas de fuseau, mais `todayCivilDate()` utilise l'heure locale de l'appareil. | Les dates civiles sont en `YYYY-MM-DD` sans fuseau. `todayCivilDate()` utilise `Date.UTC` → cohérent entre appareils. |
| **Renommage breaking potentiel pour n8n** : Si n8n référence `renewalStartDate` dans des workflows. | Vérifier les workflows n8n existants. Le champ doit être mis à jour côté n8n après déploiement. |