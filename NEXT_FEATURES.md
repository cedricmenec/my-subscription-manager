# Next Features

## Format

- Type de feature
- Périmètre (grandes lignes)

## Backlog proposé

| Type de feature | Périmètre (grandes lignes) |
|---|---|
| Finances et paiements (Lot 3) | Table `payments`, statuts `PROJECTED/ASSUMED_PAID/CONFIRMED_PAID/SKIPPED/REFUNDED`, génération d'échéances, correction manuelle, calcul coût mensuel/annuel, décaissements à 30/90 jours, dépenses période. |
| Vue Échéances | Calendrier + liste chronologique, filtres par événement et horizon (7/30/60/90/365), mise en avant des renouvellements automatiques et des dates limites d'annulation. |
| Import/Export (Lot 4) | Import XLSX/CSV/JSON avec simulation, détection d'ambiguïtés (cycle, statuts, commentaires), transaction multi-table, export JSON restaurable + CSV abonnements/paiements. |
| Alertes n8n (Lot 5) | Workflow quotidien 08:00 Europe/Paris, idempotence des envois, digest e-mail, journal `notificationDeliveries`, passage des paiements échus en `ASSUMED_PAID`, supervision erreurs/retry. |
| Tableau de bord financier | KPI consolidés (mensuel, annuel, YTD, 12 mois), répartition par catégorie/devise, distinction prévu vs supposé vs confirmé, zone d'alertes actionnables. |
| Durcissement PWA et diagnostics | Installation PWA complète, stratégie de cache, mise à jour contrôlée, stockage persistant, diagnostics enrichis (quota, service worker, pending sync). |
| Qualité et conflits multi-appareils | Scénarios SC-SYNC-001 à SC-SYNC-005, conflits sur même propriété, suppression vs modification, tests e2e et robustesse migrations. |
| Sécurité et conformité | CSP, audit dépendances, vérification absence secrets bundle, règles de logs non sensibles, purge locale contrôlée et documentation restauration. |
