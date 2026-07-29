## 1. Fondations — Nettoyage des projections orphelines

- [x] 1.1 Modifier `materializeProjectedPayments` dans `src/services/payments.ts` pour purger les paiements `GENERATED` existants par abonnement avant de créer les nouvelles projections, dans la même transaction atomique.
- [x] 1.2 Ajouter un test unitaire dans `src/services/payments.test.ts` vérifiant qu'après modification de la date d'échéance d'un abonnement, l'ancien paiement `GENERATED` est supprimé et le nouveau créé (aucun doublon).
- [x] 1.3 Ajouter un test unitaire dans `src/services/payments.test.ts` vérifiant que les paiements `MANUAL`, `CONFIRMED_PAID` ou tout autre statut ne sont pas supprimés par la purge.

## 2. Interface — Bouton « Recalculer » et historique

- [x] 2.1 Ajouter un prop `onRecalculate` au composant `DiagnosticDialog` dans `src/components/DiagnosticDialog.tsx` et un bouton « Recalculer » avec état de désactivation pendant l'exécution.
- [x] 2.2 Connecter le bouton « Recalculer » dans `App.tsx` pour appeler `calculationEngine.run(undefined, 'manual')` puis rafraîchir les données.
- [x] 2.3 Afficher l'historique des exécutions du moteur de calcul dans `DiagnosticDialog` via `useLiveQuery` sur `diagnosticLogs[category='calc-engine']`, limité aux 20 dernières entrées.

## 3. Réactivité — useLiveQuery pour les paiements

- [x] 3.1 Remplacer la lecture manuelle des paiements dans `App.tsx` par l'utilisation directe du `useLiveQuery` existant (`livePayments`) pour alimenter le state `payments`.
- [x] 3.2 Simplifier `refreshFinance()` pour qu'elle déclenche uniquement le moteur de calcul sans relecture manuelle des paiements (la réactivité `useLiveQuery` s'en charge).
- [x] 3.3 Vérifier que les 6 sites d'appel à `refreshFinance()` dans `App.tsx` fonctionnent correctement avec le nouveau pattern réactif.

## 4. Tests et vérification

- [x] 4.1 Exécuter `pnpm lint` et corriger toute violation.
- [x] 4.2 Exécuter `pnpm test` et vérifier que tous les tests passent (existantes + nouvelles).
- [x] 4.3 Exécuter `pnpm build` et vérifier que la build produit sans erreur.
- [x] 4.4 Vérifier manuellement dans le navigateur que la modification d'un abonnement (date + montant) ne produit plus de doublons dans les prochaines échéances.

## 5. Documentation

- [x] 5.1 Mettre à jour `docs/developers/calculation-engine.md` pour documenter le comportement de purge des projections orphelines.
