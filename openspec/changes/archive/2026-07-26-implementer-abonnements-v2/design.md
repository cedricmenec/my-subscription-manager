## Context

Le projet dispose d'un socle React/Vite et d'une fondation local-first Dexie Cloud déjà opérationnelle. Les utilisateurs peuvent se connecter, observer l'état de synchronisation et écrire localement, mais aucun objet métier d'abonnement n'est encore manipulable.

Ce lot introduit le premier modèle métier exploitable et son UX de base, en conservant les contraintes structurantes:
- lectures/écritures interactives via Dexie uniquement (TECH-LF-001, TECH-LF-002)
- écriture locale confirmée sans attendre le réseau (FUN-CRUD-001, FUN-CRUD-002)
- synchronisation asynchrone via dexie-cloud-addon (TECH-LF-004)
- aucun backend applicatif personnalisé

## Goals / Non-Goals

Goals:
- Définir un modèle `Subscription` suffisamment riche pour le lot métier initial.
- Permettre création, modification, archivage et consultation des abonnements.
- Exposer recherche/filtres/tri essentiels pour un usage réel.
- Mesurer la complétude des données et prioriser la saisie manquante.
- Préparer les lots paiements/import/alertes sans couplage fort.

Non-goals:
- Moteur de paiements, coûts consolidés et historique financier détaillé.
- Import XLSX/CSV/JSON.
- Génération d'alertes n8n.

## Decisions

### Decision 1: Évolution du schéma Dexie avec migration explicite

Le schéma passe de la version actuelle à une version supérieure en ajoutant les champs métier nécessaires sur `subscriptions` et en introduisant `categories`.

Principes:
- Identifiants globaux sur tables synchronisées (`@id`) et jamais `++id`.
- Dates contractuelles stockées en date civile `YYYY-MM-DD`.
- Montants en unité monétaire minimale.
- Migration déterministe tolérante aux champs absents.

Motivation:
- Respecter RG-DAT-006 et RG-FX-001.
- Préserver la compatibilité des données existantes de socle.

### Decision 2: Validation métier côté frontend avant transaction locale

Le formulaire applique des règles minimales de cohérence:
- `name` obligatoire.
- `status` obligatoire.
- si `status=PAUSED` et `pauseUntil` connu, la date doit être valide.
- si `status=CANCELLED_PENDING_END` et `serviceEndDate` connu, la date doit être valide.
- `renewalMode` imposé parmi `AUTOMATIC`, `MANUAL`, `UNKNOWN`.

Les validations échouées ne déclenchent pas d'écriture locale.

### Decision 3: CRUD local-first réactif avec mises à jour ciblées

Les écritures se font via transactions Dexie et mises à jour ciblées (`update`) pour limiter les conflits de convergence.

Motivation:
- Respecter la recommandation de modifications partielles.
- Éviter les remplacements d'objets complets quand non nécessaires.

### Decision 4: Complétude explicite et vue « À compléter »

Un calcul de complétude est ajouté sur la base de champs critiques:
- `name`, `status`, `currentPrice`, `billingInterval`, `nextChargeDate`, `renewalMode`.

Un drapeau local dérivé (non source de vérité distante) permet de filtrer rapidement les abonnements incomplets.

### Decision 5: Frontière de sécurité inchangée

Aucun secret supplémentaire n'est introduit. Les champs notes/procédures restent textuels et rendus en texte brut (pas d'injection HTML).

Approches rejetées:
- Ajouter un backend Node pour centraliser les validations: rejeté, hors architecture.
- Déporter la logique de complétude côté n8n: rejeté, la complétude est une logique interactive locale.

## Data Flow and Trust Boundaries

1. L'utilisateur saisit/édite un abonnement dans l'UI.
2. Le frontend valide les données métier.
3. Une transaction Dexie persiste localement.
4. L'UI confirme l'enregistrement local immédiatement.
5. Dexie Cloud synchronise ensuite de façon asynchrone.
6. Les vues réactives se mettent à jour via observation IndexedDB.

Frontières:
- Navigateur: validation, persistance locale, rendu.
- Dexie Cloud: auth + transport de synchronisation.
- Aucun composant serveur métier intermédiaire.

## Risks / Trade-offs

- [Risque de schéma trop ambitieux dès ce lot] -> limiter aux champs nécessaires au CRUD et à la complétude.
- [Risque de validations trop strictes] -> distinguer champs obligatoires et champs « connus si disponibles ».
- [Risque de conflits d'édition multi-appareils] -> privilégier `update` ciblé et transactions courtes.
- [Risque de dette UX] -> inclure une vue « À compléter » dès le lot pour piloter la qualité des données.

## Migration Plan

1. Ajouter une nouvelle version Dexie avec index utiles à la liste (statut, catégorie, prochaine échéance, mise à jour).
2. Migrer les enregistrements existants:
- assigner `schemaVersion` cible
- définir `renewalMode='UNKNOWN'` si absent
- initialiser les champs dérivés non bloquants
3. Vérifier ouverture/migration sur base préexistante en test d'intégration.
4. Valider lint/test/build.

Rollback:
- conserver un export de sécurité avant migration.
- en cas d'échec bloquant en dev, purge locale possible puis resynchronisation depuis la copie distante.

## Open Questions

- Faut-il inclure `cancellationDeadlineSource` dans ce lot ou le repousser avec le moteur d'échéances ?
- La catégorie doit-elle être strictement sélectionnée dans une table ou autoriser une saisie libre initiale ?
- Souhaite-t-on afficher les archives dans la liste principale ou les isoler dans une vue dédiée dès ce lot ?
