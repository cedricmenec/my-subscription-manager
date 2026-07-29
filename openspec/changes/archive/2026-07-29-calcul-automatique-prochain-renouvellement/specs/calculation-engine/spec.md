# calculation-engine Specification (Delta)

## Purpose
Ajout du calculateur `next-renewal-date` au registre par défaut du moteur de calcul, avec ses règles de déclenchement et la gestion de l'idempotence.

## ADDED Requirements

### Requirement: Calculateur next-renewal-date dans le registre par défaut

Le registre par défaut du moteur de calcul (`createDefaultRegistry`) SHALL inclure un calculateur identifié par `next-renewal-date`, sans dépendances déclarées, qui implémente la logique de calcul automatique de `nextRenewalDate` conformément à la spec `next-renewal-date-calculator`.

#### Scenario: Présence dans le registre

- **WHEN** le moteur de calcul est initialisé sans registre surchargé
- **THEN** le calculateur `next-renewal-date` est présent dans le registre par défaut
- **AND** son id est `'next-renewal-date'`
- **AND** sa liste `dependsOn` est vide

#### Scenario: Exécution lors d'un run complet

- **WHEN** un run complet du registre est déclenché (startup, interval, manual complet)
- **THEN** le calculateur `next-renewal-date` est exécuté
- **AND** son résultat (ok ou error) est consigné dans l'historique d'exécution

#### Scenario: Exécution ciblée

- **WHEN** un run est déclenché avec la sélection `['next-renewal-date']`
- **THEN** seul ce calculateur est exécuté
- **AND** les autres calculateurs du registre ne sont pas exécutés