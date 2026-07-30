## Why

Le calculateur `next-renewal-date` utilise actuellement un fallback vers `billingInterval` quand `renewalInterval` est absent, ce qui masque un problème de données : 34 abonnements sur 37 n'ont jamais eu leur cycle de renouvellement initialisé. Par ailleurs, `nextChargeDate` est auto-calculée à partir de `nextRenewalDate` dans le moteur, alors que ces deux dates ont des règles métier distinctes. Enfin, aucun diagnostic n'alerte l'utilisateur quand une ancre ou un cycle de renouvellement est absent, et aucun calculateur ne projette les échéances futures.

## What Changes

- **BREAKING**: Suppression du fallback `billingInterval` → `renewalInterval` dans `computeNextRenewalDateForSub` — le calculateur utilise uniquement le cycle de renouvellement déclaré
- **BREAKING**: Suppression de l'auto-calcul de `nextChargeDate = nextRenewalDate` dans le moteur de calcul et dans `updateSubscription`/`createSubscription`
- Ajout d'un log de diagnostic `next-renewal-date-skip` quand l'ancre ou le cycle de renouvellement est absent, avec la raison du skip
- Ajout d'une règle de validation « gate » : `nextChargeDate` ne peut pas être après `nextRenewalDate`
- Nouveau calculateur `projected-charge-dates` dans le registre par défaut, qui projette les N prochaines dates d'échéance pour chaque abonnement actif non-archivé

## Capabilities

### New Capabilities
- `projected-charge-dates`: Calculateur du moteur pour projeter les N prochaines dates d'échéance par abonnement, utilisant le cycle de facturation

### Modified Capabilities
- `next-renewal-date-calculator`: Ajout de logs de diagnostic dédiés quand l'ancre ou le cycle de renouvellement est absent
- `abonnements-v2-coeur-metier`: Ajout de la règle de gate `nextChargeDate ≤ nextRenewalDate` dans la validation

## Impact

Fichiers impactés :
- `src/services/calculationEngine.ts` : suppression fallback, ajout logs diagnostic, ajout calculateur `projected-charge-dates`
- `src/services/subscriptions.ts` : suppression auto-calc `nextChargeDate`, ajout gate validation
- `src/services/subscriptionValidation.ts` : ajout règle de gate `nextChargeDate ≤ nextRenewalDate`
- `src/components/SubscriptionDialog.tsx` : pré-remplissage `renewalInterval` depuis `billingInterval` (déjà fait)