# diagnostic-calc-visibility Specification

## Purpose

Améliorer la page Diagnostic avec une visibilité enrichie de la timeline des calculs du moteur (incluant les résultats du calculateur `next-renewal-date`) et un contrôle de relance manuelle des calculs.

> **Note** : Cette spécification est un delta par rapport à la spec existante `diagnostic-page`. Elle ajoute des requirements sans modifier les existants.

## ADDED Requirements

### Requirement: Visibilité des logs dédiés next-renewal-date dans la timeline

La timeline des exécutions du moteur de calcul SHALL afficher des entrées dédiées pour les logs `next-renewal-date-result` et `next-renewal-date-error`, avec des métriques spécifiques à ce calculateur.

#### Scenario: Affichage du résultat de next-renewal-date

- **WHEN** un log avec `event=next-renewal-date-result` est présent dans `diagnosticLogs`
- **THEN** une entrée dédiée est affichée dans la timeline avec l'horodatage
- **AND** le nombre d'abonnements mis à jour (`updatedCount`) est affiché
- **AND** le nombre d'abonnements ignorés inchangés (`skippedCount`) est affiché
- **AND** le nombre d'erreurs (`errorCount`) est affiché
- **AND** si `errorCount > 0`, l'entrée est mise en évidence visuellement (rouge)

#### Scenario: Affichage d'une erreur individuelle next-renewal-date

- **WHEN** un log avec `event=next-renewal-date-error` est présent dans `diagnosticLogs`
- **THEN** une entrée dédiée est affichée dans la timeline avec l'horodatage
- **AND** un badge rouge ❌ indique une erreur
- **AND** le nom ou l'ID de l'abonnement concerné est affiché
- **AND** le message d'erreur est affiché

### Requirement: Bouton de relance manuelle des calculs

La page Diagnostic SHALL fournir un bouton pour déclencher manuellement une exécution complète du moteur de calcul.

#### Scenario: Bouton présent et accessible

- **WHEN** l'utilisateur consulte la page Diagnostic
- **THEN** un bouton « Relancer les calculs » est affiché
- **AND** le bouton n'est pas désactivé si aucun run n'est en cours

#### Scenario: Exécution manuelle

- **WHEN** l'utilisateur clique sur « Relancer les calculs »
- **THEN** un run complet du moteur de calcul est déclenché avec le trigger `manual`
- **AND** un indicateur visuel de chargement est affiché pendant l'exécution
- **AND** le bouton est désactivé pendant l'exécution pour éviter les double-clics

#### Scenario: Indicateur du dernier run

- **WHEN** un run s'est terminé
- **THEN** la date et l'heure du dernier run sont affichées
- **AND** le statut du dernier run (completed / failed) est affiché