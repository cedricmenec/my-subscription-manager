## 1. Détection des modifications non sauvegardées

- [x] 1.1 Ajouter une fonction `hasUnsavedChanges` dans `SubscriptionDialog.tsx` qui compare `JSON.stringify(formState)` avec `JSON.stringify(localForm)`
- [x] 1.2 Vérifier que la détection fonctionne pour tous les champs du formulaire (texte, nombres, dates, select, boolean)

## 2. Protection contre la fermeture par clic sur l'arrière-plan

- [x] 2.1 Modifier `handleBackdropClick` pour appeler `onClose()` seulement si `!hasUnsavedChanges()`, sinon ne rien faire
- [x] 2.2 Vérifier que le comportement existant (fermeture sans modification) est préservé

## 3. Confirmation pour la touche Échap

- [x] 3.1 Modifier `handleKeyDown` pour afficher `window.confirm('Voulez-vous vraiment annuler les modifications en cours ?')` si `hasUnsavedChanges()`, et ne fermer que si l'utilisateur confirme
- [x] 3.2 Vérifier que Échap ferme directement si aucune modification n'a été faite

## 4. Confirmation pour le bouton Annuler

- [x] 4.1 Modifier le `onClick` du bouton "Annuler" pour afficher `window.confirm('Voulez-vous vraiment annuler les modifications en cours ?')` si `hasUnsavedChanges()`, et ne fermer que si l'utilisateur confirme
- [x] 4.2 Vérifier que le bouton Annuler ferme directement si aucune modification n'a été faite

## 5. Tests

- [x] 5.1 Ajouter des tests unitaires pour la fonction `hasUnsavedChanges` (comparaison des états)
- [x] 5.2 Ajouter des tests sur le comportement de fermeture avec et sans modifications (mock de `window.confirm`)
- [x] 5.3 Lancer les tests existants et vérifier qu'ils passent toujours (`pnpm vitest run`)

## 6. Build et vérification

- [x] 6.1 Lancer `pnpm tsc` et vérifier l'absence d'erreurs TypeScript
- [x] 6.2 Lancer `pnpm build` et vérifier que la compilation Vite réussit