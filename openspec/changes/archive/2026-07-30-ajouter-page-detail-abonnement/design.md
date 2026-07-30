## Context

L’application charge déjà les abonnements dans `App.tsx` et observe les paiements avec `useLiveQuery`. La navigation repose sur le hash et ne distingue actuellement que les grandes pages. Les modes compact et cartes proposent uniquement l’édition et l’archivage. Le modèle `Subscription` contient les informations nécessaires à la fiche et le modèle `Payment` permet de distinguer projections, paiements supposés, confirmés, ignorés et remboursés.

La matérialisation actuelle compare toutes les lignes de source `GENERATED` aux nouvelles projections. Une correction change le statut sans changer la source ; elle peut donc rendre les ensembles différents et provoquer la suppression d’une ligne historique. Le changement touche ainsi la navigation, l’interface, les lectures locales et la réconciliation des projections.

La source de vérité reste IndexedDB via Dexie. La fiche n’effectue aucun appel réseau et reflète les écritures locales sans attendre Dexie Cloud. Les notes et instructions restent dans le navigateur et ne sont jamais écrites dans les logs.

## Goals / Non-Goals

**Goals:**

- fournir une route directe `#/subscriptions/:id` et un retour vers la liste ;
- rendre le prochain paiement et le prochain renouvellement automatique immédiatement identifiables ;
- présenter les échéances à venir, les éléments à vérifier et l’historique finalisé ;
- afficher les champs de la fiche par groupes cohérents sans surcharger les données absentes ;
- réutiliser le dialogue d’édition existant et rafraîchir la fiche après sauvegarde locale ;
- préserver les paiements corrigés ou finalisés pendant la rematérialisation ;
- couvrir les comportements principaux par des tests d’interface et de service ;
- documenter le nouveau parcours utilisateur en français sous `docs/users/`.

**Non-Goals:**

- modifier le schéma ou la version Dexie ;
- ajouter un routeur ou une bibliothèque d’interface ;
- permettre les actions de paiement depuis la fiche ;
- créer un historique des modifications de l’abonnement ;
- modifier le moteur de calcul du prochain renouvellement ;
- introduire un backend personnalisé.

## Decisions

### D1 : Étendre le routeur par hash existant

`App.tsx` extrait l’identifiant après `/subscriptions/` et conserve la page principale `subscriptions` pour le menu. Une fonction dédiée navigue vers la fiche et la navigation vers la liste efface l’identifiant.

Cette solution conserve le modèle actuel, fonctionne hors ligne et évite l’ajout d’une dépendance. L’alternative d’introduire React Router apporterait davantage de structure mais serait disproportionnée pour une seule route paramétrée.

### D2 : Créer une page autonome et réutiliser le dialogue

`SubscriptionDetailPage` reçoit l’abonnement, ses paiements, les catégories et les callbacks de rafraîchissement. Elle gère uniquement l’ouverture de `SubscriptionDialog` et les états d’affichage dérivés.

Dupliquer le formulaire dans la page est rejeté, car les validations et les comportements de sauvegarde divergeraient rapidement.

### D3 : Dériver les groupes de paiements à partir des lignes persistées

La page classe les paiements non supprimés de l’abonnement selon la date civile du jour :

- échéances futures : statut `PROJECTED` et date supérieure ou égale à aujourd’hui ;
- à vérifier : statut `PROJECTED` ou `ASSUMED_PAID` avec date passée ;
- historique : statuts `CONFIRMED_PAID`, `SKIPPED` et `REFUNDED`.

Le premier paiement futur alimente la carte prioritaire. En son absence, `nextChargeDate` et le prix courant servent de repli explicite. Les comparaisons utilisent les chaînes civiles `YYYY-MM-DD`, sans conversion implicite de fuseau.

Afficher directement les douze dates du `calculationState` est rejeté : elles ne portent ni montant ni statut financier et dupliqueraient la source persistée des paiements.

### D4 : Afficher le renouvellement selon son mode

La carte de renouvellement mise en relief est rendue uniquement pour `AUTOMATIC`. Une date absente produit un état « Date non calculable » plutôt qu’une valeur inventée. Les modes manuel et inconnu restent visibles dans les informations détaillées.

### D5 : Préserver les paiements non modifiables pendant la réconciliation

La matérialisation sépare les paiements `GENERATED` en deux groupes :

- projections remplaçables : statut `PROJECTED` et absence de `correctedAt` ;
- paiements préservés : tout paiement corrigé ou avec un statut différent.

Seules les projections remplaçables peuvent être supprimées. Une nouvelle projection n’est pas créée lorsqu’un paiement préservé existe déjà à la même date pour l’abonnement. Les mises à jour manuelles utilisent `put` sur l’entité complète afin de respecter la contrainte Dexie Cloud `@id`.

Changer la source d’un paiement corrigé est rejeté : cela modifierait la sémantique historique et demanderait une migration. Aucun champ persistant n’est ajouté, donc aucune migration ni incrément de schéma n’est nécessaire.

### D6 : Historique replié nativement

La section historique utilise `<details>` et `<summary>`, fermée par défaut. Ce composant offre une interaction clavier native et évite un état React supplémentaire. Les échéances futures restent toujours visibles.

### D7 : Chargement et absence séparés

`App.tsx` suit explicitement la fin du premier chargement des abonnements. La page affiche un état de chargement avant cette fin, puis un état « abonnement introuvable » si l’identifiant ne correspond à aucune donnée active chargée.

## Risks / Trade-offs

- **[Risque] Une projection préservée et une projection future pourraient partager une date** → toute date déjà représentée par un paiement préservé est exclue des créations.
- **[Risque] L’horizon matérialisé est limité à 90 jours** → la page affiche les lignes disponibles et un état explicite ; elle ne promet pas une projection annuelle.
- **[Risque] Un accès direct peut survenir avant le chargement Dexie** → l’état de chargement empêche un faux « introuvable ».
- **[Risque] La page peut devenir dense avec tous les champs** → les informations absentes sont regroupées en messages synthétiques et les notes longues restent dans leur section.
- **[Trade-off] La fiche reçoit les données depuis `App.tsx`** → cohérent avec l’architecture actuelle et réactif pour les paiements, mais moins autonome qu’une page exécutant ses propres requêtes.
- **[Trade-off] Les corrections de paiement ne sont pas proposées sur cette page** → le parcours reste focalisé ; la page Paiements conserve cette responsabilité.

## Migration Plan

1. Déployer le code statique sans migration IndexedDB.
2. Au prochain calcul, seules les projections futures non corrigées deviennent remplaçables.
3. Les paiements déjà corrigés ou finalisés restent conservés.
4. En cas de retour arrière applicatif, les données restent lisibles car le schéma n’a pas changé ; seul l’ancien risque de rematérialisation réapparaît.

## Open Questions

Aucune question bloquante. L’historique des modifications de la fiche et l’augmentation de l’horizon de projection restent des évolutions séparées.
