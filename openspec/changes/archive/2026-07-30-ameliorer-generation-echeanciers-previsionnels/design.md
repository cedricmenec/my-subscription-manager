## Context

Le moteur actuel matérialise dans `payments` des paiements `GENERATED/PROJECTED` synchronisés sur une fenêtre fixe de 90 jours. Un second calculateur, `projected-charge-dates`, écrit douze dates dans `calculationState`, table locale non synchronisée, mais cette valeur n’est consommée par aucune interface et contient un `generatedAt` volatil qui empêche l’idempotence.

La fiche abonnement lit exclusivement `payments` et limite les prochaines échéances à cinq. La rematérialisation protège déjà les paiements corrigés et finalisés, mais remplace toutes les projections intactes d’un abonnement dès qu’une différence apparaît.

Le changement doit rester compatible avec l’architecture statique React/Dexie Cloud, les dates civiles, les identifiants `pym` et les règles RG-DAT-001 à RG-DAT-006, RG-STA-003, RG-PAU-001, RG-CAN-002, RG-REN-001, TECH-LF-001 à TECH-LF-004 et AC-016.

## Goals / Non-Goals

**Goals:**

- fournir un calcul RF-01 pur, inclusif et déterministe ;
- éviter les dérives calendaires après un mois court ;
- produire un horizon pertinent selon la périodicité et la prochaine date de renouvellement ;
- conserver `payments` comme seule matérialisation métier synchronisée ;
- réduire les écritures et synchronisations aux différences réelles ;
- protéger sans exception les paiements réels, corrigés, manuels ou importés ;
- afficher jusqu’à douze prochaines échéances sur la fiche ;
- documenter le comportement côté développeur et utilisateur.

**Non-Goals:**

- créer des tables `PlannedOccurrence` et `ActualOccurrence` ;
- conserver une photographie distincte de la valeur prévisionnelle avant correction ;
- ajouter un statut persistant `OVERDUE` ;
- exécuter des traitements lorsque ni l’application ni n8n ne sont actifs ;
- gérer les tarifs promotionnels, variables ou non déterministes.

## Decisions

### Décision 1 — Une seule matérialisation métier dans `payments`

`payments` reste la source de vérité synchronisée. Une ligne `PROJECTED/GENERATED` est une échéance prévisionnelle remplaçable tant qu’elle n’a pas été corrigée. Tout autre statut, toute correction et toute autre source constituent une donnée protégée.

Le calculateur `projected-charge-dates` est retiré du registre. Sa logique utile devient une fonction pure appelée par `projected-payments`. `calculationState` reste réservé aux métadonnées locales du moteur.

Alternative rejetée : une table locale de projections recalculée au démarrage. Elle empêcherait la consultation cohérente multi-appareils, l’exploitation par n8n et la transition d’une projection synchronisée vers un paiement constaté.

### Décision 2 — Calcul RF-01 depuis l’ancre

La primitive de récurrence reçoit une ancre, un intervalle, une date de référence et une politique calendaire. Elle retourne la première occurrence `>= referenceDate`.

Chaque occurrence mensuelle ou annuelle est calculée directement depuis l’ancre et son indice. L’algorithme ne chaîne pas les résultats intermédiaires, afin que `30 janvier → 28 février → 30 mars` reste stable.

La politique est déduite de l’ancre :

- ancre au dernier jour du mois : conservation de la fin de mois ;
- autre ancre : conservation du numéro de jour, ramené au dernier jour valide du mois cible.

Cette convention couvre aussi les anniversaires au 29 février sans ajouter de champ persisté. Une évolution ultérieure pourra exposer une politique explicite dans `Subscription` si les fournisseurs exigent des exceptions.

### Décision 3 — Fenêtre adaptative

La projection démarre à la première échéance de facturation supérieure ou égale à la date de référence.

