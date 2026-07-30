## 1. Fondations calendaires

- [x] 1.1 Implémenter le calcul ancré d’une occurrence mensuelle ou annuelle sans dérive après un mois court
- [x] 1.2 Implémenter RF-01 avec convention supérieure ou égale et tests des jours 30, fin de mois et année bissextile

## 2. Projection adaptative

- [x] 2.1 Remplacer la fenêtre fixe de projection par la politique annuelle, mensuelle et bornée par renouvellement ou fin de service
- [x] 2.2 Ajouter les tests de douze échéances mensuelles, échéance annuelle unique, borne de renouvellement inclusive, pause et fin de service

## 3. Réconciliation synchronisée

- [x] 3.1 Réconcilier les projections par date avec créations, mises à jour et suppressions minimales
- [x] 3.2 Générer des identifiants déterministes préfixés `pym` pour les nouvelles projections
- [x] 3.3 Préserver les échéances corrigées, finalisées, manuelles, importées ou n8n et empêcher les doublons à leurs dates
- [x] 3.4 Exposer et journaliser `createCount`, `updateCount` et `deleteCount`
- [x] 3.5 Ajouter les tests d’idempotence, de mise à jour en place, d’identité déterministe et de protection de l’historique

## 4. Orchestration et interface

- [x] 4.1 Retirer `projected-charge-dates` du registre et confirmer que `projected-payments` reste exécuté par tous les déclencheurs
- [x] 4.2 Réutiliser RF-01 pour le prochain renouvellement et couvrir la convention inclusive sans dérive
- [x] 4.3 Afficher jusqu’à douze échéances futures dans la fiche abonnement et adapter les tests

## 5. Documentation

- [x] 5.1 Mettre à jour `docs/developers/calculation-engine.md` en anglais simplifié avec RF-01, l’horizon adaptatif et la réconciliation
- [x] 5.2 Mettre à jour `docs/users/subscription-detail.md` en français avec l’horizon visible et la protection des échéances finalisées

## 6. Vérification

- [x] 6.1 Exécuter les tests ciblés des dates, paiements, moteur et fiche abonnement
- [x] 6.2 Exécuter la suite complète, le lint et le build de production
- [x] 6.3 Vérifier la conformité de l’implémentation aux delta specs et au design
