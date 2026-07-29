## 1. Fondations — Modèle de données et migration

- [x] 1.1 Renommer `renewalStartDate` → `subscriptionDate` dans le type `Subscription` dans `src/data/db.ts` (champ, interfaces, documentation)
- [x] 1.2 Ajouter `renewalPeriodStartDate` (date civile optionnelle) au type `Subscription`
- [x] 1.3 Ajouter `notifyBeforeRenewal` (boolean optionnel) et `notifyBeforeRenewalDays` (number optionnel) au type `Subscription`
- [x] 1.4 Supprimer le champ `renewalStartDate` du schéma Dexie (version 7)
- [x] 1.5 Créer la migration Dexie v8 : copier `renewalStartDate` → `subscriptionDate`, initialiser `renewalPeriodStartDate` avec `subscriptionDate`, ajouter `notifyBeforeRenewal`/`notifyBeforeRenewalDays` à `undefined`, supprimer `renewalStartDate`
- [x] 1.6 Mettre à jour le `schemaVersion` dans `createSubscription` et `updateSubscription` (passer de 7 à 8)

## 2. Services — Mise à jour du CRUD

- [x] 2.1 Mettre à jour le type `UpsertSubscriptionInput` dans `src/services/subscriptions.ts` : remplacer `renewalStartDate` par `subscriptionDate` et `renewalPeriodStartDate`
- [x] 2.2 Mettre à jour `createSubscription` : stocker `subscriptionDate`, initialiser `renewalPeriodStartDate` avec `subscriptionDate` si absent, ne plus écrire `renewalStartDate`
- [x] 2.3 Mettre à jour `updateSubscription` : `subscriptionDate` en lecture seule (ne pas permettre sa modification), `renewalPeriodStartDate` ajustable, `nextRenewalDate` passé en paramètre ignoré (surchargé par le moteur)
- [x] 2.4 Mettre à jour `computeNextRenewalDate` : utiliser `renewalPeriodStartDate` comme ancre prioritaire, `subscriptionDate` en fallback. Renommer les paramètres pour correspondre aux nouveaux noms
- [x] 2.5 Ajouter la règle de cohérence `nextChargeDate > nextRenewalDate` dans la validation (`subscriptionValidation.ts`) : applicable seulement si `renewalInterval` = `billingInterval` et `renewalMode=AUTOMATIC`
- [x] 2.6 Mettre à jour `computeSubscriptionCompletion` : `subscriptionDate` et `renewalPeriodStartDate` n'entrent pas dans le score de complétude (inchangé)
- [x] 2.7 Mettre à jour le type `SubscriptionFormInput` dans `subscriptionValidation.ts` : remplacer `renewalStartDate` par `subscriptionDate` et `renewalPeriodStartDate`

## 3. Moteur de calcul — Calculateur next-renewal-date

- [x] 3.1 Implémenter la fonction `computeNextRenewalDate(subscription, today)` dans le calculateur (logique de boucle while avec addIntervalToCivilDate, règle d'arrêt ENDED/CANCELLED_PENDING_END)
- [x] 3.2 Implémenter la fonction `computeDefaultAlert(subscription)` : règles de défaut mensuel/annuel/manuel
- [x] 3.3 Ajouter le calculateur `next-renewal-date` dans `createDefaultRegistry()` dans `src/services/calculationEngine.ts` (sans dépendances)
- [x] 3.4 Implémenter la logique d'idempotence : comparer `nextRenewalDate` calculé avec la valeur stockée, n'écrire que si différent
- [x] 3.5 Journaliser les résultats du calculateur dans `diagnosticLogs` (catégorie `calc-engine`, événement `next-renewal-date-result`)
- [x] 3.6 Vérifier que le calculateur est bien inclus dans les runs complets (startup, interval, manual) et ciblés

## 4. Interface — Dialogue de création/édition

- [x] 4.1 Ajouter `subscriptionDate`, `renewalPeriodStartDate` à `SubscriptionFormState` et `EMPTY_FORM`
- [x] 4.2 Mettre à jour `toFormState` : mapper les nouveaux champs depuis `Subscription`
- [x] 4.3 Passer `nextRenewalDate` en lecture seule dans le formulaire : affichage de la date sans input modifiable, ajout du label "Mise à jour automatique"
- [x] 4.4 Ajouter les champs `subscriptionDate` (modifiable en création, lecture seule en édition) et `renewalPeriodStartDate` (ajustable) dans la section Renouvellement
- [x] 4.5 Pré-remplir `renewalIntervalCount/Unit` et `renewalPeriodStartDate` avec les valeurs du cycle de facturation et `startDate` lors de l'activation du mode AUTOMATIC
- [x] 4.6 Mettre à jour `handleSubmit` pour envoyer `subscriptionDate`, `renewalPeriodStartDate` et ne plus envoyer `renewalStartDate`
- [x] 4.7 Ajouter la validation de cohérence `nextChargeDate > nextRenewalDate` dans le formulaire (message d'erreur utilisateur)

## 5. Tests

- [x] 5.1 Ajouter des tests unitaires pour `computeNextRenewalDate` : ancre prioritaire, fallback, cycle mensuel/annuel/personnalisé, absence d'ancre
- [x] 5.2 Ajouter des tests unitaires pour les règles d'arrêt : ENDED → undefined, CANCELLED_PENDING_END + serviceEndDate dépassée, archivé ignoré
- [x] 5.3 Ajouter des tests unitaires pour `computeDefaultAlert` : mensuel → opt-in/7j, annuel → opt-out/30j, manuel → always/7j, valeurs utilisateur conservées
- [x] 5.4 Ajouter des tests d'intégration IndexedDB pour la migration v7→v8 : copie `renewalStartDate`, ajout des nouveaux champs
- [x] 5.5 Ajouter des tests unitaires pour la règle de cohérence `nextChargeDate > nextRenewalDate` dans `subscriptionValidation.ts`
- [x] 5.6 Ajouter des tests pour le calculateur `next-renewal-date` : exécution dans le registre, idempotence, non-écriture si identique
- [x] 5.7 Ajouter un test de déclenchement : mutation d'abonnement → le calculateur est exécuté et `nextRenewalDate` est mise à jour

## 6. Documentation

- [x] 6.1 Mettre à jour `docs/developers/calculation-engine.md` : ajouter la section "Calculateur next-renewal-date" avec l'algo, les règles d'arrêt, et les alertes
- [x] 6.2 Ajouter une section "Renouvellement automatique" dans `docs/users/calculation-engine.md` : expliquer la différence entre `subscriptionDate`, `renewalPeriodStartDate`, et le calcul de `nextRenewalDate`

## 7. Vérification et conformité

- [x] 7.1 Exécuter `pnpm lint`, `pnpm test` et `pnpm build` avec succès
- [x] 7.2 Vérifier l'absence de référence à `renewalStartDate` dans le code source (à l'exception de la migration Dexie)
- [x] 7.3 Vérifier que `nextRenewalDate` n'est plus modifiable dans l'UI
- [x] 7.4 Vérifier que le calculateur s'exécute au startup et après mutation (logs de diagnostic visibles dans la page Diagnostic)