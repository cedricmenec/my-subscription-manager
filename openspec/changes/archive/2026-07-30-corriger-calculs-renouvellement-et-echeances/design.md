## Context

Le calculateur `next-renewal-date` est implémenté et exécute un calcul idempotent pour chaque abonnement. Actuellement, en l'absence de `renewalIntervalUnit`, il fallback sur `billingIntervalUnit`, ce qui masque 34 abonnements dont le cycle de renouvellement n'est jamais été initialisé. Par ailleurs, `nextChargeDate` est déduite de `nextRenewalDate` dans le moteur, alors que ces deux dates répondent à des règles métier distinctes.

Le dialogue de souscription pré-remplit déjà les champs de renouvellement lors du passage en mode AUTOMATIC, mais ce pré-remplissage n'a pas d'effet pour les abonnements existants créés avant l'introduction de ces champs.

## Goals / Non-Goals

**Goals:**
- Supprimer le fallback `billingInterval` → `renewalInterval` dans le calculateur
- Supprimer l'auto-calcul de `nextChargeDate` à partir de `nextRenewalDate`
- Ajouter un log de diagnostic quand l'ancre ou le cycle de renouvellement est absent
- Ajouter la règle de gate `nextChargeDate ≤ nextRenewalDate` dans la validation
- Ajouter un calculateur `projected-charge-dates` qui projette les N prochaines échéances par abonnement
- Utiliser les logs diagnostic existants (catégorie `calc-engine`) pour tracer les motifs de skip

**Non-Goals:**
- Modifier le modèle de données ou ajouter une nouvelle table
- Ajouter une UI pour visualiser les échéances projetées (scope futur)
- Modifier les règles de calcul du `projected-payments` existant
- Modifier le comportement du dialogue de souscription (déjà fait)
- Créer un guide développeur ou utilisateur (changement purement technique)

## Decisions

### D1 — Suppression du fallback dans `computeNextRenewalDateForSub`

**Choix :** Le calculateur retourne `undefined` si `renewalIntervalUnit` est absent, sans fallback vers `billingIntervalUnit`. Le calculateur utilise strictement `renewalIntervalUnit` et `renewalIntervalCount`.

**Raison :** Le cycle de renouvellement et le cycle de facturation sont des concepts distincts. Utiliser le cycle de facturation comme fallback masque un défaut de données et produit des dates potentiellement incorrectes.

**Alternatives rejetées :**
- Fallback + log de warning → moins fiable, mélange les responsabilités

### D2 — Log de diagnostic quand l'ancre ou le cycle est absent

**Choix :** Dans le calculateur, quand `computeNextRenewalDateForSub` retourne `undefined` pour un abonnement, écrire un log de diagnostic avec `event: 'next-renewal-date-skip'` contenant la raison exacte (`missing-anchor`, `missing-renewal-cycle`, `mode-not-automatic`, `status-ended`, etc.).

**Raison :** Cela permet à l'utilisateur de voir dans la timeline pourquoi certains abonnements sautent, sans avoir à ouvrir chaque fiche.

### D3 — Suppression de l'auto-calcul de `nextChargeDate`

**Choix :** `nextChargeDate` n'est plus automatiquement définie à `nextRenewalDate` dans le moteur ni dans `updateSubscription`/`createSubscription`. Le champ reste librement modifiable par l'utilisateur.

**Raison :** Les deux dates ont des règles métier distinctes. Le `nextRenewalDate` concerne le cycle contractuel, `nextChargeDate` concerne le cycle de paiement. L'auto-calcul introduit une confusion.

**Alternatives rejetées :**
- Garder l'auto-calcul avec un flag conditionnel → complexité inutile

### D4 — Gate `nextChargeDate ≤ nextRenewalDate`

**Choix :** Dans `validateSubscriptionInput`, si `nextChargeDate` et `nextRenewalDate` sont tous deux définis, vérifier que `nextChargeDate ≤ nextRenewalDate`. Si la règle est violée, émettre une erreur de validation.

**Raison :** Une échéance de paiement ne peut pas être prévue après la date de renouvellement du contrat. Si le contrat est renouvelé, le cycle de paiement recommence.

### D5 — Calculateur `projected-charge-dates`

**Choix :** Nouveau calculateur idempotent dans le registre par défaut qui projette les N prochaines dates d'échéance (par défaut 12) pour chaque abonnement actif non-archivé. Les résultats sont stockés dans une table locale `calculationState` avec la clé `<subId>:projected-charge-dates`.

**Raison :** Un calculateur séparé permet de découpler le calcul des échéances du calcul des paiements (projected-payments) et du renouvellement. Les résultats sont réutilisables par l'UI sans recalcul.

**Alternatives rejetées :**
- Stocker les projections dans la table `payments` → créerait des faux paiements
- Calcul à la volée dans l'UI → pas de partage entre composants, pas de cache

### D6 — Idempotence du calculateur `projected-charge-dates`

**Choix :** Le calculateur compare le résultat calculé avec la valeur stockée dans `calculationState`. Si identique, aucune écriture. L'état est stocké comme JSON dans `calculationState` avec la clé `<subId>:projected-charge-dates`.

**Raison :** Cohérent avec le pattern d'idempotence du moteur. Utilise une table locale existante, pas de nouveau schéma.

## Risques / Trade-offs

- **[Faible] Abonnements sans cycle de renouvellement** : Après suppression du fallback, 34 abonnements ne verront pas leur `nextRenewalDate` calculée. Mitigation : script de migration fourni à l'utilisateur, logs de diagnostic visibles dans la timeline.
- **[Faible] nextChargeDate non calculée** : Les abonnements qui dépendaient de l'auto-calcul perdent leur date d'échéance. Mitigation : le champ reste éditable manuellement, le calculateur `projected-charge-dates` fournira une alternative.
- **[Nul] Impact performance** : Le calculateur `projected-charge-dates` traite un nombre limité d'abonnements (< 100). Le calcul est négligeable.
- **[Nul] Pas de guide développeur nécessaire** : Le changement est localisé dans des services existants, sans nouveau concept ou sous-système.
- **[Nul] Pas de guide utilisateur nécessaire** : Les changements sont internes (logs diagnostic, validation) ou feront l'objet d'une UI future (projections).