# Schéma d'import et export — Abos

Ce document décrit les formats de fichier supportés par l'application **Abos** pour l'import, l'export et la restauration des données.

---

## 1. Snapshot JSON (export + restauration complète)

Le snapshot JSON permet d'exporter ou de restaurer **l'intégralité** des données de l'application (toutes les tables synchronisées) dans un fichier unique.

### Format de l'enveloppe

```json
{
  "format": "abos-snapshot",
  "version": 1,
  "exportedAt": "2026-07-28T12:00:00.000Z",
  "data": {
    "subscriptions": [],
    "categories": [],
    "payments": [],
    "settings": []
  }
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `format` | `string` | Oui | Doit valoir exactement `"abos-snapshot"` |
| `version` | `number` | Oui | Version du format. Actuellement `1` |
| `exportedAt` | `string` (ISO 8601) | Oui | Date et heure de l'export |
| `data` | `object` | Oui | Conteneur des données |

### Structure de `data.subscriptions`

Tableau d'objets représentant les abonnements. Chaque objet correspond à la table `subscriptions`.

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | `string` | Oui | Identifiant unique (préfixe `sbs-`) |
| `name` | `string` | Oui | Nom de l'abonnement |
| `provider` | `string` | Non | Fournisseur du service |
| `planName` | `string` | Non | Nom de la formule |
| `categoryId` | `string` | Non | Référence vers `categories.id` |
| `status` | `string` | Oui | `TRIAL`, `ACTIVE`, `PAUSED`, `CANCELLED_PENDING_END`, `ENDED`, `UNKNOWN` |
| `currentPrice` | `number` | Non | Prix en unité décimale (ex: `15.99`) |
| `currency` | `string` | Non | Code ISO 4217 (ex: `EUR`, `USD`) |
| `billingIntervalUnit` | `string` | Non | `DAY`, `WEEK`, `MONTH`, `YEAR` |
| `billingIntervalCount` | `number` | Non | Nombre d'unités entre deux facturations |
| `commitmentIntervalUnit` | `string` | Non | Unité de la durée d'engagement |
| `commitmentIntervalCount` | `number` | Non | Nombre d'unités de l'engagement |
| `renewalIntervalUnit` | `string` | Non | Unité du cycle de renouvellement |
| `renewalIntervalCount` | `number` | Non | Nombre d'unités du renouvellement |
| `renewalMode` | `string` | Oui | `ROLLING`, `AUTOMATIC`, `MANUAL`, `UNKNOWN` |
| `subscriptionDate` | `string` | Non | Date de souscription contractuelle (`YYYY-MM-DD`) |
| `renewalPeriodStartDate` | `string` | Non | Ancre de la période de renouvellement (`YYYY-MM-DD`) |
| `nextRenewalDate` | `string` | Non | Prochaine date de renouvellement contractuel (`YYYY-MM-DD`) |
| `notifyBeforeRenewal` | `boolean` | Non | Activation de l'alerte contractuelle |
| `notifyBeforeRenewalDays` | `number` | Non | Délai de l'alerte en jours |
| `startDate` | `string` | Non | Date de début (`YYYY-MM-DD`) |
| `nextChargeDate` | `string` | Non | Prochaine date de facturation (`YYYY-MM-DD`) |
| `pauseUntil` | `string` | Non | Fin de pause (`YYYY-MM-DD`) |
| `serviceEndDate` | `string` | Non | Fin de service (`YYYY-MM-DD`) |
| `managementUrl` | `string` | Non | URL de gestion |
| `cancellationUrl` | `string` | Non | URL d'annulation |
| `cancellationInstructions` | `string` | Non | Procédure d'annulation |
| `notes` | `string` | Non | Commentaire libre |
| `createdAt` | `string` (ISO 8601) | Oui | Date de création |
| `updatedAt` | `string` (ISO 8601) | Oui | Date de dernière modification |
| `schemaVersion` | `number` | Oui | Version du schéma au moment de l'export |
| `deletedAt` | `string` (ISO 8601) | Non | Date de suppression logique |

### Structure de `data.categories`

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | `string` | Oui | Identifiant unique (préfixe `ctg-`) |
| `name` | `string` | Oui | Nom de la catégorie |
| `sortOrder` | `number` | Non | Ordre d'affichage |
| `createdAt` | `string` (ISO 8601) | Oui | Date de création |
| `updatedAt` | `string` (ISO 8601) | Oui | Date de modification |
| `schemaVersion` | `number` | Oui | Version du schéma |

### Structure de `data.payments`

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | `string` | Oui | Identifiant unique (préfixe `pym-`) |
| `subscriptionId` | `string` | Oui | Référence vers `subscriptions.id` |
| `scheduledDate` | `string` | Oui | Date prévue (`YYYY-MM-DD`) |
| `paidDate` | `string` | Non | Date de paiement effective (`YYYY-MM-DD`) |
| `status` | `string` | Oui | `PROJECTED`, `ASSUMED_PAID`, `CONFIRMED_PAID`, `SKIPPED`, `REFUNDED` |
| `amount` | `object` | Oui | Voir ci-dessous |
| `source` | `string` | Oui | `GENERATED`, `IMPORTED`, `MANUAL`, `N8N` |
| `externalReference` | `string` | Non | Référence externe |
| `notes` | `string` | Non | Commentaire |
| `createdAt` | `string` (ISO 8601) | Oui | Date de création |
| `updatedAt` | `string` (ISO 8601) | Oui | Date de modification |
| `schemaVersion` | `number` | Oui | Version du schéma |

`amount` est un objet :
```json
{
  "amount": 15.99,
  "currency": "EUR"
}
```

### Structure de `data.settings`

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | `string` | Oui | Identifiant unique |
| `key` | `string` | Oui | Doit valoir `"main"` |
| `baseCurrency` | `string` | Oui | Devise de consolidation (ex: `EUR`) |
| `timezone` | `string` | Oui | Fuseau horaire (ex: `Europe/Paris`) |
| `paymentAssumptionEnabled` | `boolean` | Oui | Présomption automatique des paiements |
| `paymentAssumptionDelayDays` | `number` | Oui | Délai avant présomption |
| `exchangeRates` | `object` | Non | Taux de change manuels |
| `createdAt` | `string` (ISO 8601) | Oui | Date de création |
| `updatedAt` | `string` (ISO 8601) | Oui | Date de modification |
| `schemaVersion` | `number` | Oui | Version du schéma |

---

## 2. CSV d'import des abonnements

Le CSV d'import permet d'**ajouter** des abonnements en masse. Les IDs sont générés automatiquement. Les abonnements existants ne sont pas modifiés.

### Format

- Délimiteur : virgule (`,`)
- Encodage : UTF-8
- En-tête : la première ligne doit contenir les noms de colonnes
- Dates : format `YYYY-MM-DD`
- Nombres décimaux : point (`.`) comme séparateur décimal
- Valeurs optionnelles : laisser vide
- Guillemets : les valeurs contenant des virgules doivent être entourées de guillemets doubles (`"`)

