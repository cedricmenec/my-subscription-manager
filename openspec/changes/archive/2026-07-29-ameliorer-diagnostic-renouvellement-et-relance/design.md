## Context

La page Diagnostic affiche une timeline des exécutions du moteur de calcul via le composant `CalculationTimeline`. Actuellement, la timeline sait afficher :

1. Les **run summaries** (entrées avec `trigger`, `status`, `entries`) → affichage complet : heure, déclencheur, durée, détail des calculateurs
2. Les **logs `projected-payments-result`** (event dédié avec `deleteCount`, `createCount`) → affichage avec badge 📝 et compteurs d'écritures

Les autres logs dédiés (`next-renewal-date-result`, `next-renewal-date-error`) sont ignorés (`return null`) car le composant ne les traite pas.

Par ailleurs, la page Diagnostic ne propose aucun contrôle utilisateur : pas de bouton pour relancer les calculs, pas d'indicateur de l'état courant du moteur (en cours d'exécution, dernier run, etc.).

## Goals / Non-Goals

**Goals:**
- Rendre visibles dans la timeline les logs dédiés `next-renewal-date-result` et `next-renewal-date-error`, avec des informations pertinentes (updatedCount, skippedCount, errorCount, etc.)
- Ajouter un bouton « Relancer les calculs » sur la page Diagnostic, accessible uniquement quand aucun run n'est en cours
- Ajouter un indicateur visuel : date et statut du dernier run complet
- Utiliser les mécanismes existants (pas de nouvelle table, pas de nouveau service)

**Non-Goals:**
- Modifier le moteur de calcul, le registre, ou le comportement des calculateurs
- Ajouter un historique persistant des runs (les logs Dexie suffisent)
- Ajouter un déclencheur programmatique autre que le `manual` existant
- Ajouter un bouton pour relancer un calculateur spécifique uniquement

## Decisions

### D1 — Logs `next-renewal-date-result` rendus comme des entrées dédiées

**Choix :** Ajouter un bloc `if` dans `CalculationTimeline` similaire à `isProjectedResult`, qui parse les logs avec `event === 'next-renewal-date-result'` et affiche :
- Badge 📅 pour le type
- `updatedCount` / `skippedCount` / `errorCount`
- Mise en évidence en rouge si `errorCount > 0`

**Alternatives rejetées :**
- Génériser le rendu de tous les logs `calc-engine` pour qu'ils soient tous affichés → moins lisible, chaque calculateur a des métriques différentes
- Ajouter un champ `category` dans le message JSON pour un rendu générique → sur-ingénierie pour 2 calculateurs

### D2 — Logs `next-renewal-date-error` affichés avec le nom de l'abonnement

**Choix :** Ajouter un bloc pour `event === 'next-renewal-date-error'` qui affiche un badge rouge ❌ avec l'ID de l'abonnement en erreur.

**Risque :** L'ID d'abonnement (e.g. `sbs-a1b2c3d4`) n'est pas très parlant. Mais pour le diagnostic c'est suffisant — l'utilisateur peut chercher l'abonnement dans la liste. On pourrait à l'avenir afficher le nom, mais cela nécessiterait soit une jointure (complexe en temps réel), soit d'enrichir le log (modification du calculateur, hors scope).

### D3 — Bouton « Relancer les calculs » sur la page Diagnostic

**Choix :** Ajouter un bouton dans `DiagnosticPage` qui :
1. Appelle `calculationEngine.run(undefined, 'manual')`
2. Pendant l'exécution, affiche un indicateur de chargement
3. Après l'exécution, affiche la date et le statut du dernier run

**Implémentation :**
- `DiagnosticPage` reçoit déjà `calculationEngine: CalculationEngine` en props
- Pas besoin de modifier `App.tsx`
- Utiliser un state local `{ isRunning, lastRunStatus, lastRunAt }`

**Alternatives rejetées :**
- Ajouter le bouton dans `CalculationTimeline` → ce n'est pas la responsabilité de ce composant
- Utiliser un context global → pas nécessaire, `DiagnosticPage` a déjà l'engine en props

## Risks / Trade-offs

- **[Faible] Rafraîchissement de la timeline** : Après un run manuel, la timeline se met à jour automatiquement car `useLiveQuery` réagit aux changements de `diagnosticLogs`. Pas de risque.
- **[Faible] Concurrence d'appels** : Si l'utilisateur clique plusieurs fois, le moteur gère déjà l'idempotence via le flag `isRunning`. Le bouton sera désactivé pendant l'exécution.
- **[Nul] Impact performance** : Le rendu conditionnel en plus dans `CalculationTimeline` est négligeable (quelques lignes de JSX de plus par entrée).
- **[Faible] Pas de guide développeur nécessaire** : Le changement est localisé dans des composants React existants, sans nouveau concept ou sous-système. Aucun guide développeur requis.
- **[Faible] Pas de guide utilisateur nécessaire** : La page Diagnostic étant réservée au diagnostic technique, son amélioration reste dans le même registre. Aucun guide utilisateur requis.