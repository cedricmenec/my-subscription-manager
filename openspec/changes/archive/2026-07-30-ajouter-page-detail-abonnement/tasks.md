## 1. Navigation et accès

- [x] 1.1 Étendre la navigation par hash pour reconnaître `#/subscriptions/:id`, conserver l’identifiant sélectionné et gérer le chargement direct
- [x] 1.2 Ajouter une action de consultation distincte dans les listes compacte et cartes

## 2. Fiche détaillée

- [x] 2.1 Créer `SubscriptionDetailPage` avec les états chargement, introuvable et retour vers la liste
- [x] 2.2 Mettre en relief le prochain paiement, le renouvellement automatique et leurs dates relatives
- [x] 2.3 Afficher les échéances futures, les paiements à vérifier et l’historique repliable
- [x] 2.4 Organiser tous les champs de l’abonnement par sections et réutiliser le dialogue d’édition
- [x] 2.5 Ajouter les styles responsives et les états de focus nécessaires à la fiche

## 3. Conservation de l’historique

- [x] 3.1 Modifier la rematérialisation pour préserver les paiements corrigés ou finalisés et éviter les doublons de date
- [x] 3.2 Remplacer la mise à jour partielle d’un statut de paiement par une écriture complète compatible Dexie Cloud `@id`

## 4. Documentation et tests

- [x] 4.1 Ajouter le guide utilisateur français de la fiche détaillée sous `docs/users/`
- [x] 4.2 Tester la fiche, ses échéances conditionnelles, son historique replié et ses états d’erreur
- [x] 4.3 Tester la préservation des paiements corrigés et finalisés pendant la rematérialisation
- [x] 4.4 Mettre à jour les tests de navigation et d’accès depuis les listes

## 5. Vérification

- [x] 5.1 Exécuter la suite de tests et corriger toute régression
- [x] 5.2 Exécuter le lint et le build de production
- [x] 5.3 Vérifier la conformité de l’implémentation avec les scénarios OpenSpec
