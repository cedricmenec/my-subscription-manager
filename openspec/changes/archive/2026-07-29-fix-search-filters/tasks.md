## 1. Implémenter les filtres manquants dans filteredSubscriptions

- [x] 1.1 Ajouter le filtrage par recherche textuelle (search) sur name, provider, notes — insensible à la casse
- [x] 1.2 Ajouter le filtrage par statut (status) — exclure quand la valeur est 'ALL'
- [x] 1.3 Ajouter le filtrage par catégorie (categoryId) — exclure quand la valeur est 'ALL'
- [x] 1.4 Ajouter le filtrage par mode de renouvellement (renewalMode) — exclure quand la valeur est 'ALL'
- [x] 1.5 Ajouter le filtrage onlyIncomplete via computeSubscriptionCompletion

## 2. Ajouter le debounce sur la recherche textuelle

- [x] 2.1 Créer un état searchDraft pour la saisie instantanée et un état search effectif
- [x] 2.2 Implémenter un useEffect avec setTimeout de 300ms pour debouncer la saisie
- [x] 2.3 Nettoyer le timeout à chaque nouvelle saisie et au démontage

## 3. Adapter le call-site pour le debounce

- [x] 3.1 Passer searchDraft à AdvancedSearchBar et search dans filters useMemo
- [x] 3.2 Mettre à jour la dépendance du useMemo pour utiliser search (debounced) au lieu de searchDraft

## 4. Vérification et tests

- [x] 4.1 Lancer pnpm build pour vérifier l'absence d'erreurs TypeScript
- [x] 4.2 Lancer pnpm test pour vérifier l'absence de tests cassés
- [x] 4.3 Vérifier manuellement que la recherche par nom/fournisseur/notes fonctionne
- [x] 4.4 Vérifier manuellement que les filtres statut, catégorie, renouvellement fonctionnent
- [x] 4.5 Vérifier manuellement que la combinaison de filtres fonctionne (logique ET)
- [x] 4.6 Vérifier manuellement que le debounce est perceptible (~300ms)
