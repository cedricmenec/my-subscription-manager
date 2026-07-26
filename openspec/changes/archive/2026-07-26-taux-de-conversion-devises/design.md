## Context

Actuellement, `buildFinancialSummary` dans `src/services/finance.ts` exclut tous les abonnements dont la devise (`currency`) ne correspond pas à `baseCurrency` (EUR). Les montants en devise étrangère (USD, GBP, etc.) sont comptabilisés dans `excludedCurrencySubscriptionCount` mais ne contribuent pas aux coûts mensuels/annuels équivalents ni aux projections. Aucune information individuelle n'est exposée sur les abonnements exclus.

L'utilisateur souhaite pouvoir définir des taux de conversion statiques pour intégrer ses abonnements en devises étrangères dans le calcul consolidé, sans avoir recours à un service de taux de change en temps réel (MVP).

## Goals / Non-Goals

**Goals:**
- Stocker des taux de conversion statiques dans les paramètres synchronisés de l'application
- Modifier `buildFinancialSummary` pour appliquer les taux de conversion disponibles
- Afficher un indicateur individuel sur chaque abonnement exclu avec le motif d'exclusion (tooltip)
- Exposer une interface de configuration des taux de conversion dans l'UI
- Conserver les montants et devises d'origine en base (pas de conversion destructive)

**Non-Goals:**
- Taux de change en temps réel ou API externe
- Conversion automatique basée sur une source de données centralisée
- Gestion des commissions ou frais de change
- Conversion rétroactive des paiements historiques déjà matérialisés
- Support de plusieurs devises de consolidation (seulement EUR)

## Decisions

### D1: Stockage des taux dans le champ `exchangeRates` de `AppSettings`

- **Choix**: Ajouter un champ `exchangeRates: Record<string, number>` sur l'interface `AppSettings` existante
- **Justification**: La table `settings` est déjà synchronisée via Dexie Cloud, pas besoin d'une nouvelle table. Le format `Record<string, number>` permet de stocker des paires devise→taux (ex: `{ "USD": 0.92 }` signifiant "1 USD = 0.92 EUR")
- **Alternative rejetée**: Nouvelle table `exchangeRates` — overkill pour un MVP, le Record est suffisant
- **Alternative rejetée**: Variable d'environnement — ne serait pas persistée ni synchronisée entre appareils

### D2: Convention de sens du taux

- **Choix**: Les taux sont stockés comme "1 unité de devise étrangère = X EUR"
- **Exemple**: `{ "USD": 0.92 }` signifie 1 USD = 0.92 EUR
- **Justification**: Intuitif pour l'utilisateur qui définit "combien d'euros vaut ce dollar". Le calcul devient `montantEUR = montantDevise * taux`

### D3: Exclusion avec motif structuré

- **Choix**: Ajouter un champ `excludedSubscriptions: Array<{id: string, reason: string}>` dans `FinancialSummary`
- **Justification**: Permet à l'UI d'afficher un tooltip individuel par abonnement exclu, plutôt qu'un simple compteur global
- **Motifs d'exclusion possibles**: "devise non convertible" (aucun taux défini), "pas de prix", "abonnement terminé", etc.

### D4: Interface de configuration locale-first

- **Choix**: Formulaire inline dans l'UI principale (pas de page dédiée séparée pour le MVP)
- **Justification**: Reste cohérent avec l'approche "tout dans App.tsx" du projet. Une page dédiée pourra être extraite ultérieurement
- **Stockage**: Écriture directe dans `db.settings.put()` via `getFinancialSummary` → validation locale immédiate

### D5: Aucune migration de schéma nécessaire

- **Justification**: `AppSettings` utilise déjà `schemaVersion`. Ajouter `exchangeRates` comme champ optionnel ne casse pas les enregistrements existants qui n'ont pas ce champ. Pas de bump de `schemaVersion` nécessaire pour ce champ optionnel.

## Risks / Trade-offs

| Risque | Mitigation |
|--------|------------|
| L'utilisateur oublie de configurer les taux et les abonnements restent exclus | Message d'information dans l'UI pointant vers la configuration |
| Taux saisis incorrects (ex: 0.92 au lieu de 1.09) | Validation de base (taux > 0), mais l'utilisateur reste responsable |
| Changement de taux dans le temps (obsolescence) | C'est explicite — taux statiques, c'est un choix du MVP |
| Record dans `exchangeRates` peut devenir volumineux avec beaucoup de devises | Limité au nombre de devises de l'utilisateur (quelques entrées max) |