### Colonnes

| Colonne | Type | Obligatoire | Description |
|---|---|---|---|
| `name` | `string` | Oui | Nom de l'abonnement |
| `provider` | `string` | Non | Fournisseur |
| `planName` | `string` | Non | Formule |
| `categoryId` | `string` | Non | ID de catégorie existante |
| `status` | `string` | Oui | `TRIAL`, `ACTIVE`, `PAUSED`, `CANCELLED_PENDING_END`, `ENDED`, `UNKNOWN` |
| `currentPrice` | `number` | Non | Prix (décimal, ex: `15.99`) |
| `currency` | `string` | Non | Code devise (ex: `EUR`) |
| `billingIntervalUnit` | `string` | Non | `DAY`, `WEEK`, `MONTH`, `YEAR` |
| `billingIntervalCount` | `number` | Non | Nombre d'unités |
| `commitmentIntervalUnit` | `string` | Non | Unité d'engagement |
| `commitmentIntervalCount` | `number` | Non | Nombre d'unités d'engagement |
| `renewalMode` | `string` | Oui | `ROLLING`, `AUTOMATIC`, `MANUAL`, `UNKNOWN` |
| `renewalIntervalUnit` | `string` | Non | `DAY`, `WEEK`, `MONTH`, `YEAR` |
| `renewalIntervalCount` | `number` | Non | Nombre d'unités du cycle contractuel |
| `subscriptionDate` | `string` | Non | Date de souscription (`YYYY-MM-DD`) |
| `renewalPeriodStartDate` | `string` | Non | Ancre contractuelle (`YYYY-MM-DD`) |
| `nextRenewalDate` | `string` | Non | Date contractuelle (`YYYY-MM-DD`) |
| `notifyBeforeRenewal` | `boolean` | Non | `true` ou `false` |
| `notifyBeforeRenewalDays` | `number` | Non | Délai en jours |
| `nextChargeDate` | `string` | Non | Prochaine facturation (`YYYY-MM-DD`) |
| `startDate` | `string` | Non | Date de début (`YYYY-MM-DD`) |
| `pauseUntil` | `string` | Non | Fin de pause (`YYYY-MM-DD`) |
| `serviceEndDate` | `string` | Non | Fin de service (`YYYY-MM-DD`) |
| `managementUrl` | `string` | Non | URL de gestion |
| `cancellationUrl` | `string` | Non | URL d'annulation |
| `cancellationInstructions` | `string` | Non | Procédure d'annulation |
| `notes` | `string` | Non | Commentaire |

