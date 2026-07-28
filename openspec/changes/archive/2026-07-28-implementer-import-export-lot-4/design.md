## Context

L'application dispose aujourd'hui de zéro donnée réelle. Les 37 abonnements sont dans un fichier Excel. Le socle Dexie (v5), les services de paiements et les abonnements v2 sont implémentés. Il manque la couche d'import/export pour charger les données et permettre la sauvegarde.

Le modèle de données existant comprend 4 tables synchronisées : `subscriptions`, `categories`, `payments`, `settings`. L'import/export doit couvrir ces 4 tables pour le snapshot JSON, et les abonnements uniquement pour le CSV.

## Goals / Non-Goals

**Goals:**
- Snapshot JSON : export complet (toutes tables) + restauration atomique par remplacement.
- Import CSV additif : abonnements uniquement, IDs générés automatiquement, warning sur doublons de nom.
- Export CSV : abonnements et paiements.
- Documentation du schéma dans `docs/import-schema.md`.
- Page `/data` dans l'interface avec les actions d'import, export et snapshot.

**Non-Goals:**
- Import XLSX natif (l'utilisateur transforme son fichier Excel via un outil externe).
- Import CSV avec IDs explicites.
- Import CSV des paiements.
- Fuzzy matching des noms (comparaison exacte case-insensitive uniquement).
- Import/export des settings, categories ou paiements en CSV (uniquement JSON pour ces tables).

## Decisions

### D1 : Séparation snapshot / import

Deux concepts distincts avec des contrats différents :

| Aspect | Snapshot JSON | Import CSV |
|---|---|---|
| Tables | Toutes (subscriptions, categories, payments, settings) | Abonnements uniquement |
| Stratégie | Remplacement atomique (vide puis importe) | Additif (toujours créer, IDs générés) |
| IDs | Conservés du fichier | Générés automatiquement |
| Doublons | N/A (remplacement) | Warning par nom exact case-insensitive |
| Transaction | Une transaction rw multi-table | Une transaction rw subscriptions |
| Format | JSON versionné avec enveloppe | CSV plat |

### D2 : Format du snapshot JSON

```json
{
  "format": "abos-snapshot",
  "version": 1,
  "exportedAt": "2026-07-28T12:00:00.000Z",
  "data": {
    "subscriptions": [...],
    "categories": [...],
    "payments": [...],
    "settings": [...]
  }
}
```

- L'enveloppe (`format`, `version`, `exportedAt`) permet la validation et la traçabilité.
- Chaque entité dans les tableaux est un objet complet avec son `id`.
- La restauration : supprime logiquement tout existant (soft delete), puis `put` chaque entité dans une transaction Dexie `rw`.

### D3 : Format du CSV d'import abonnements

Colonnes (dans cet ordre) :

```
name,provider,planName,categoryId,status,currentPrice,currency,billingIntervalUnit,billingIntervalCount,commitmentIntervalUnit,commitmentIntervalCount,renewalMode,nextChargeDate,startDate,pauseUntil,serviceEndDate,managementUrl,cancellationUrl,cancellationInstructions,notes
```

- Pas de colonne `id` : toujours génération automatique.
- Les colonnes optionnelles peuvent être vides.
- `currentPrice` en nombre décimal (ex: `15.99`), converti en `number` par le parser.
- Les dates au format `YYYY-MM-DD`.
- La première ligne est l'en-tête.

### D4 : Parsing CSV sans dépendance externe

Le CSV est suffisamment simple (pas de cellules multilignes, pas de délimiteurs complexes) pour être parsé manuellement :
- Split par `\n`, puis par `,`.
- Gestion des guillemets pour les valeurs contenant des virgules.
- Pas de bibliothèque externe pour le MVP.

Si la complexité augmente, `papaparse` pourra être ajouté ultérieurement.

### D5 : Détection des doublons de nom

À l'import CSV, pour chaque ligne :
1. Normaliser le nom : `name.trim().toLowerCase()`.
2. Chercher dans les abonnements existants un nom dont le trim().toLowerCase() correspond.
3. Si trouvé → warning dans le rapport, mais l'import continue (création d'un nouvel abonnement).
4. Le rapport liste tous les warnings avec le nom existant et le nouvel ID généré.

### D6 : Interface utilisateur

La page `/data` propose 4 sections :

```
┌─────────────────────────────────────────────┐
│  Import / Export des données                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ SNAPSHOT ────────────────────────────┐  │
│  │  Exporter (JSON)  │  Restaurer (JSON) │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ IMPORT ──────────────────────────────┐  │
│  │  Importer un fichier CSV              │  │
│  │  [Choisir un fichier]                 │  │
│  │  [Aperçu] → [Confirmer]              │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ EXPORT ──────────────────────────────┐  │
│  │  Exporter les abonnements (CSV)       │  │
│  │  Exporter les paiements (CSV)         │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌─ RAPPORT ─────────────────────────────┐  │
│  │  (affiché après chaque action)        │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### D7 : Preview d'import CSV

Avant l'écriture effective, l'utilisateur voit un aperçu :
- Nombre de lignes valides / invalides.
- Liste des warnings (doublons de nom).
- Liste des erreurs (lignes ignorées avec raison).
- Bouton Confirmer / Annuler.

L'aperçu est stocké dans la table locale `importPreview` (déjà prévue dans le schéma Dexie).

## Risks / Trade-offs

- **[Risque] Taille du snapshot JSON** : avec 37 abonnements et leurs paiements, le fichier reste très petit (< 1 Mo). Aucun risque de mémoire.
- **[Risque] Parsing CSV maison** : peut échouer sur des cas edge (virgules dans les notes, retours à la ligne). → Mitigation : validation stricte + messages d'erreur explicites. Si problème, ajout de papaparse.
- **[Risque] Restauration snapshot en conflit avec Dexie Cloud** : la restauration écrit localement, Dexie Cloud synchronise ensuite. → Accepté : le modèle local-first gère la convergence.
- **[Risque] Perte de données si snapshot mal formé** : → Mitigation : validation du format et de la version avant toute écriture. Preview du contenu avant restauration.