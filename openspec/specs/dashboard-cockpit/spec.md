## Purpose

Définir les exigences pour le tableau de bord (dashboard) servant de page d'accueil avec cockpit de pilotage : résumé financier, prochaines échéances et alertes de complétude.

## Requirements

### Requirement: Dashboard d'accueil avec cockpit de pilotage

L'application SHALL afficher un tableau de bord (dashboard) comme page d'accueil par défaut, avec le résumé financier (4 cartes), les prochaines échéances et les alertes de complétude.

#### Scenario: Navigation par défaut vers le dashboard

- **WHEN** l'utilisateur accède à l'URL racine (sans hash)
- **THEN** la page Dashboard est affichée par défaut

#### Scenario: Affichage du résumé financier

- **WHEN** le dashboard est affiché
- **THEN** les 4 cartes de résumé financier sont affichées (coût mensuel équivalent, coût annuel équivalent, décaissements à 30 jours, décaissements à 90 jours)
- **AND** chaque carte affiche le montant et le nombre d'abonnements inclus

#### Scenario: Affichage des prochaines échéances

- **WHEN** le dashboard est affiché
- **THEN** une section liste les 5 prochaines échéances à venir
- **AND** chaque échéance affiche la date, le nom de l'abonnement et le montant

#### Scenario: Affichage des alertes de complétude

- **WHEN** le dashboard est affiché
- **THEN** une section liste les abonnements incomplets
- **AND** chaque abonnement incomplet affiche son nom et son score de complétude

### Requirement: Indicateur de synchronisation sur le dashboard

Le dashboard SHALL afficher l'état global de synchronisation et le statut de la dernière opération locale.

#### Scenario: Affichage du statut sync

- **WHEN** le dashboard est affiché
- **THEN** le statut de synchronisation est affiché
- **AND** le statut de la dernière opération locale est affiché
- **AND** un bouton "Synchroniser maintenant" est disponible