## Context

Actuellement, les actions destructrices de l'application sont gérées de façon incohérente :
- Archivage d'abonnement, suppression de catégorie, suppression de taux de change : aucune confirmation
- Purge des données locales, restauration snapshot : `window.confirm()` natif (non stylisé, pas accessible)

L'application utilise déjà le pattern `<dialog>` natif via `DiagnosticDialog` et `SubscriptionDialog`.

## Goals / Non-Goals

**Goals :**
- Composant React `ConfirmDialog` réutilisable basé sur `<dialog>`
- Confirmation systématique avant toute action destructrice
- Adaptation du libellé selon le type d'action (archivage vs suppression)
- Accessibilité (focus trap, clavier, aria)
- Remplacer les `window.confirm()` existants

**Non-Goals :**
- Ne pas modifier la logique métier de suppression/archivage
- Ne pas introduire de dépendance externe

## Decisions

### 1. Composant unique avec `variant` plutôt que des composants séparés
Un seul composant `ConfirmDialog` avec une prop `variant: 'danger' | 'warning'` pour adapter le style visuel (couleur du bouton confirm). Évite la duplication et reste simple.

### 2. Props `ConfirmDialog`
```typescript
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmLabel?: string     // "Accepter" par défaut
  cancelLabel?: string      // "Refuser" par défaut
  variant?: 'danger' | 'warning'  // danger = rouge, warning = orange
  isLoading?: boolean
}
```

### 3. Gestion asynchrone de `onConfirm`
Le composant gère lui-même l'état de chargement pendant l'exécution de `onConfirm` si c'est une Promise. Le bouton "Accepter" est désactivé et affiche un indicateur de chargement.

### 4. Utilisation de `<dialog>` natif
Même pattern que `DiagnosticDialog` : `showModal()` pour l'ouverture, gestion du `close` event, piège de focus.

### 5. Pas de replacement de `window.confirm` dans DataPage pour l'instant
Le `window.confirm` dans `DataPage` (restauration snapshot) et `App.tsx` (purge locale) sera remplacé dans un second temps pour éviter de trop complexifier ce changement. Les messages sont déjà détaillés.

## Risks / Trade-offs

- **Risque :** Oubli d'intégrer le dialogue sur une future action destructrice → **Mitigation :** Ajout d'une règle dans les specs et dans le fichier de conventions du projet
- **Risque :** Le composant dialog natif a un support variable selon les navigateurs → **Mitigation :** Compatible avec tous les navigateurs modernes (PWA requirement)