## Context

Le moteur de calcul (`calculationEngine.ts`) réagit aux mutations Dexie via des hooks (`creating`, `updating`) sur les tables `subscriptions`, `payments`, et `settings`. Lorsqu'un hook est déclenché, il planifie un run avec `scheduleRun('mutation')` et un debounce de 250ms. Le calculateur `projected-payments` purge tous les paiements GENERATED puis les recrée, ce qui génère des écritures → déclenche les hooks sur l'autre instance via Dexie Cloud sync → boucle.

Le plan gratuit Dexie Cloud limite à 50 syncs par utilisateur par tranche de 5 minutes.

## Goals / Non-Goals

**Goals:**
- Casser la boucle de recalcul entre instances (idempotence)
- Protéger le quota de synchronisation Dexie Cloud (circuit breaker)
- Fournir des outils de diagnostic visuels pour le troubleshooting

**Non-Goals:**
- Séparer les paiements GENERATED dans une table locale non synchronisée (piste future)
- Système de table d'événements cross-instance (trop complexe pour le besoin actuel)
- Hachage de contenu des abonnements pour détecter les changements

## Decisions

### D1 : Idempotence par comparaison de contenu (P0)

**Approche :** `materializeProjectedPayments` charge les GENERATED existants, calcule les projections, compare les deux jeux par paires `(scheduledDate, amount, status, subscriptionId)`. Si identique pour un abonnement, on ne touche à rien. Si différent, on DELETE ceux qui ont disparu et on CREATE les nouveaux.

**Alternatives rejetées :**
- Deux tables séparées (payments synchro + projectedPayments locale) : trop de refactoring des requêtes et composants.
- Hachage de contenu : complexité inutile, debugging difficile.

**Flux après idempotence :**
```
Instance A modifie abonnement → sync → Instance B reçoit
  → B recalcule → compare avec GENERATED existants
  → identique → zéro écriture → pas de sync retour → BOUCLE CASSÉE
```

### D2 : Circuit breaker anti-boucle (P1)

**Approche :** Compteur de runs avec `trigger === 'mutation'` sur une fenêtre glissante de 10 secondes. Si le seuil de 5 runs est atteint, on bloque les runs mutation pendant 30 secondes. Les runs `manual`, `startup`, `interval` et `stale-check` ne sont pas bloqués. Un log est écrit dans `diagnosticLogs` avec la catégorie `circuit-breaker`.

**Mécanisme :**
- Fenêtre stockée en mémoire : tableau de timestamps des runs mutation récents
- À chaque `scheduleRun('mutation')`, vérifier si la fenêtre dépasse le seuil
- Si oui, ignorer le run, écrire un log, et définir `circuitBreakerBlockedUntil`
- Le statut du circuit breaker est exposé pour la page Diagnostic

### D3 : Nouvelle fenêtre de suppression de mutation (P1 complémentaire)

`mutationSuppressionUntil` passe de 1s → 5s après un run de calcul. Cela réduit la fenêtre de réactivité aux mutations qui sont le résultat du calcul lui-même.

### D4 : Page Diagnostic avec composants React (P2)

**Approche :** Nouvel onglet applicatif "Diagnostic" accessible depuis la barre de navigation. Chaque outil de diagnostic est un composant React indépendant :

| Composant | Rôle | Données |
|-----------|------|---------|
| `SyncRateGauge` | Jauge du quota sync utilisé | Calculé à partir de `diagnosticLogs` |
| `CalculationTimeline` | Timeline des exécutions de calcul | `diagnosticLogs` de catégorie `calc-engine` |
| `WriteImpact` | Impact en écritures par run | `diagnosticLogs` de catégorie `calc-engine` |
| `CircuitBreakerStatus` | Statut du circuit breaker | Exposé par `calculationEngine` |
| `InstanceIdentity` | Identité de l'instance locale | Généré au démarrage |

**Format de données enrichi pour les logs :** Le `CalculationRunSummary` dans les logs `calc-engine` inclut désormais le nombre d'écritures (DELETE/CREATE) et l'ID d'instance.

## Risks / Trade-offs

- **[Risque] Comparaison de tableaux** : La comparaison des GENERATED existants avec les projections peut être coûteuse si le nombre de paiements est très élevé. → **Mitigation** : La comparaison se fait abonnement par abonnement, dans une transaction. Le nombre de paiements par abonnement est typiquement < 50.
- **[Risque] Circuit breaker trop agressif** : Un seuil à 5 runs en 10s pourrait être atteint lors d'opérations légitimes (import CSV suivi de recalcul). → **Mitigation** : Le seuil est paramétrable, et le circuit breaker n'affecte que les runs `mutation`. Les runs `manual` restent possibles.
- **[Risque] Performance des logs** : L'écriture de logs de diagnostic dans IndexedDB peut dégrader les performances. → **Mitigation** : Limiter à 500 entrées dans `diagnosticLogs` avec purge automatique des plus anciennes.
- **[Risque] Instance ID non persistant** : L'ID d'instance est généré en mémoire à chaque session. → **Accepté** : Ce n'est pas un identifiant stable, mais il suffit pour distinguer deux onglets simultanés.