### Exemple

```csv
name,provider,planName,categoryId,status,currentPrice,currency,billingIntervalUnit,billingIntervalCount,commitmentIntervalUnit,commitmentIntervalCount,renewalMode,renewalIntervalUnit,renewalIntervalCount,subscriptionDate,renewalPeriodStartDate,nextRenewalDate,notifyBeforeRenewal,notifyBeforeRenewalDays,nextChargeDate,startDate,pauseUntil,serviceEndDate,managementUrl,cancellationUrl,cancellationInstructions,notes
Spotify,Spotify AB,Premium,,ACTIVE,9.99,EUR,MONTH,1,,,ROLLING,,,,,,,,2026-08-10,2024-03-01,,,,,,
"Cloud Pro",Cloud Corp,"Plan Affaires",ctg-abc123,ACTIVE,49.99,EUR,MONTH,1,YEAR,1,AUTOMATIC,YEAR,1,2026-01-01,2026-01-01,2027-01-01,false,30,2026-09-01,2026-01-01,,,https://cloud.pro/manage,https://cloud.pro/cancel,Annuler depuis le portail,
```

### Règles de validation

1. `name` : ne doit pas être vide
2. `status` : doit être une valeur valide de `SubscriptionStatus`
3. `renewalMode` : doit être `ROLLING`, `AUTOMATIC`, `MANUAL` ou `UNKNOWN`
4. `currentPrice` : si présent, doit être un nombre valide
5. `billingIntervalUnit` : si présent, doit être `DAY`, `WEEK`, `MONTH` ou `YEAR`
6. `billingIntervalCount` : si présent, doit être un entier positif
7. Les dates (`nextChargeDate`, `startDate`, etc.) : si présentes, doivent être au format `YYYY-MM-DD` valide
8. Les lignes invalides sont ignorées et signalées dans le rapport d'import

Avec `ROLLING`, les champs `renewalIntervalUnit`, `renewalIntervalCount`, `renewalPeriodStartDate`, `nextRenewalDate`, `notifyBeforeRenewal` et `notifyBeforeRenewalDays` sont incompatibles et sont supprimés avant écriture. Un ancien abonnement automatique non annuel est normalisé vers `ROLLING` uniquement si les cycles de facturation et de renouvellement sont égaux et si `nextChargeDate` est exactement égale à `nextRenewalDate`. Les cas ambigus et la facturation annuelle restent inchangés.

---

## 3. CSV d'export des abonnements

Mêmes colonnes que le CSV d'import, avec en plus la colonne `id` en première position.

```csv
id,name,provider,planName,categoryId,status,currentPrice,currency,billingIntervalUnit,billingIntervalCount,commitmentIntervalUnit,commitmentIntervalCount,renewalMode,renewalIntervalUnit,renewalIntervalCount,subscriptionDate,renewalPeriodStartDate,nextRenewalDate,notifyBeforeRenewal,notifyBeforeRenewalDays,nextChargeDate,startDate,pauseUntil,serviceEndDate,managementUrl,cancellationUrl,cancellationInstructions,notes
sbs-abc123,Spotify,Spotify AB,Premium,,ACTIVE,9.99,EUR,MONTH,1,,,ROLLING,,,,,,,,2026-08-10,2024-03-01,,,,,,
```

---

## 4. CSV d'export des paiements

| Colonne | Type | Description |
|---|---|---|
| `id` | `string` | Identifiant du paiement |
| `subscriptionId` | `string` | Référence vers l'abonnement |
| `scheduledDate` | `string` | Date prévue (`YYYY-MM-DD`) |
| `paidDate` | `string` | Date de paiement effective |
| `status` | `string` | `PROJECTED`, `ASSUMED_PAID`, `CONFIRMED_PAID`, `SKIPPED`, `REFUNDED` |
| `amount` | `number` | Montant |
| `currency` | `string` | Code devise |
| `source` | `string` | `GENERATED`, `IMPORTED`, `MANUAL`, `N8N` |
| `notes` | `string` | Commentaire |

```csv
id,subscriptionId,scheduledDate,paidDate,status,amount,currency,source,notes
pym-abc123,sbs-abc123,2026-08-15,,PROJECTED,15.99,USD,GENERATED,
```
