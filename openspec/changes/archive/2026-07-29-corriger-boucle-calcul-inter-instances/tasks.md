## 1. Idempotence de la matérialisation des paiements

- [x] 1.1 Modifier `materializeProjectedPayments` dans `payments.ts` : charger les GENERATED existants, calculer les projections, comparer les deux jeux par paires `(subscriptionId, scheduledDate, amount, status)`, et n'écrire que si différent
- [x] 1.2 Mettre à jour les tests unitaires dans `payments.test.ts` pour couvrir le cas idempotent (recalcul sans changement = zéro écriture)
- [x] 1.3 Mettre à jour la documentation développeur dans `docs/developers/calculation-engine.md` pour le nouveau comportement idempotent

## 2. Circuit breaker anti-boucle

- [x] 2.1 Ajouter le circuit breaker dans `calculationEngine.ts` : compteur de runs mutation sur fenêtre glissante de 10s, seuil à 5, blocage 30s, log dans `diagnosticLogs`
- [x] 2.2 Étendre la fenêtre `mutationSuppressionUntil` de 1s à 5s après un run
- [x] 2.3 Exposer l'état du circuit breaker (actif/inactif, seuil, début/fin de blocage) depuis l'interface du moteur de calcul

## 3. Enrichissement des logs du moteur de calcul

- [x] 3.1 Ajouter le nombre d'écritures (DELETE/CREATE) dans les logs du calculateur `projected-payments`
- [x] 3.2 Générer un ID d'instance unique au démarrage et l'inclure dans les logs de calcul

## 4. Page Diagnostic

- [x] 4.1 Ajouter l'onglet « Diagnostic » dans la barre de navigation et la gestion des fragments d'URL
- [x] 4.2 Créer le composant `SyncRateGauge` : jauge du quota sync (50 syncs / 5 min)
- [x] 4.3 Créer le composant `CalculationTimeline` : timeline des 20 dernières exécutions
- [x] 4.4 Créer le composant `WriteImpact` : nombre d'écritures par run
- [x] 4.5 Créer le composant `CircuitBreakerStatus` : statut du circuit breaker
- [x] 4.6 Créer le composant `InstanceIdentity` : ID d'instance locale et métriques
- [x] 4.7 Créer la page `DiagnosticPage.tsx` qui assemble les composants

## 5. Tests et validation

- [x] 5.1 Exécuter les tests existants et vérifier qu'ils passent
- [x] 5.2 Vérifier la compilation TypeScript sans erreur
- [x] 5.3 Vérifier que le build Vite produit le bundle sans erreur