## 1. Schéma et modèles métier

- [x] 1.1 Ajouter la version Dexie v3 avec la table synchronisée `payments`, les index nécessaires et la migration des abonnements v2 vers des intervalles structurés.
- [x] 1.2 Étendre les types métier `Subscription` et `AppSettings` avec les champs utiles au Lot 3, en conservant la compatibilité locale-first et les identifiants globaux.

## 2. Moteur financier

- [x] 2.1 Implémenter les helpers de dates civiles et de projection des échéances pour les cycles mensuels, annuels et hebdomadaires simples avec gestion fin de mois, pause et fin de service.
- [x] 2.2 Implémenter les calculs de coût mensuel équivalent, coût annuel équivalent, décaissements 30/90 jours et dépenses sur période.
- [x] 2.3 Implémenter un service `payments` pour matérialiser les paiements projetés utiles, lister les paiements et corriger leur statut localement.

## 3. Interface Lot 3

- [x] 3.1 Étendre le formulaire abonnement pour renseigner les intervalles structurés nécessaires au premier incrément.
- [x] 3.2 Ajouter un résumé financier et une liste de paiements avec distinction visuelle des statuts `PROJECTED`, `ASSUMED_PAID`, `CONFIRMED_PAID`, `SKIPPED` et `REFUNDED`.
- [x] 3.3 Permettre la correction manuelle d'un paiement depuis l'interface sans bloquer l'écriture locale.

## 4. Tests et vérification

- [x] 4.1 Ajouter des tests unitaires pour les calculs financiers, la projection d'échéances, les fins de mois et les cas pause/fin de service.
- [x] 4.2 Ajouter des tests IndexedDB pour la migration v3, la persistance des paiements et la correction manuelle locale.
- [x] 4.3 Exécuter `pnpm lint`, `pnpm test` et `pnpm build`, puis vérifier l'absence de secret frontend ou de fichier `dexie-cloud.key`.