## Context

La page `SubscriptionsPage` (`src/pages/SubscriptionsPage.tsx`) affiche une liste d'abonnements avec une barre de recherche (`AdvancedSearchBar`) et des filtres avancés. L'objet `filters` est correctement construit via `useMemo` à partir de l'état local, mais le `useMemo` `filteredSubscriptions` n'applique que les filtres de dates (`dateMin`, `dateMax`) et de montants (`amountMin`, `amountMax`), ainsi que le tri. Les filtres `search`, `status`, `categoryId`, `renewalMode` et `onlyIncomplete` sont totalement ignorés.

## Goals / Non-Goals

**Goals:**
- Brancher tous les filtres manquants dans `filteredSubscriptions`
- Ajouter un debounce de 300ms sur la recherche textuelle
- Conserver les filtres existants (dates, montants, tri)
- Ne pas modifier le contrat de l'interface `AdvancedSearchBar` de façon breaking

**Non-Goals:**
- Refactorer la page en composants plus petits (hors scope)
- Ajouter de nouveaux filtres
- Modifier la logique côté serveur ou Dexie
- Changer le comportement du dialogue de diagnostic

## Decisions

### Décision 1 : Filtrage côté client dans le useMemo
**Choix** : Appliquer les filtres manquants directement dans le `useMemo` `filteredSubscriptions` de `SubscriptionsPage.tsx`.

**Justification** : Les données sont déjà chargées en mémoire (local-first Dexie). Le filtrage côté client est instantané et ne nécessite aucune modification de l'architecture. C'est le pattern déjà utilisé pour les filtres de dates et montants.

**Alternatives rejetées** :
- Filtrage via une fonction dédiée dans `subscriptions.ts` : ajouterait de l'indirection sans bénéfice pour ce cas d'usage simple.
- Filtrage Dexie : inutile car les données sont déjà en mémoire et le nombre d'abonnements est faible.

### Décision 2 : Debounce via useState + useEffect
**Choix** : Utiliser un état intermédiaire `searchDraft` mis à jour instantanément, et un état `search` effectif mis à jour avec un `useEffect` debounce de 300ms.

**Justification** : Pattern React pur, sans dépendance externe (pas de lodash/debounce). Simple et testable.

**Alternatives rejetées** :
- `use-debounce` package : dépendance externe inutile pour une fonctionnalité simple.
- Debounce dans `AdvancedSearchBar` : déplacerait la logique hors du composant qui gère l'état.

### Décision 3 : Recherche textuelle sur name, provider, notes
**Choix** : La recherche textuelle inspecte les champs `name`, `provider` et `notes` avec une comparaison `includes()` insensible à la casse.

**Justification** : Ces 3 champs sont les plus pertinents pour la recherche utilisateur. `planName` est optionnel et redondant avec `name` dans la plupart des cas.

## Risks / Trade-offs

[Risk] Performance sur très grande liste → [Mitigation] Le filtrage useMemo est optimisé ; le debounce limite les recalculs. Pour >1000 abonnements, envisager un Web Worker.

[Risk] Debounce peut sembler lent pour l'utilisateur → [Mitigation] 300ms est un standard UX. Le `searchDraft` reste instantané pour la saisie.

## Migration Plan

Aucune migration nécessaire. Le changement est purement côté UI, sans modification de schéma de données.

## Open Questions

Aucune.
