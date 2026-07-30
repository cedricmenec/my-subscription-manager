## Context

Le dialogue de création/édition d'abonnement (`SubscriptionDialog`) ne propose actuellement qu'un seul bouton de soumission "Enregistrer" (ou "Créer" selon le mode) qui sauvegarde ET ferme le dialogue. L'utilisateur doit donc rouvrir la fiche pour voir les résultats des calculs du moteur (prochain renouvellement, échéances projetées).

Les services `createSubscription` et `updateSubscription` retournent déjà l'objet `Subscription` persisté avec les dates calculées par le moteur (`nextRenewalDate`, etc.), ce qui rend techniquement possible une sauvegarde sans fermeture.

## Goals / Non-Goals

**Goals:**
- Permettre à l'utilisateur de sauvegarder la fiche abonnement sans fermer le dialogue
- Afficher les dates recalculées immédiatement après la sauvegarde
- En mode création, passer automatiquement en mode édition après la première sauvegarde
- Afficher un indicateur visuel "✓ Enregistré à HH:MM" qui disparaît après 2s
- Renommer le bouton existant en "Sauvegarder et Fermer" pour clarifier son comportement

**Non-Goals:**
- Modification du comportement du bouton "Annuler"
- Modification des services de persistence (`createSubscription`, `updateSubscription`)
- Changement du flux de validation

## Decisions

### Décision 1 : Nouveau callback `onSavedAfterSave` plutôt que modification de `onSaved`

- **Choix** : Ajouter un callback optionnel `onSavedAfterSave?: (saved: Subscription) => void` dans `SubscriptionDialogProps`
- **Raison** : `onSaved` est un callback sans paramètre utilisé uniquement pour le rafraîchissement des listes. Le nouveau callback transmet l'objet `Subscription` persisté au parent pour mettre à jour `editingId` et `formState`. Séparation claire des responsabilités.
- **Alternative rejetée** : Modifier `onSaved` pour qu'il retourne l'objet. Cela casserait les appels existants et introduirait une complexité inutile.

### Décision 2 : Bouton "Sauvegarder" en type="button" avec handler dédié

- **Choix** : Le bouton "Sauvegarder" est un `type="button"` avec `onClick={handleSaveWithoutClose}`. Le bouton "Sauvegarder et Fermer" reste en `type="submit"` (comportement actuel).
- **Raison** : La soumission du formulaire par la touche Entrée continue de déclencher "Sauvegarder et Fermer" (comportement attendu). Pas de changement de comportement pour les utilisateurs clavier.

### Décision 3 : `initialFormRef` mis à jour après "Sauvegarder"

- **Choix** : Après un save sans fermeture, `initialFormRef.current` est mis à jour avec le nouveau `formState` (basé sur l'objet persisté).
- **Raison** : Sans cette mise à jour, un clic sur "Annuler" après un "Sauvegarder" déclencherait la confirmation de modifications perdues, alors que les données sont déjà persistées. Le formulaire est considéré comme "propre" après une sauvegarde.

### Décision 4 : Clé stable au lieu de `key={editingId ?? 'new'}`

- **Choix** : Remplacer la clé par `key="subscription-dialog"` (constante).
- **Raison** : Le pattern `key={editingId ?? 'new'}` force un remount complet du composant à chaque changement d'`editingId`. Après un "Sauvegarder" en création, l'`editingId` passe de `null` à une valeur, ce qui remonterait le composant et perdrait l'état. Le dialogue gère déjà son état local via `initialFormRef` et `localForm`.
- **Risque** : Le formulaire n'est plus automatiquement réinitialisé au changement d'`editingId`. C'est désormais géré via la mise à jour de `formState` dans le parent.

### Décision 5 : Badge de confirmation avec horodatage

- **Choix** : Un état `saveSuccess: { message: string; timeout: number }` avec un `useEffect` qui lance un `setTimeout` de 2 secondes.
- **Raison** : Simple, pas de dépendance externe. Le message inclut l'heure formatée (HH:MM).
- **Style** : Animation CSS `fadeOut` pour une disparition progressive.

## Risks / Trade-offs

- [Risque] Le bouton "Sauvegarder" n'étant pas `type="submit"`, il ne bénéficie pas de la validation native du formulaire → **Mitigation** : le handler `handleSaveWithoutClose` appelle `event.preventDefault()` et effectue la même validation que `handleSubmit`.
- [Risque] La clé stable pourrait causer des problèmes de réinitialisation si le parent change de abonnement → **Mitigation** : le parent met à jour `formState` (et donc `localForm` via `useState`) et `initialFormRef` via le callback `onSavedAfterSave`.
- [Risque] L'horodatage du badge utilise l'heure locale du navigateur → Accepté, cohérent avec le reste de l'application.