## Context

Le dialogue modal de création/édition d'abonnement (`SubscriptionDialog.tsx`) utilise l'élément HTML natif `<dialog>` avec `showModal()`. Actuellement, trois moyens permettent de fermer le dialogue :

1. Clic sur l'arrière-plan (`handleBackdropClick` : si `event.target === dialogRef.current`, appel à `onClose()`)
2. Touche Échap (`handleKeyDown` : si `event.key === 'Escape'`, appel à `onClose()`)
3. Bouton "Annuler" (`onClick={onClose}`)

Dans les trois cas, les modifications en cours dans le formulaire sont perdues sans confirmation. Le composant reçoit un `formState` initial, mais l'état local (`localForm`) évolue via `updateField`. Une simple comparaison entre les deux permet de détecter les modifications.

## Goals / Non-Goals

**Goals:**
- Empêcher la fermeture du dialogue par clic sur l'arrière-plan si le formulaire contient des modifications non sauvegardées
- Demander une confirmation avant de fermer via Échap ou bouton "Annuler" si le formulaire est modifié
- Permettre à l'utilisateur de choisir "Rester" (conserver les modifications) ou "Annuler" (perdre les modifications)
- Laisser le dialogue se fermer sans confirmation si aucune modification n'a été faite

**Non-Goals:**
- Sauvegarde automatique des modifications (hors scope)
- Suivi granulaire champ-par-champ des modifications (la comparaison est faite au niveau du formulaire complet)
- Modification de l'interface `SubscriptionDialogProps` ou de son utilisation dans `SubscriptionsPage.tsx`

## Decisions

1. **Comparaison JSON simple** plutôt que suivi d'état "dirty"
   - On compare `JSON.stringify(formState)` avec `JSON.stringify(localForm)` à chaque demande de fermeture
   - Avantage : pas de état "dirty" à maintenir, pas de risque de désynchronisation, réinitialisation implicite quand les props changent
   - Alternative rejetée : suivi via `useRef(isDirty)` mis à jour sur chaque `updateField` — plus complexe et redondant avec la comparaison directe

2. **Dialogue de confirmation via `window.confirm()`** plutôt qu'un composant modal dédié
   - Avantage : immédiat, pas de nouveau composant à créer, pas de gestion d'état supplémentaire
   - Inconvénient : moins personnalisable visuellement
   - Accepté car le dialogue natif est suffisant pour ce cas d'usage et l'utilisateur est familier avec ce motif

3. **Comportement différencié** selon le moyen de fermeture
   - Clic sur l'arrière-plan (`handleBackdropClick`) : ne fait rien si le formulaire est modifié (contrairement au comportement actuel qui ferme)
   - Échap et bouton "Annuler" : affichent une confirmation si modifié, ferment directement si non modifié
   - Justification : un clic involontaire sur l'arrière-plan est le cas le plus fréquent de perte de données ; la confirmation pour Échap/Annuler reste utile mais moins critique

4. **Aucune modification de la spec `subscription-dialog` au niveau du design** — les changements de comportement sont documentés via un delta spec dans `unsaved-changes-guard`

## Risks / Trade-offs

- **[Simplicité]** L'utilisation de `window.confirm()` n'est pas stylisée et peut paraître déconnectée du thème de l'application. → Accepté car fonctionnel et sans coût de développement.
- **[Régression]** Le comportement actuel (fermeture sans confirmation si aucun changement) doit être préservé. → La comparaison JSON garantit que seuls les formulaires modifiés déclenchent la confirmation.
- **[Edge case]** Si `formState` change en externe (ex: réinitialisation depuis le parent), `localForm` n'est pas mis à jour immédiatement (il est initialisé une fois à l'ouverture). → Ce comportement est existant et non modifié par cette feature.