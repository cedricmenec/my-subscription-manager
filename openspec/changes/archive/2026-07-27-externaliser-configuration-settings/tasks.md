## 1. Structure et composants

- [x] 1.1 Créer le composant `TopBar` en extrayant le header actuel de `App.tsx`, avec props `currentPage`, `onNavigate`, `onOpenDiagnostic`
- [x] 1.2 Créer le composant `DiagnosticDialog` utilisant `<dialog>` HTML5, avec overlay, bouton de fermeture et gestion de la touche Échap
- [x] 1.3 Créer la page `SettingsPage` reprenant les sections Configuration (catégories, taux de conversion, connexion Dexie Cloud, local-first)
- [x] 1.4 Ajouter les fichiers de déclaration de modules dans `src/pages/` et `src/components/`

## 2. Navigation par hash

- [x] 2.1 Implémenter le state `currentPage` dans `App.tsx` (`'subscriptions' | 'settings'`)
- [x] 2.2 Synchroniser `currentPage` avec `window.location.hash` au mount et via l'événement `hashchange`
- [x] 2.3 Mettre à jour le hash lors d'un changement de page (`onNavigate`)
- [ ] 2.4 Gérer le deep linking : `#/subscriptions/<id>` → ouvre l'édition de l'abonnement
- [ ] 2.5 Gérer le fallback : hash inconnu → rediriger vers `#/subscriptions`

## 3. Refactorisation de App.tsx

- [x] 3.1 Extraire les imports et états liés à la configuration (exchangeRates, newCategoryName, identity, email, etc.) et les regrouper par section
- [x] 3.2 Remplacer le header inline par le composant `TopBar`
- [x] 3.3 Retirer la section "Taux de conversion" du rendu principal
- [x] 3.4 Retirer la section "Connexion Dexie Cloud" du rendu principal
- [x] 3.5 Retirer la section "Local-first" du rendu principal
- [x] 3.6 Retirer la section "Catégories" (intégrée au formulaire abonnement)
- [x] 3.7 Retirer la section "Diagnostic" du rendu principal
- [x] 3.8 Conditionner l'affichage : vue `subscriptions` → composants abonnements, vue `settings` → `SettingsPage`
- [x] 3.9 Passer les callbacks nécessaires à `SettingsPage` (handleAddExchangeRate, handleRemoveExchangeRate, handleLogin, handleLogout, etc.)

## 4. Implémentation du DiagnosticDialog

- [x] 4.1 Afficher les 7 champs de diagnostic (version, base, identité, réseau, synchro, dernière sync, environnement)
- [ ] 4.2 Ajouter le focus trap : Tab ne sort pas du dialogue ouvert
- [x] 4.3 Ajouter les attributs ARIA (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`)
- [x] 4.4 Fermeture par clic sur l'overlay

## 5. Styles CSS

- [x] 5.1 Ajouter les styles pour le dialogue modal (overlay, dialog, grille interne)
- [x] 5.2 Ajouter les styles pour la page Settings (sections, titres, espacement)
- [x] 5.3 Ajouter le style du bouton d'icône diagnostic dans le TopBar
- [x] 5.4 Ajouter les styles responsives pour les nouvelles pages

## 6. Tests

- [x] 6.1 Mettre à jour `App.test.tsx` pour refléter les nouvelles pages et la navigation par hash
- [x] 6.2 Vérifier que le build de production (`pnpm build`) réussit sans erreur
- [x] 6.3 Vérifier que les tests (`pnpm test`) passent