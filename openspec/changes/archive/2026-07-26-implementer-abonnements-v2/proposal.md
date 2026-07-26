## Why

Le socle frontend et local-first est en place, mais l'application ne gère pas encore le coeur métier des abonnements. Ce changement couvre le Lot 2 afin de rendre l'application utile au quotidien: créer, modifier, classer et qualifier les abonnements avec leurs statuts de cycle de vie, leurs paramètres de facturation et leurs informations d'action rapide.

Ce lot cible en priorité OBJ-MET-002, OBJ-MET-003 et OBJ-MET-004, et prépare les lots suivants (paiements, dashboard financier, import, alertes n8n) sans introduire de backend applicatif.

## What Changes

- Étendre le modèle `subscriptions` pour représenter les statuts métier, les dates civiles, le mode de renouvellement et les champs de gestion/annulation.
- Introduire la gestion des catégories nécessaires à l'organisation de la liste.
- Implémenter le CRUD des abonnements en local-first (validation locale, persistance immédiate, synchronisation asynchrone).
- Ajouter une liste d'abonnements avec recherche, filtres de base et tri principal.
- Ajouter une vue formulaire (création/édition) avec validations métier minimales.
- Ajouter un indicateur de complétude et une vue « À compléter ».
- Ajouter les tests unitaires et d'intégration couvrant règles de statut, validations et comportement hors ligne.

## Non-goals

- Ne pas implémenter les paiements, ni les calculs de coûts mensuels/annuels consolidés (Lot 3).
- Ne pas implémenter l'import XLSX/CSV/JSON et sa simulation (Lot 4).
- Ne pas implémenter les workflows n8n et les notifications planifiées (Lot 5).
- Ne pas ajouter de backend applicatif personnalisé, d'API métier, ni de base distante gérée par le projet.

## Capabilities

### New Capabilities

- `abonnements-v2-coeur-metier`: modèle métier des abonnements, CRUD local-first, liste filtrable, formulaire et complétude.

### Modified Capabilities

- `socle-local-first-dexie`: évolution du schéma Dexie pour supporter les champs métier du lot.

## Impact

- Schéma IndexedDB: évolution de version avec migration déterministe.
- Interface: nouveaux écrans/composants pour liste, édition et complétude.
- Services: validations métier et helpers de normalisation des données civiles.
- Tests: couverture additionnelle des règles RG-STA-*, RG-REN-*, FUN-CRUD-* et TECH-LF-* applicables.
- Sécurité: aucune introduction de secret frontend; conservation des frontières SEC-002 et SEC-003.
