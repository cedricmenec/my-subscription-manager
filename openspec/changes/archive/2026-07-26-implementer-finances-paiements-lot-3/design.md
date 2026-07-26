## Context

Le code actuel fournit un socle local-first pour les abonnements, avec Dexie v2, catégories synchronisées, indicateur de complétude et interface de CRUD dans un composant React unique. En revanche, il ne possède ni table `payments`, ni moteur de projection d'échéances, ni agrégations financières, alors que la spécification métier attend des coûts mensuels et annuels, des décaissements futurs, des dépenses sur période et la distinction entre prévision, paiement supposé et paiement confirmé.

Le changement touche plusieurs frontières en même temps: modèle Dexie, migration IndexedDB, services de domaine, UI et tests. Il doit rester local-first, ne pas attendre le réseau pour les écritures, ne pas introduire de backend applicatif et préparer le terrain pour les alertes n8n sans dépendre de n8n dans ce lot.

## Goals / Non-Goals

**Goals:**
- Introduire une version de schéma Dexie qui ajoute `payments` et enrichit `Subscription` avec des champs d'intervalle structurés.
- Implémenter un moteur déterministe de calcul de dates civiles et de projection des paiements pour les cycles mensuels et annuels utiles au MVP.
- Fournir des services local-first pour créer, corriger, lister et agréger les paiements sans remplacer les objets complets.
- Exposer dans l'interface un résumé financier minimal et une liste de paiements cohérente avec les statuts métier du Lot 3.
- Couvrir les règles critiques par des tests unitaires et IndexedDB, avec migration v2 vers v3.

**Non-Goals:**
- Gérer les promotions, essais, taux de change consolidés et renouvellements contractuels complexes dans les calculs du premier incrément.
- Implémenter la vue calendrier des échéances, l'import/export de paiements ou les workflows n8n du Lot 5.
- Ajouter une architecture frontend plus vaste que nécessaire; le changement pourra extraire quelques helpers/composants ciblés mais ne refondra pas toute l'application.

## Decisions

### 1. Modèle hybride: paiements persistés + projection locale bornée

Décision: persister l'historique des paiements et les corrections dans `payments`, tout en calculant localement les échéances futures nécessaires aux indicateurs au lieu de matérialiser tout le futur.

Rationale:
- Cela respecte la stratégie de vérité des paiements de la section 9.3 sans surcharger IndexedDB d'un historique projeté inutile.
- Les agrégats 30/90 jours restent déterministes et réactifs depuis IndexedDB, conformément à TECH-LF-001 et TECH-LF-006.
- Les corrections manuelles portent sur des objets `Payment` stables sans casser la projection ultérieure.

Alternatives rejetées:
- Tout persister à l'avance: plus simple à requêter mais coûteux en maintenance, migration et résolution de conflit.
- Tout dériver à la volée sans table `payments`: incompatible avec AC-016, l'historique corrigé et la distinction persistée des statuts.

### 2. Évolution de schéma v3 avec migration conservative

Décision: ajouter une version Dexie v3 qui introduit `payments` et enrichit `subscriptions` avec des champs structurés `billingIntervalUnit`, `billingIntervalCount`, `commitmentIntervalUnit`, `commitmentIntervalCount`, `renewalIntervalUnit`, `renewalIntervalCount`.

Rationale:
- La structure v2 actuelle (`billingInterval` simplifié) ne suffit pas pour représenter le cas validé en section 7.2.
- Une migration conservative peut convertir `MONTHLY`, `YEARLY` et `WEEKLY` existants vers l'unité et le compteur, tout en laissant les champs non connus à `undefined` ou `UNKNOWN` selon le cas.
- Le changement reste compatible avec les anciennes données et documente clairement l'impact de version, conformément aux règles de migration de la section 22.

Alternative rejetée:
- Garder uniquement `billingInterval` et bricoler les calculs autour. Ce choix simplifierait l'implémentation immédiate mais fige un modèle incorrect pour les lots suivants.

### 3. Moteur de projection volontairement limité mais correctement structuré

Décision: supporter dans ce lot les projections déterministes suivantes: cycles mensuels, annuels et hebdomadaires simples, logique fin de mois, blocage pendant `PAUSED`, arrêt à `serviceEndDate` et absence de génération au-delà du statut `ENDED`.

Rationale:
- Ce périmètre couvre les besoins immédiats des indicateurs financiers sans prétendre résoudre les promotions, essais ou renouvellements contractuels avancés.
- Il répond aux règles RG-DAT-002 à RG-DAT-004, RG-PAU-001, RG-CAN-002 et AC-010 dans un incrément vérifiable.

Alternative rejetée:
- Étendre dès maintenant le moteur à tous les cas de la spécification complète. Le risque serait un lot trop large, difficile à tester et à terminer proprement.

### 4. Services métier séparés pour la finance

Décision: introduire un service dédié aux paiements et un service dédié aux calculs financiers, plutôt que d'entasser le tout dans `subscriptions.ts` ou `App.tsx`.

Rationale:
- Le composant `App.tsx` est déjà dense; y ajouter projection, agrégations et corrections rendrait le lot difficile à maintenir.
- Des fonctions pures pour les calculs facilitent les tests unitaires et la réutilisation future pour la vue échéances et les workflows n8n.

Alternative rejetée:
- Laisser tous les calculs dans le composant React. Cela irait à l'encontre du besoin de testabilité et du découpage par domaine.

### 5. Confiance locale et transactions ciblées

Décision: toutes les écritures de paiements et corrections utiliseront Dexie avec transactions ciblées, et les mises à jour d'abonnements resteront partielles.

Rationale:
- Cela respecte FUN-CRUD-001, FUN-CRUD-002 et les recommandations de la section 16.5 sur les mises à jour ciblées.
- Les opérations multi-table, comme la création d'un abonnement avec sa première projection ou une correction de paiement avec audit futur, restent extensibles vers des transactions plus riches.

## Risks / Trade-offs

- [Risque: modèle abonnement plus riche que l'UI actuelle] → Mitigation: stocker dès maintenant les nouveaux champs structurés mais limiter l'interface du lot aux cas de facturation simples et à des valeurs par défaut cohérentes.
- [Risque: projection dupliquée si des paiements persistés existent déjà] → Mitigation: définir une règle claire de déduplication par `subscriptionId + scheduledDate` pour l'affichage et les agrégats.
- [Risque: migration v3 réécrit mal l'ancien `billingInterval`] → Mitigation: ajouter des tests de migration explicites pour `MONTHLY`, `YEARLY`, `WEEKLY` et `UNKNOWN`.
- [Risque: dette UI dans `App.tsx`] → Mitigation: extraire au minimum les helpers de finance et les sections de rendu liées aux paiements si la lecture devient fragile.
- [Trade-off: MVP sans FX consolidé] → Mitigation: les agrégats consolident seulement les montants partageant la devise de base et exposent la devise d'origine; l'amélioration est conservée pour un lot ultérieur.
