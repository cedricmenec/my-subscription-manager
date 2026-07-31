## Why

Le produit confond actuellement la reconduction continue d’un abonnement avec un renouvellement contractuel à date fixe. Le formulaire copie automatiquement le cycle de facturation dans le cycle de renouvellement ; un abonnement mensuel continu reçoit alors `nextRenewalDate=nextChargeDate`, ce qui borne par erreur son échéancier à une seule mensualité au lieu de douze.

Ce changement constitue le lot « simplification du renouvellement et correction des échéanciers ». Il donne une responsabilité unique à la facturation, à l’engagement et au renouvellement contractuel, tout en conservant le périmètre local-first existant et les garanties RG-DAT-001 à RG-DAT-006, RG-REN-001 à RG-REN-004, RG-STA-003, RG-PAU-001 et RG-CAN-002.

## What Changes

- Étendre `RenewalMode` avec `ROLLING`, libellé « Reconduction continue », pour représenter un service qui se poursuit jusqu’à résiliation sans échéance contractuelle distincte.
- Réserver `AUTOMATIC` et `MANUAL` aux renouvellements contractuels à date fixe ; conserver `UNKNOWN` pour les données réellement indéterminées.
- Faire dépendre l’échéancier financier du cycle de facturation, de `serviceEndDate`, des pauses et, uniquement lorsqu’il existe, d’un renouvellement contractuel distinct.
- Corriger immédiatement le cas facturation mensuelle / renouvellement mensuel identique : il SHALL produire douze mensualités et ignorer `nextRenewalDate` comme borne de projection.
- Conserver le cas facturation mensuelle / renouvellement annuel : échéances jusqu’au renouvellement inclus, avec un maximum de douze mois.
- Conserver le cas facturation annuelle : uniquement la prochaine échéance.
- Arrêter de recopier automatiquement le cycle de facturation vers le cycle de renouvellement lors de la sélection d’un mode de continuation.
- Simplifier le formulaire autour de la question « Comment l’abonnement se poursuit-il ? » et masquer les champs contractuels pour `ROLLING`.
- Nettoyer les champs contractuels incompatibles lors du passage à `ROLLING`, sans toucher à l’historique des paiements.
- Migrer de manière déterministe les abonnements mensuels automatiques manifestement continus (`billingInterval=renewalInterval`, `nextChargeDate=nextRenewalDate`) vers `ROLLING`, hors facturation annuelle, et journaliser les cas ambigus restant à vérifier.
- Mettre à jour les filtres, cartes, fiche détaillée, imports/exports, diagnostic et libellés pour reconnaître `ROLLING`.
- Corriger les guides utilisateurs et développeurs afin qu’ils décrivent la reconduction continue, le renouvellement contractuel distinct et les bornes réelles de projection.

Non-objectifs :

- supprimer immédiatement `renewalPeriodStartDate` ou remplacer le calcul ancré de `nextRenewalDate` ;
- fusionner `startDate` et `subscriptionDate` ;
- séparer physiquement les échéances prévues et les paiements réels dans deux tables ;
- modifier les règles d’engagement ou faire de la fin d’engagement une borne de paiement ;
- ajouter un traitement hors navigateur autre que les intégrations n8n existantes.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `abonnements-v2-coeur-metier`: ajouter `ROLLING`, formaliser les invariants de continuation et la migration compatible.
- `subscription-dialog`: remplacer l’initialisation implicite du renouvellement par un choix explicite et conditionner les champs contractuels.
- `next-renewal-date-calculator`: ignorer la reconduction continue et réserver le calcul aux renouvellements contractuels automatiques.
- `projected-charge-dates`: appliquer une borne de renouvellement uniquement à une période contractuelle distincte et corriger les cycles identiques.
- `subscription-detail`: distinguer reconduction continue et renouvellement contractuel dans la fiche et ses cartes.
- `subscription-list`: exposer le nouveau mode dans les libellés, badges et filtres.
- `import-export`: accepter, valider, exporter et restaurer le mode `ROLLING`.

## Impact

- Types, validations et migration Dexie dans `src/data/db.ts`, `src/services/subscriptionValidation.ts` et `src/services/subscriptions.ts`.
- Formulaire, listes, cartes et fiche abonnement dans `src/components` et `src/pages`.
- Calcul de renouvellement et de projection dans `src/services/calculationEngine.ts` et `src/services/finance.ts`.
- Import/export CSV et snapshot, avec compatibilité des anciennes valeurs.
- Tests de migration IndexedDB, calculs calendaires, projections, formulaire, filtres et fiche.
- Guides `docs/users/echeanciers-previsionnels.md`, `docs/users/subscription-detail.md`, `docs/developers/projected-schedules.md` et `docs/developers/calculation-engine.md`.
- Aucun nouveau backend, aucune nouvelle table synchronisée et aucune suppression d’historique.
