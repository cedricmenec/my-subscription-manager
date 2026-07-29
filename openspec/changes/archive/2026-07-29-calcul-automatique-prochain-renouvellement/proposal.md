## Why

La date de prochain renouvellement (`nextRenewalDate`) est actuellement une valeur « morte » : elle est calculée au moment de la création ou de la modification de l'abonnement, puis n'est jamais mise à jour. Pour un abonnement en renouvellement automatique mensuel, l'utilisateur devrait en théorie la changer tous les mois — ce qui n'a aucun sens et rend le champ inutilisable.

Le moteur de calcul local-first existe déjà, avec un registre de calculateurs. Il peut supporter un calculateur dédié à la mise à jour automatique et cyclique de `nextRenewalDate`, garantissant que cette date est toujours à jour sans intervention manuelle.

## What Changes

- **Renommer `renewalStartDate` en `subscriptionDate`** : date de souscription initiale au service, ne bouge jamais après la création. **BREAKING** (changement de champ en base avec migration Dexie).
- **Ajouter `renewalPeriodStartDate`** : date de début de la période de renouvellement en cours, ajustable manuellement par l'utilisateur (ex. mois offert par le fournisseur).
- **Nouveau calculateur `next-renewal-date` dans le registre du moteur** : s'exécute au startup, sur mutation, et périodiquement (stale-check quotidien). Calcule `nextRenewalDate` par ajout cyclique du `renewalInterval` à partir de l'ancre (`renewalPeriodStartDate` > `subscriptionDate`). Idempotent : n'écrit que si la date diffère de la valeur stockée.
- **Règles d'arrêt** : `status = ENDED` → `nextRenewalDate = undefined`. `CANCELLED_PENDING_END` avec `serviceEndDate` dépassée → `undefined`.
- **Champs d'alerte** : ajout de `notifyBeforeRenewal` (boolean, opt-in/opt-out) et `notifyBeforeRenewalDays` (number) sur `Subscription`. Règles de défaut : mensuel → opt-in / 7j ; annuel → opt-out / 30j ; manuel → always / 7j. Les champs sont persistés pour consommation future par une table d'alertes (hors scope de ce lot).
- **UI du dialogue** : `nextRenewalDate` passe en lecture seule (calculé automatiquement). Ajout des champs `subscriptionDate` et `renewalPeriodStartDate`. Pré-remplissage du `renewalInterval` par défaut avec `billingInterval` lors de l'activation du mode AUTOMATIC.
- **Cohérence** : règle de validation optionnelle (sécurité) interdisant `nextChargeDate > nextRenewalDate` pour les statuts ACTIVE. Applicable uniquement lorsque `renewalInterval` et `billingInterval` sont identiques.
- **Migration Dexie** : une version supplémentaire pour :
  1. Copier `renewalStartDate` → `subscriptionDate`.
  2. Ajouter `renewalPeriodStartDate` (initialisé avec la valeur de `subscriptionDate` si absent).
  3. Ajouter `notifyBeforeRenewal` et `notifyBeforeRenewalDays` (défauts calculés au premier run du calculateur).
  4. Supprimer le champ `renewalStartDate`.

## Capabilities

### New Capabilities
- `next-renewal-date-calculator`: Calculateur idempotent du moteur pour la date de prochain renouvellement, avec règles métier (arrêt sur ENDED, cohérence vis-à-vis du statut), déclenché au startup/mutation/stale-check, et production des indicateurs d'alerte.

### Modified Capabilities
- `abonnements-v2-coeur-metier`: Le modèle `Subscription` est modifié : renommage de `renewalStartDate` → `subscriptionDate`, ajout de `renewalPeriodStartDate`, `notifyBeforeRenewal`, `notifyBeforeRenewalDays`. Règles de cohérence entre `nextRenewalDate`, `nextChargeDate` et le statut. Migration Dexie.
- `subscription-dialog`: La section Renouvellement intègre `subscriptionDate` (lecture seule après création), `renewalPeriodStartDate` (ajustable), `nextRenewalDate` (lecture seule, calculé). Pré-remplissage des intervalles par défaut. Les champs d'alerte ne sont pas exposés dans ce lot.
- `calculation-engine`: Un nouveau calculateur `next-renewal-date` est enregistré dans le registre par défaut, avec ses dépendances et sa logique de déclenchement.

## Impact

- `src/data/db.ts` : modèle `Subscription` — renommage `renewalStartDate` → `subscriptionDate`, ajout `renewalPeriodStartDate`, `notifyBeforeRenewal`, `notifyBeforeRenewalDays`. Migration Dexie (nouvelle version).
- `src/services/calculationEngine.ts` : ajout du calculateur `next-renewal-date` dans `createDefaultRegistry()`.
- `src/services/subscriptions.ts` : mise à jour du CRUD (`createSubscription`, `updateSubscription`) pour utiliser les nouveaux noms de champs. Mise à jour de `computeNextRenewalDate` pour utiliser la bonne ancre.
- `src/services/subscriptionValidation.ts` : ajout de la règle de cohérence `nextChargeDate > nextRenewalDate`. Validation des nouveaux champs.
- `src/services/finance.ts` : `projectSubscriptionPayments` lit `nextChargeDate` (inchangé). Vérifier qu'aucune référence à `renewalStartDate` ne subsiste.
- `src/components/SubscriptionDialog.tsx` : UI de la section Renouvellement — nouveaux champs, `nextRenewalDate` en lecture seule, pré-remplissage par défaut.
- `src/services/civilDate.ts` : inchangé (déjà utilisé par le calcul).
- Base de données : migration Dexie existante à mettre à jour (version incrémentée).
- Documentation développeur : `docs/developers/calculation-engine.md` à jour avec le nouveau calculateur.