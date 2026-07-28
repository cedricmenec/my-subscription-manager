# Next Features

## Next Features

### 2. Vue Échéances

**Description :** Visualiser sur un calendrier ou une liste chronologique tous les événements à venir (prélèvements, renouvellements, fins d'essai, dates limites d'annulation).

**Objectif / valeur apportée :** Répondre à la question quotidienne « qu'est-ce qui arrive bientôt, que dois-je annuler ? ». C'est l'objectif métier n°1 (OBJ-MET-002) : éviter les renouvellements involontaires. Donne une vision temporelle claire de tous les événements contractuels.

**Mental model :** Calendrier + liste chronologique des événements (charge, renouvellement, fin essai/promotion/pause, date limite d'annulation, fin de service). Filtres par type d'événement et horizon (7/30/60/90/365 jours). Mise en évidence des renouvellements automatiques et des dates d'annulation imminentes. Lecture depuis les tables `subscriptions` (dates) et `payments` (charges). Aucune table supplémentaire nécessaire.

### 3. Tableau de bord financier

**Description :** Consolider en un écran les KPI financiers (coût mensuel/annuel, dépenses, décaissements) avec répartition par catégorie et devise.

**Objectif / valeur apportée :** Comprendre en un coup d'œil sa situation financière consolidée. Distinguer coût mensuel équivalent, annuel, dépenses YTD, décaissements prévus. Visualiser la répartition par catégorie et devise. La valeur du Lot 3 (paiements) est invisible sans cette vue.

**Mental model :** KPI en haut (mensuel, annuel, YTD, 30j, 90j), graphiques répartition catégorie/devise, liste des alertes actionnables (abonnements sans prix, devise non convertible, date d'annulation imminente). Distinction visuelle prévu / supposé / confirmé. S'appuie sur `buildFinancialSummary` existant. Bibliothèque de graphiques légère (Recharts ou équivalent).

---

## Format

- Type de feature
- Périmètre (grandes lignes)

## Backlog secondaire

| Type de feature | Périmètre (grandes lignes) |
|---|---|
| Alertes n8n (Lot 5) | Workflow quotidien 08:00 Europe/Paris, idempotence des envois, digest e-mail, journal `notificationDeliveries`, passage des paiements échus en `ASSUMED_PAID`, supervision erreurs/retry. |
| Durcissement PWA et diagnostics | Installation PWA complète, stratégie de cache, mise à jour contrôlée, stockage persistant, diagnostics enrichis (quota, service worker, pending sync). |
| Qualité et conflits multi-appareils | Scénarios SC-SYNC-001 à SC-SYNC-005, conflits sur même propriété, suppression vs modification, tests e2e et robustesse migrations. |
| Sécurité et conformité | CSP, audit dépendances, vérification absence secrets bundle, règles de logs non sensibles, purge locale contrôlée et documentation restauration. |
