## Why

Le calculateur `next-renewal-date` est implémenté et s'exécute correctement dans le moteur de calcul. Cependant, ses logs de résultat dédiés (`next-renewal-date-result`, `next-renewal-date-error`) sont absents de la timeline de diagnostic, contrairement à ceux de `projected-payments`. Par ailleurs, aucun bouton ne permet de relancer manuellement les calculs depuis l'interface de diagnostic, ce qui rend difficile la validation et le débogage.

## What Changes

- Ajout d'un rendu dédié pour les logs `next-renewal-date-result` et `next-renewal-date-error` dans le composant `CalculationTimeline`, avec le nombre d'abonnements mis à jour, ignorés, et en erreur
- Ajout d'un bouton « Relancer tous les calculs » sur la page Diagnostic, déclenchant `calculationEngine.run(undefined, 'manual')`
- Ajout d'un indicateur visuel de progression pendant le run (loading + dernier run)
- Aucun changement dans le comportement du calculateur lui-même — l'affichage et le contrôle sont purement des améliorations de l'interface de diagnostic

## Capabilities

### New Capabilities
- `diagnostic-calc-visibility`: Visibilité enrichie de la timeline des calculs, incluant les résultats dédiés de chaque calculateur du registre, et contrôle de relance manuelle depuis la page Diagnostic

### Modified Capabilities
- <!-- Aucun changement de requirement dans les specs existantes. Le comportement du calculateur next-renewal-date et de la timeline est inchangé — seul l'affichage des logs déjà produits est ajouté. -->

## Impact

Fichiers impactés :
- `src/components/diagnostic/CalculationTimeline.tsx` : ajout du rendu des logs `next-renewal-date-result` et `next-renewal-date-error`
- `src/pages/DiagnosticPage.tsx` : ajout du bouton de relance manuelle et affichage de l'état d'exécution (dernier run, loading)
- `src/App.tsx` : passage de `calculationEngine` à `DiagnosticPage` (déjà passé, mais vérifier que `run` est accessible)

Aucun impact sur les specs existantes, le comportement métier, ou les dépendances.