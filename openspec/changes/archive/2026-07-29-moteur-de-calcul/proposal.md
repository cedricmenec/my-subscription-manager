## Why

Plusieurs informations affichées dans l'application (coûts mensuels/annuels équivalents, décaissements à venir sur 30/90 jours, prochaines échéances de renouvellement) dépendent de calculs qui doivent rester à jour lorsque les données changent (modification d'un abonnement, import massif, synchronisation Dexie Cloud depuis un autre appareil) ou simplement parce que le temps a passé (une échéance calculée hier peut être périmée aujourd'hui). Aujourd'hui, ce recalcul est fait de façon manuelle et dispersée : `refreshFinance()` est dupliqué à 6 emplacements différents dans `App.tsx`, ne couvre pas les changements arrivant par synchronisation multi-appareil, et ne distingue pas les données qui doivent être mises en cache (réutilisées par d'autres calculs) de celles qui sont uniquement utiles à l'affichage. Il n'existe aucune notion de dépendances entre calculs, aucun déclenchement périodique ou "au démarrage", et aucune observabilité (durée d'exécution, historique des recalculs).

## What Changes

- Introduction d'un **moteur de calcul** (`CalculationEngine`), composant logique dédié qui possède un **registre de calculateurs** nommés (uniquement les calculs "de travail", réutilisés par d'autres traitements — ex. paiements projetés, prochaines échéances — par opposition aux calculs d'affichage qui restent des fonctions pures appelées directement par les composants).
- Le registre décrit un **graphe de dépendances explicite** entre calculateurs (ex. "prochaines échéances" dépend de "paiements projetés").
- Le moteur peut être déclenché par 5 types de **triggers** : `mutation` (hooks Dexie natifs sur `subscriptions`/`payments`/`settings`, capte aussi les changements reçus par synchronisation), `startup` (montage de l'application), `interval` (minuterie configurable, ex. 10 min / 1h), `stale-check` (seuil de péremption global comparé à l'horodatage du dernier run complet) et `manual` (bouton ou appel API explicite).
- Les triggers rapprochés dans le temps sont **coalescés (debounce)** pour éviter les tempêtes de recalcul (ex. import CSV, restauration de snapshot).
- Le résultat de chaque calculateur est **persisté** dans la table Dexie la plus appropriée à sa nature : les calculateurs qui produisent de la donnée métier partagée entre appareils continuent d'écrire dans les tables synchronisées existantes (ex. paiements projetés dans `payments`, inchangé) ; les nouvelles données purement internes au moteur (horodatage de dernière exécution, futurs agrégats sans valeur métier propre) sont stockées dans une nouvelle table locale **non synchronisée**.
- La réactivité de l'interface vis-à-vis de ces données persistées s'appuie sur `dexie-react-hooks` (`useLiveQuery`), qui remplace le pattern actuel de rafraîchissement manuel pour les données concernées.
- Chaque exécution (run) journalise, dans la table `diagnosticLogs` existante (non synchronisée), le trigger d'origine, la durée par calculateur, la durée totale, et les cas de calculateurs sautés par debounce — consultable via un historique de recalculs simple et lisible.
- Une vue de debug textuelle simple liste le graphe de dépendances déclaré (calculateur → dépendances) ; un rendu graphique visuel est explicitement hors périmètre pour cette itération.
- Une API permet de déclencher tout le registre ou une sélection explicite de calculateurs.
- Création du répertoire `docs/developers/` avec un guide développeur décrivant le moteur de calcul (registre, triggers, dépendances, observabilité).
- Ajout de deux règles de convention au projet OpenSpec (`openspec/config.yaml`) : toute introduction de concept complexe doit être documentée dans `docs/developers/`, et tout changement impactant l'usage produit doit être documenté dans `docs/users/`.

## Capabilities

### New Capabilities

- `calculation-engine`: registre de calculateurs, graphe de dépendances, triggers (mutation/startup/interval/stale-check/manual), debounce, persistance locale non synchronisée des résultats, journalisation d'exécution et vue de debug textuelle du graphe.

### Modified Capabilities

- `finances-paiements`: la matérialisation des paiements projetés (actuellement `materializeProjectedPayments`, appelée manuellement) devient un calculateur enregistré dans le moteur, déclenché par les triggers du moteur plutôt que par des appels manuels dispersés dans `App.tsx`.

## Impact

- **Code affecté** : nouveau module `src/services/calculationEngine/` (registre, orchestrateur, triggers, debounce, journalisation) ; `src/data/db.ts` (nouvelle table locale non synchronisée pour les résultats persistés du registre, ex. paiements projetés / prochaines échéances) ; `src/services/payments.ts` (le calculateur `projected-payments` s'appuie sur la logique existante de `materializeProjectedPayments`) ; `src/App.tsx` (suppression des appels manuels dispersés à `refreshFinance()`, remplacés par l'initialisation du moteur et `useLiveQuery`) ; `src/components/DiagnosticDialog.tsx` (ou nouveau composant) pour l'historique de recalculs et la vue de debug du graphe.
- **Dépendances** : ajout de `dexie-react-hooks` comme nouvelle dépendance de production.
- **Documentation** : nouveau répertoire `docs/developers/` ; mise à jour de `openspec/config.yaml` (règles de documentation).
- **Non-goals explicites** : pas de Web Worker dans cette itération (le design doit néanmoins permettre cette évolution) ; pas de rendu graphique du graphe de dépendances (texte structuré uniquement) ; pas de péremption fine par calculateur (seuil global uniquement) ; pas de synchronisation Dexie Cloud des données dérivées ou des journaux d'exécution.
- **Lot d'implémentation** : ce changement constitue une nouvelle capacité transverse ("Lot moteur de calcul"), postérieure aux Lots 1-4 déjà archivés (socle local-first, abonnements v2, finances/paiements Lot 3, import/export Lot 4).
