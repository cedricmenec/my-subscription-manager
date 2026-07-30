## 1. Interface du composant Dialogue

- [x] 1.1 Ajouter `onSavedAfterSave?: (saved: Subscription) => void` à `SubscriptionDialogProps`
- [x] 1.2 Remplacer `key={editingId ?? 'new'}` par `key="subscription-dialog"` dans `SubscriptionsPage`
- [x] 1.3 Ajouter le type `Subscription` à l'import depuis `../data/db`

## 2. Implémentation du dialogue

- [x] 2.1 Ajouter l'état `saveSuccess: string | null` avec `useState`
- [x] 2.2 Ajouter un `useEffect` avec `setTimeout` de 2s pour effacer `saveSuccess`
- [x] 2.3 Implémenter `handleSaveWithoutClose()` : même logique que `handleSubmit` mais sans `onClose()`, avec mise à jour de `initialFormRef.current`, appel à `onSavedAfterSave?.(saved)`, et positionnement de `saveSuccess`
- [x] 2.4 Renommer le bouton existant "Enregistrer des modifications" / "Créer" en "Sauvegarder et Fermer"
- [x] 2.5 Ajouter le bouton "Sauvegarder" en `type="button"` avec `onClick={handleSaveWithoutClose}`
- [x] 2.6 Ajouter le badge `✓ Enregistré à HH:MM` dans la zone des actions

## 3. Parent SubscriptionsPage

- [x] 3.1 Implémenter `handleSavedAfterSave(saved: Subscription)` : met à jour `editingId` et `formState` via `toFormState(saved)`, appelle `onRefreshSubscriptions()` et `onRefreshFinance()`
- [x] 3.2 Passer `onSavedAfterSave={handleSavedAfterSave}` au dialogue

## 4. Styles CSS

- [x] 4.1 Ajouter style `.save-indicator` pour le badge de confirmation (couleur verte, font-weight 600)
- [x] 4.2 Ajouter animation `@keyframes saveFadeOut` pour disparition progressive du badge

## 5. Tests

- [x] 5.1 Mettre à jour les tests existants pour utiliser "Sauvegarder et Fermer" au lieu de "Enregistrer"
- [x] 5.2 Ajouter un test : clic sur "Sauvegarder" sans fermeture ne ferme pas le dialogue
- [x] 5.3 Ajouter un test : le badge de confirmation apparaît après "Sauvegarder"
- [x] 5.4 Ajouter un test : "Annuler" après "Sauvegarder" sans modification ne demande pas confirmation
- [x] 5.5 Ajouter un test : "Sauvegarder et Fermer" ferme le dialogue et rafraîchit la liste
- [x] 5.6 Lancer la suite de tests et vérifier que tous les tests passent

## 6. Finalisation

- [x] 6.1 Synchroniser les delta specs dans les specs main
- [x] 6.2 Archiver le changement
- [x] 6.3 Git commit avec message descriptif