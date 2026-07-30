## Why

L'utilisateur a besoin de sauvegarder la fiche abonnement sans fermer le dialogue, afin de déclencher les recalculs du moteur (prochain renouvellement, prochaines échéances) et voir les résultats immédiatement, sans devoir rouvrir la fiche.

## What Changes

- Ajout d'un bouton "Sauvegarder" dans le dialogue de création/édition d'abonnement, qui sauvegarde la fiche sans fermer le dialogue
- Renommage du bouton "Enregistrer" existant en "Sauvegarder et Fermer" (comportement inchangé : sauvegarde + fermeture)
- Affichage d'un badge "✓ Enregistré à HH:MM" après une sauvegarde réussie, qui disparaît après 2 secondes
- Après un "Sauvegarder" en création, le dialogue passe en mode édition (titre "Modifier", editingId positionné) avec les données fraîches persistées
- Nouveau callback `onSavedAfterSave` du dialogue vers le parent pour permettre la mise à jour de l'editingId et du formState sans fermeture
- Le bouton "Annuler" reste inchangé

## Capabilities

### New Capabilities

- `save-without-close`: Permet à l'utilisateur de sauvegarder la fiche abonnement sans fermer le dialogue, avec un indicateur visuel de succès

### Modified Capabilities

- `subscription-dialog`: ajout de deux nouveaux boutons d'action ("Sauvegarder" et "Sauvegarder et Fermer") et d'un indicateur de dernière sauvegarde

## Impact

- `src/components/SubscriptionDialog.tsx` : ajout du bouton "Sauvegarder", renommage du bouton existant, logique de sauvegarde sans fermeture, badge de confirmation
- `src/pages/SubscriptionsPage.tsx` : nouveau handler `onSavedAfterSave` pour mettre à jour editingId et formState
- `src/styles.css` : styles pour le badge de confirmation et le nouveau layout des boutons
- `src/components/SubscriptionDialog.test.tsx` : nouveaux tests pour les deux boutons