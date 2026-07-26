## Why

Actuellement, les abonnements dont la devise n'est pas l'euro (ex: USD) sont exclus du calcul des coûts consolidés (coût mensuel équivalent, coût annuel équivalent, projection 30/90 jours). L'utilisateur ne peut pas visualiser ces abonnements dans le résumé financier, et aucune information individuelle n'indique la raison de l'exclusion. Ce changement permet de définir des taux de conversion statiques pour inclure ces abonnements dans les calculs financiers, et d'afficher clairement les exclusions avec leur motif.

## What Changes

- Ajout d'une page de configuration des taux de conversion statiques (combien d'unités de la devise cible pour 1 euro)
- Ajout d'un champ `exchangeRates` dans les paramètres de l'application (table `settings`, clé `main`) pour stocker les taux de conversion
- Modification du calcul `buildFinancialSummary` pour appliquer les taux de conversion et inclure les abonnements en devise étrangère
- Ajout d'un indicateur visuel (tooltip) sur les abonnements exclus du calcul des coûts, avec la raison d'exclusion
- Affichage du taux de conversion appliqué dans les cartes de résumé financier
- Conservation des données d'origine (montant et devise) sans modification

## Capabilities

### New Capabilities
- `taux-de-conversion`: Configuration et application de taux de conversion statiques entre devises pour le calcul des coûts consolidés

### Modified Capabilities
- `finances-paiements`: Modification du calcul des indicateurs financiers pour prendre en compte les taux de conversion et inclure les abonnements en devise étrangère
- `abonnements-v2-coeur-metier`: Ajout d'un indicateur de motif d'exclusion sur les abonnements exclus du calcul des coûts

## Impact

- `src/services/finance.ts` : `buildFinancialSummary` modifié pour accepter et appliquer les taux de conversion
- `src/services/finance.ts` : `FinancialSummary` enrichi pour inclure les détails d'exclusion par abonnement
- `src/services/payments.ts` : `getFinancialSummary` modifié pour charger les taux de conversion depuis les settings
- `src/data/db.ts` : `AppSettings` enrichi d'un champ `exchangeRates`
- `src/App.tsx` : Affichage des exclusions individuelles avec tooltip, page de configuration des taux
- `src/App.tsx` : Nouvelle section UI pour la configuration des taux de conversion
- `src/styles.css` : Styles pour les tooltips et la page de configuration