## 1. Modèle et migration locale

- [x] 1.1 Étendre `RenewalMode`, les schémas de validation et les libellés avec `ROLLING`, puis centraliser les invariants de continuation dans un helper métier testé.
- [x] 1.2 Ajouter la migration Dexie suivante pour convertir uniquement les cas legacy déterministes en `ROLLING`, nettoyer leurs champs contractuels et conserver les cas ambigus inchangés.
- [x] 1.3 Couvrir la migration par des tests IndexedDB : cas déterministe, facturation annuelle exclue, cas ambigu, seconde exécution idempotente et conservation intégrale des paiements.
- [x] 1.4 Adapter le service de sauvegarde pour nettoyer les champs contractuels de `ROLLING` au moyen de `put`, sans attendre le réseau ni écraser les données concurrentes non concernées.

## 2. Calculs de renouvellement et de projection

- [x] 2.1 Modifier le calculateur `next-renewal-date` pour ne calculer que les renouvellements contractuels automatiques, nettoyer les valeurs résiduelles de `ROLLING` et produire des raisons de diagnostic stables sans données sensibles.
- [x] 2.2 Implémenter la détection partagée d'un renouvellement contractuel distinct et l'utiliser dans la validation de cohérence des dates.
- [x] 2.3 Corriger l'horizon de projection : douze occurrences pour une mensualisation continue ou legacy identique, borne annuelle inclusive avec maximum douze, une occurrence annuelle et borne `serviceEndDate` toujours prioritaire.
- [x] 2.4 Vérifier la réconciliation idempotente des projections générées et garantir par tests que les paiements réels, importés ou corrigés ne sont ni modifiés ni supprimés.
- [x] 2.5 Ajouter des tests calendaires et de moteur couvrant RF-01, fin de mois, cas mensuel/mensuel, mensuel/annuel, annuel, fin de service, pause et exécutions répétées.

## 3. Création, édition et consultation

- [x] 3.1 Remplacer le sélecteur de renouvellement du dialogue par la question « Comment l'abonnement se poursuit-il ? » et ses quatre choix en français.
- [x] 3.2 Supprimer la copie automatique du cycle de facturation, conditionner les champs contractuels aux modes concernés et nettoyer ces champs à la sauvegarde de `ROLLING`.
- [x] 3.3 Adapter validations, messages d'erreur, navigation clavier et tests du dialogue aux nouveaux invariants et à la séparation facturation/engagement/renouvellement.
- [x] 3.4 Mettre à jour la page de détail pour afficher « Reconduction continue », masquer la carte de renouvellement correspondante et conserver jusqu'à douze échéances financières futures.
- [x] 3.5 Mettre à jour cartes, grille, badges et filtres de la liste pour distinguer `ROLLING`, `AUTOMATIC`, `MANUAL` et `UNKNOWN`, avec tests des quatre valeurs.

## 4. Import, export et compatibilité

- [x] 4.1 Étendre les imports/exports CSV et snapshot à `ROLLING`, appliquer les invariants avant écriture et conserver la compatibilité avec les trois anciennes valeurs.
- [x] 4.2 Ajouter des tests de round-trip CSV/snapshot, de normalisation legacy déterministe, de rejet d'un mode inconnu et de conservation des paiements restaurés.
- [x] 4.3 Vérifier que restauration et import restent transactionnels, utilisables hors connexion et synchronisables sans boucle de réécriture.

## 5. Documentation utilisateur et développeur

- [x] 5.1 Mettre à jour `docs/users/echeanciers-previsionnels.md` en français avec les horizons mensuel continu, mensuel/annuel, annuel, la borne de fin de service et la protection des paiements réels.
- [x] 5.2 Mettre à jour `docs/users/subscription-detail.md` en français avec les quatre modes, le choix dans le formulaire et la distinction entre paiement et renouvellement contractuel.
- [x] 5.3 Mettre à jour `docs/developers/projected-schedules.md` en anglais simplifié avec l'algorithme de borne, le fallback legacy, l'idempotence et les cas de test.
- [x] 5.4 Mettre à jour `docs/developers/calculation-engine.md` en anglais simplifié avec `ROLLING`, les invariants, les déclencheurs et les diagnostics du calculateur.
- [x] 5.5 Mettre à jour `docs/import-schema.md` avec la valeur `ROLLING`, ses champs incompatibles et les règles de normalisation des anciennes données.

## 6. Vérification finale

- [x] 6.1 Exécuter les tests ciblés du modèle, des migrations, des calculateurs, de l'import/export et des composants, puis corriger toute régression.
- [x] 6.2 Exécuter la suite de tests complète, le lint et le build de production statique ; vérifier qu'aucun secret ni nouveau backend n'est introduit.
- [x] 6.3 Tester manuellement hors connexion un abonnement mensuel `ROLLING`, un contrat annuel payé mensuellement et un abonnement annuel, puis confirmer les nombres et bornes d'échéances attendus.
- [x] 6.4 Vérifier le changement avec OpenSpec, relire la cohérence proposal/design/specs/tasks et préparer la synchronisation puis l'archivage uniquement après implémentation complète.
