## 1. Composant ConfirmDialog

- [ ] 1.1 Créer le composant `src/components/ConfirmDialog.tsx` avec `<dialog>` natif
- [ ] 1.2 Créer les tests `src/components/ConfirmDialog.test.tsx`
- [ ] 1.3 Ajouter les styles CSS pour le dialogue de confirmation (`.confirm-dialog`, `.confirm-dialog-actions`, `.warning-button`)

## 2. Intégration dans SubscriptionsPage

- [ ] 2.1 Ajouter l'état `confirmArchive` dans `SubscriptionsPage` et instancier `ConfirmDialog`
- [ ] 2.2 Modifier `handleArchive` pour ouvrir le dialogue avant d'archiver

## 3. Intégration dans SettingsPage

- [ ] 3.1 Ajouter l'état `confirmDeleteCategory` dans `SettingsPage` et instancier `ConfirmDialog`
- [ ] 3.2 Modifier le bouton "Supprimer" des catégories pour ouvrir le dialogue
- [ ] 3.3 Ajouter l'état `confirmRemoveRate` dans `SettingsPage` et instancier `ConfirmDialog`
- [ ] 3.4 Modifier le bouton "Supprimer" des taux de change pour ouvrir le dialogue

## 4. Vérification

- [ ] 4.1 Vérifier que la compilation TypeScript réussit
- [ ] 4.2 Vérifier que les tests passent
- [ ] 4.3 Vérifier le comportement visuel du dialogue