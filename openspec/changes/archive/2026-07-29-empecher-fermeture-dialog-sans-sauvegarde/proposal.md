## Why

Actuellement, lorsque l'utilisateur clique en dehors de la fenêtre de dialogue de création ou de modification d'un abonnement (clic sur l'arrière-plan), la fenêtre se ferme immédiatement sans sauvegarder les modifications en cours. Cela entraîne une perte de données saisies, ce qui est très frustrant pour l'utilisateur.

## What Changes

- Le clic sur l'arrière-plan (`<dialog>` lui-même via `handleBackdropClick`) ne ferme plus le dialogue si le formulaire contient des modifications non sauvegardées.
- La touche Échap ouvre une boîte de confirmation "Voulez-vous vraiment annuler les modifications en cours ?" si le formulaire est modifié.
- Le bouton "Annuler" ouvre également cette confirmation si le formulaire est modifié.
- Un mécanisme de détection de "formulaire modifié" est implémenté en comparant l'état initial du formulaire (`formState`) avec l'état local courant (`localForm`).
- La spécification `subscription-dialog` est modifiée pour refléter ces nouveaux comportements.

## Capabilities

### New Capabilities
- `unsaved-changes-guard`: Protection contre la perte de modifications non sauvegardées dans le dialogue d'abonnement

### Modified Capabilities
- `subscription-dialog`: Les scénarios de fermeture du dialogue sont modifiés pour prendre en compte l'état de modification du formulaire

## Impact

- **Fichier modifié** : `src/components/SubscriptionDialog.tsx` — ajout de la détection de formulaire modifié, modification de `handleBackdropClick`, `handleKeyDown`, et `onClose` pour les boutons Annuler.
- **Fichier modifié** : `openspec/specs/subscription-dialog/spec.md` — mise à jour des scénarios de fermeture.
- **Aucun impact sur les autres composants** : l'interface `SubscriptionDialogProps` reste inchangée.