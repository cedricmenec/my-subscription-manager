## Why

Actuellement, les actions destructrices dans l'application sont incohérentes : certaines utilisent `window.confirm()` (boîte native non stylisée), d'autres n'ont aucune confirmation. Il manque un composant React réutilisable pour standardiser l'expérience utilisateur lors des confirmations de suppression/archivage.

## What Changes

- Création d'un composant React générique `ConfirmDialog` utilisant `<dialog>` (comme `DiagnosticDialog`)
- Intégration du dialogue sur toutes les actions destructrices :
  - Archivage d'un abonnement (soft delete)
  - Suppression d'une catégorie (hard delete)
  - Suppression d'un taux de change (hard delete)
- Remplacement des `window.confirm()` existants par le nouveau composant :
  - Purge des données locales
  - Restauration d'un snapshot
- Adaptation du libellé selon le type d'action : "Archiver" pour soft delete, "Supprimer" pour hard delete
- Ajout d'une spec décrivant la règle UI/UX de confirmation systématique

## Capabilities

### New Capabilities
- `confirm-dialog`: Composant React réutilisable de dialogue de confirmation avec deux boutons "Accepter" et "Refuser", supportant les variantes danger/warning, et s'adaptant au contexte (archivage vs suppression)

### Modified Capabilities
- `settings-interface`: Ajout de la confirmation avant suppression d'une catégorie et d'un taux de change
- `subscription-list`: Ajout de la confirmation avant archivage d'un abonnement
- `socle-frontend-statique`: Remplacement des `window.confirm()` par le composant `ConfirmDialog`

## Impact

- Nouveau fichier : `src/components/ConfirmDialog.tsx`
- Nouveau fichier : `src/components/ConfirmDialog.test.tsx`
- Modifications : `SubscriptionsPage.tsx`, `SettingsPage.tsx`, `App.tsx`, `DataPage.tsx`
- Ajout de styles CSS pour le dialogue de confirmation
- Nouvelle spec : `openspec/specs/confirm-dialog/spec.md`