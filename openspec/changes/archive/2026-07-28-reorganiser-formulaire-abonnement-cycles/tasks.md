## 1. Modèle de données et migration Dexie

- [x] 1.1 Ajouter les champs `nextRenewalDate`, `renewalStartDate`, `commitmentStartDate`, `pauseStartDate` à l'interface `Subscription` dans `db.ts`
- [x] 1.2 Créer la migration Dexie v7 avec les index des nouveaux champs

## 2. Helper `describeInterval` pour l'affichage des cycles

- [x] 2.1 Créer la fonction `describeInterval(count: number, unit: IntervalUnit): string` dans `finance.ts`
- [x] 2.2 Ajouter les tests unitaires pour les textes récapitulatifs

## 3. Mise à jour des services de validation et CRUD

- [x] 3.1 Ajouter `startDate` manquant au payload de `UpsertSubscriptionInput` si nécessaire
- [x] 3.2 Intégrer les 4 nouveaux champs dans `createSubscription` et `updateSubscription`
- [x] 3.3 Ajouter la validation des nouveaux champs dans `subscriptionValidation.ts`
- [x] 3.4 Implémenter la logique de calcul de `nextRenewalDate` dans le service

## 4. Réorganisation du formulaire SubscriptionDialog

- [x] 4.1 Ajouter `startDate` dans `SubscriptionFormState`, `toFormState()` et le payload de soumission
- [x] 4.2 Créer la section "Cycle de facturation" avec presets (Hebdo/Mensuel/Annuel/Personnalisé) et texte récapitulatif
- [x] 4.3 Créer la section "Renouvellement" conditionnelle (visible si renouvellement automatique) avec initialisation par défaut depuis le cycle de facturation
- [x] 4.4 Créer la section "Engagement" conditionnelle (bouton Avec/Sans engagement) avec calcul informatif de la date de fin
- [x] 4.5 Créer la section "Pause" conditionnelle avec champs début/fin
- [x] 4.6 Créer la section "Fin de service" (affichage conditionnel ou message "Pas de fin de service programmée")
- [x] 4.7 Supprimer les anciennes sections "Facturation" et "Dates" du JSX

## 5. Tests

- [x] 5.1 Vérifier que les tests existants passent après les modifications (36/36 PASS)
- [x] 5.2 Vérifier la compilation TypeScript (`pnpm typecheck` → OK)

## 6. Build et vérification finale

- [x] 6.1 Vérifier le build complet (`pnpm build` → OK, 308 modules)
- [ ] 6.2 Vérifier le fonctionnement manuel du formulaire (création et édition d'abonnement)