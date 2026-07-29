## 1. Préparation et fondations

- [x] 1.1 Ajouter la dépendance Dexie React hooks et préparer la nouvelle table locale de suivi du moteur
- [x] 1.2 Créer le registre du moteur de calcul, le graphe de dépendances et l'API de déclenchement manuel

## 2. Intégration applicative

- [x] 2.1 Brancher le moteur sur les hooks Dexie, les triggers startup/interval/stale-check et le debounce
- [x] 2.2 Remplacer les appels manuels dispersés à refreshFinance par l'utilisation du moteur et la réactivité LiveQuery
- [x] 2.3 Exposer l'historique d'exécution et la vue de debug textuelle depuis le diagnostic

## 3. Documentation et validation

- [x] 3.1 Rédiger le guide développeur dans docs/developers/calculation-engine.md
- [x] 3.2 Ajouter les tests automatisés couvrant l'ordre des dépendances et le comportement du moteur
- [x] 3.3 Exécuter la suite de tests et la compilation, puis vérifier l'état OpenSpec