- `YEAR` : une occurrence ;
- `MONTH` : jusqu’à douze mois de couverture et au plus `ceil(12 / count)` occurrences ;
- `DAY` ou `WEEK` : douze mois de couverture avec un plafond de 366 occurrences ;
- si `nextRenewalDate` est connue et valide, elle borne la fenêtre de façon inclusive ;
- `serviceEndDate` reste une borne inclusive prioritaire ;
- les règles existantes de pause et d’éligibilité restent appliquées.

La borne de renouvellement est inclusive parce qu’une facturation située exactement à cette date peut constituer le prélèvement déclenchant le renouvellement. La fiche limite néanmoins l’affichage aux douze premières lignes pour rester lisible.

### Décision 4 — Réconciliation différentielle par date civile

Pour chaque abonnement, les projections désirées sont comparées aux projections intactes existantes, indexées par `scheduledDate`.

- même date, même montant, même devise et même statut : aucune écriture ;
- même date avec valeur différente : `put` de la ligne existante en conservant son identifiant ;
- date manquante : création avec l’identifiant déterministe `pym-projected-<subscriptionId>-<YYYY-MM-DD>` ;
- date devenue obsolète : suppression uniquement de la projection intacte ;
- date occupée par une ligne protégée : aucune projection n’est créée.

Le rapprochement par date permet une migration progressive : les anciennes lignes à identifiant aléatoire sont réutilisées tant que leur date reste projetée. Les identifiants déterministes empêchent deux appareils de créer des doublons pour une même nouvelle date.

La transaction Dexie reste limitée à `payments`. Les écritures sont locales et ne dépendent pas d’un accusé réseau ; Dexie Cloud synchronise ensuite les différences.

### Décision 5 — Déclenchements et observabilité

Le calculateur unique `projected-payments` conserve les déclenchements startup, mutation, interval, stale-check et manual. Les statistiques de run exposent créations, mises à jour et suppressions. Les écritures du moteur restent protégées par la suppression de mutation, le debounce et le circuit breaker existants.

### Décision 6 — Documentation

Le guide développeur `docs/developers/calculation-engine.md` décrira RF-01, la fenêtre adaptative et la réconciliation différentielle avec des exemples concrets. Le guide utilisateur `docs/users/subscription-detail.md` expliquera l’horizon visible et la protection des échéances finalisées.

## Risks / Trade-offs

- [Deux projections concurrentes anciennes pour une même date] → rapprocher une ligne intacte existante et supprimer seulement les doublons remplaçables ; ne jamais toucher aux lignes protégées.
- [Identifiant déterministe trop long] → conserver un format lisible et préfixé `pym`, compatible avec les identifiants texte Dexie Cloud.
- [Très grand nombre d’occurrences quotidiennes] → limiter la fenêtre à douze mois et à 366 occurrences, tout en limitant la fiche à douze lignes.
- [Borne de renouvellement ambiguë] → adopter une borne inclusive documentée et testée.
- [Application fermée] → le moteur navigateur ne peut pas être proactif hors exécution ; les traitements sans navigateur restent du ressort de n8n.
- [Modification de date] → elle implique une suppression et une création, car la date constitue l’identité logique de la projection ; les dates finalisées restent protégées.

## Migration Plan

1. Déployer les fonctions pures de récurrence et de fenêtre adaptative.
2. Remplacer la réconciliation globale par la réconciliation différentielle.
3. Retirer `projected-charge-dates` du registre et de ses diagnostics.
4. Au premier run, réutiliser les anciennes projections par date, mettre à jour les valeurs divergentes et ne créer avec un identifiant déterministe que les dates absentes.
5. Laisser les anciennes entrées `calculationState` devenir inertes ; aucune migration de schéma n’est requise et elles pourront être nettoyées ultérieurement.

Retour arrière : restaurer l’ancien calculateur et la fenêtre de 90 jours. Les paiements créés restent compatibles avec le schéma actuel et peuvent être réconciliés par l’ancienne implémentation.

## Open Questions

Aucune question bloquante. La conservation simultanée des valeurs prévues et réelles pourra faire l’objet d’un changement séparé si une analyse d’écart devient un besoin produit.
