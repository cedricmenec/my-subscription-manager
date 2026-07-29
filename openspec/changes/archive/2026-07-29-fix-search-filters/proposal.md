## Why

La page de gestion des abonnements (`SubscriptionsPage`) expose une barre de recherche et des filtres avancés (catégorie, statut, mode de renouvellement, dates, montants) mais la plupart de ces filtres sont déconnectés de la logique de filtrage. Le champ `search`, le filtre `status`, le filtre `categoryId` et le filtre `renewalMode` sont capturés dans l'état React et passés à un objet `filters`, mais le `useMemo` qui calcule `filteredSubscriptions` ne les applique jamais. L'utilisateur tape un nom, sélectionne une catégorie ou un statut, et la liste ne réagit pas.

## What Changes

- Implémenter les conditions de filtrage manquantes dans `filteredSubscriptions` :
  - **search** : recherche textuelle insensible à la casse sur `name`, `provider`, `notes`
  - **status** : filtrage par `SubscriptionStatus` (exclure `'ALL'`)
  - **categoryId** : filtrage par catégorie (exclure `'ALL'`)
  - **renewalMode** : filtrage par mode de renouvellement (exclure `'ALL'`)
  - **onlyIncomplete** : ne montrer que les abonnements incomplets via `computeSubscriptionCompletion`
- Ajouter un debounce (~300ms) sur le champ de recherche textuelle pour éviter des recalculs excessifs lors de la frappe
- Conserver les filtres existants (dateMin, dateMax, amountMin, amountMax, tri) qui fonctionnent déjà

## Capabilities

### Modified Capabilities
- **subscription-list** : la liste des abonnements doit filtrer en temps réel par nom/fournisseur, statut, catégorie et mode de renouvellement, avec debounce sur la recherche textuelle
- **subscription-dialog** : le dialogue de diagnostic doit refléter les mêmes critères de complétude pour le filtre `onlyIncomplete`

## Impact

- `src/pages/SubscriptionsPage.tsx` — ajout des conditions de filtrage et du debounce
- `src/components/AdvancedSearchBar.tsx` — ajout d'un callback `onSearchDebounceChange` ou gestion interne du debounce
- `src/services/subscriptions.ts` — aucune modification de contrat, `computeSubscriptionCompletion` déjà exporté
