## Context

Le moteur de calcul (`src/services/calculationEngine.ts`) orchestre l'exécution de calculateurs enregistrés (actuellement un seul : `projected-payments`). Le calculateur `projected-payments` appelle `materializeProjectedPayments()` qui crée de nouveaux paiements avec `source: 'GENERATED'` dans la table synchronisée `payments`.

Le problème actuel : `materializeProjectedPayments` utilise une clé de déduplication `${subscriptionId}:${scheduledDate}`. Quand un abonnement est modifié (nouvelle date d'échéance, nouveau montant), l'ancien paiement projeté persiste car sa clé est toujours présente dans le Set existant, tandis qu'un nouveau paiement est créé avec la nouvelle clé. Résultat : des orphelins visibles dans les prochaines échéances.

L'UI utilise `listPayments()` (lecture unique) pour remplir le state React `payments`, et `refreshFinance()` pour rafraîchir après mutation. Ce pattern est duplicé à 6 endroits et ne réagit pas aux changements sync.

Le panneau de diagnostic (`DiagnosticDialog`) affiche `getDebugGraph()` (graphe statique) mais pas l'historique des exécutions, bien que les logs existent dans `diagnosticLogs`.

## Goals / Non-Goals

**Goals:**
- Éliminer les projections orphelines en purgeant les paiements `GENERATED` avant de créer les nouvelles projections, dans une transaction atomique.
- Exposer un bouton « Recalculer » dans le panneau de diagnostic pour déclencher manuellement un run complet.
- Afficher l'historique des exécutions du moteur (trigger, durée, statut) dans le panneau de diagnostic.
- Remplacer la lecture manuelle des paiements par `useLiveQuery` pour la réactivité automatique.
- Préserver la compatibilité avec la synchronisation Dexie Cloud (les paiements `GENERATED` restent synchronisés).

**Non-Goals:**
- Pas de modification du graphe de dépendances ou ajout de nouveaux calculateurs.
- Pas de modification de la logique de projection (`projectSubscriptionPayments`).
- Pas de Web Worker.
- Pas de rendu graphique du graphe de dépendances.
- Pas de migration de schema Dexie (la table `payments` existe déjà avec les bons index).

## Decisions

### 1. Purge avant projection dans `materializeProjectedPayments`

**Décision** : avant de projeter, supprimer tous les paiements `GENERATED` pour chaque abonnement traité, puis créer les nouvelles projections dans la même transaction.

**Implémentation** : dans `materializeProjectedPayments`, pour chaque abonnement :
1. Supprimer les paiements `GENERATED` existants pour cet abonnement (via `payments.where('subscriptionId').equals(id).and(p => p.source === 'GENERATED').delete()`)
2. Projeter les nouveaux paiements
3. Les créer avec `payments.put()`

Tout cela dans la transaction `database.transaction('rw', database.payments, async () => { ... })` existante.

**Alternative considérée** : purger uniquement les clés dont la date a changé. Rejetée — trop complexe, ne couvre pas le cas où le montant change sans la date, et le coût de suppression + recréation est négligeable pour quelques paiements par abonnement.

**Conséquence** : les paiements `GENERATED` purgés seront supprimés sur l'appareil local et la suppression se synchronisera via Dexie Cloud vers les autres appareils. C'est le comportement souhaité — les anciennes projections obsolètes ne doivent pas persister nulle part.

### 2. Bouton « Recalculer » dans `DiagnosticDialog`

**Décision** : ajouter un bouton dans le panneau de diagnostic qui appelle `calculationEngine.run()` puis rafraîchit les données UI.

**Implémentation** : `DiagnosticDialog` reçoit un nouveau prop `onRecalculate` (callback async). Le bouton est désactivé pendant l'exécution (état `isRecalculant` local). Après exécution, le callbacknotifie le parent pour rafraîchir les données.

**Alternative considérée** : exposer le bouton directement sur le dashboard. Rejeté — c'est un outil de debug, pas une fonctionnalité utilisateur principale. Le panneau de diagnostic est l'emplacement naturel.

### 3. Historique des calculs via `useLiveQuery` dans `DiagnosticDialog`

**Décision** : lire `diagnosticLogs` avec `useLiveQuery` pour un affichage réactif, filtré sur `category: 'calc-engine'`.

**Implémentation** : dans `DiagnosticDialog`, utiliser :
```typescript
const calcLogs = useLiveQuery(() =>
  db.diagnosticLogs
    .where('category')
    .equals('calc-engine')
    .reverse()
    .limit(20)
    .toArray()
)
```

Afficher chaque entrée avec : date, trigger, durée totale, statut par calculateur.

**Alternative considérée** : exposer l'historique via l'API du moteur (`engine.getHistory()`). Rejetée — les logs sont déjà dans `diagnosticLogs`, pas besoin de double stockage.

### 4. `useLiveQuery` pour les paiements dans `App.tsx`

**Décision** : utiliser `useLiveQuery(() => db.payments.orderBy('scheduledDate').toArray())` pour remplacer `listPayments()` + `setPayments()`.

**Implémentation** :
- Le `useLiveQuery` existant (`livePayments`) est déjà présent dans `App.tsx` mais non utilisé pour le state `payments`.
- Remplacer le pattern `listPayments()` → `setPayments()` par une utilisation directe de `livePayments`.
- Conserver `refreshFinance()` pour le calcul (appel au moteur) mais la lecture des paiements devient réactive.
- Les appels `refreshFinance()` restent nécessaires pour déclencher le moteur de calcul, mais le rafraîchissement des données UI après calcul est automatique via `useLiveQuery`.

**Alternative considérée** : supprimer `refreshFinance()` entièrement et se fier uniquement aux hooks de mutation du moteur. Rejeté — le déclenchement manuel (bouton Recalculer, après import, après restauration snapshot) doit rester possible.

## Risks / Trade-offs

- **[Suppression de paiements GENERATED pendant sync Dexie Cloud]** → Les suppressions se synchronisent normalement. Si un autre appareil a des projections différentes (horloge décalée), les projections locales priment après purge. C'est acceptable car les projections sont dérivées et recréées à chaque run. **Mitigation** : la transaction atomique garantit que la purge + recréation est cohérente.

- **[useLiveQuery et performance]** → `useLiveQuery` ré-exécute la requête à chaque transaction sur `payments`. Pendant un run du moteur, cela peut déclencher plusieurs relectures. **Mitigation** : la requête est simple (`orderBy + toArray`), le nombre de paiements est typiquement < 500, et Dexie optimise les relectures côté client.

- **[Perte de l'historique après purge]** → Les paiements `GENERATED` supprimés ne sont plus visibles. **Mitigation** : c'est le comportement souhaité — les projections obsolètes n'ont pas de valeur historique (contrairement aux paiements `CONFIRMED_PAID` ou `MANUEL`).

## Migration Plan

Aucune migration de schema n'est nécessaire. La table `payments` existe déjà avec l'index composite `[subscriptionId+scheduledDate]` et l'index `source`. Les modifications sont purement logicielles dans les services et composants existants.

## Open Questions

_(aucun — toutes les décisions sont tranchées)_

## Documentation

- **Guide développeur** : mettre à jour `docs/developers/calculation-engine.md` pour documenter le comportement de purge des projections orphelines.
- **Guide utilisateur** : aucune mise à jour requise — le bouton « Recalculer » est dans le panneau de debug, pas dans l'interface principale.
