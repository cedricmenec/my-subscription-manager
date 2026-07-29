## 1. Timeline - Visibilité des logs next-renewal-date

- [x] 1.1 Ajouter le rendu des logs `next-renewal-date-result` dans `CalculationTimeline.tsx` avec badge 📅, updatedCount, skippedCount, errorCount, et mise en évidence rouge si errorCount > 0
- [x] 1.2 Ajouter le rendu des logs `next-renewal-date-error` dans `CalculationTimeline.tsx` avec badge rouge ❌, ID de l'abonnement et message d'erreur
- [x] 1.3 Ajouter les classes CSS nécessaires dans `styles.css` pour les nouveaux badges et états de la timeline (`.badge-renewal`, `.badge-error`, `.diagnostic-timeline-item-error`)

## 2. Diagnostic page - Bouton de relance manuelle

- [x] 2.1 Ajouter un state local `{ isRunning, lastRunStatus, lastRunAt }` dans `DiagnosticPage.tsx` pour suivre l'état d'exécution
- [x] 2.2 Ajouter un bouton « Relancer les calculs » dans la page Diagnostic, désactivé pendant l'exécution (isRunning = true)
- [x] 2.3 Au clic, appeler `calculationEngine.run(undefined, 'manual')` et mettre à jour le state (isRunning → loading → lastRunStatus/lastRunAt)
- [x] 2.4 Afficher l'indicateur du dernier run (date/heure et statut) après la fin d'une exécution, dans un bloc discret sous le bouton

## 3. Vérification et tests

- [x] 3.1 Vérifier que `pnpm dev` ou `vite build` compile sans erreur avec les modifications
- [x] 3.2 Vérifier que la page Diagnostic s'affiche correctement et que la timeline montre les nouveaux logs (via `useLiveQuery` sur `diagnosticLogs`)