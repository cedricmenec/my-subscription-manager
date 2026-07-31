## Context

Le modèle actuel sépare déjà les intervalles de facturation, d'engagement et de renouvellement, mais l'interface transforme implicitement un abonnement mensuel continu en renouvellement automatique mensuel : elle recopie le cycle de facturation et le moteur calcule alors `nextRenewalDate` à la même date que `nextChargeDate`. La projection financière interprète ensuite toute `nextRenewalDate` comme une borne contractuelle, ce qui réduit l'échéancier à une mensualité.

L'application est local-first : les abonnements et paiements sont persistés dans Dexie puis synchronisés. Le changement doit donc être migrable hors connexion, idempotent, compatible avec les snapshots/CSV existants et ne jamais réécrire les paiements réels ou corrigés lors d'une régénération.

## Goals / Non-Goals

**Goals :**

- rendre explicite la reconduction continue sans date contractuelle distincte ;
- donner au cycle de facturation la responsabilité de produire les échéances financières ;
- appliquer `nextRenewalDate` comme borne uniquement pour un renouvellement contractuel distinct ;
- produire douze mensualités pour un service mensuel continu, jusqu'à douze mensualités pour un contrat annuel payé mensuellement, et une seule échéance pour une facturation annuelle ;
- conserver `serviceEndDate` comme borne absolue et protéger les paiements réels ou corrigés ;
- migrer sans ambiguïté les données clairement continues et signaler les cas ambigus ;
- aligner formulaire, consultation, filtres, imports/exports, diagnostic et documentation.

**Non-Goals :**

- supprimer `renewalPeriodStartDate` ou remplacer maintenant le calcul ancré du renouvellement ;
- fusionner `startDate` et `subscriptionDate` ;
- créer deux tables physiques Planned/Actual ;
- modifier les règles d'engagement ou utiliser la fin d'engagement comme borne financière ;
- ajouter un service backend ou un ordonnanceur distant.

## Decisions

### 1. Représenter explicitement la reconduction continue

`RenewalMode` est étendu avec `ROLLING`. Il signifie que le service se poursuit jusqu'à résiliation, sans échéance contractuelle de renouvellement distincte. `AUTOMATIC` et `MANUAL` décrivent au contraire un contrat qui doit être renouvelé à une date identifiable ; `UNKNOWN` reste réservé à une information inconnue.

Cette décision est préférée à l'inférence « absence de cycle = continu », car une donnée incomplète ne doit pas devenir une règle métier. Elle évite aussi de réinterpréter en permanence l'égalité entre cycle de facturation et cycle de renouvellement.

### 2. Formaliser les invariants par mode

- `ROLLING` n'utilise ni `renewalInterval*`, ni `renewalPeriodStartDate`, ni `nextRenewalDate`, ni paramètres d'alerte de renouvellement. Une sauvegarde dans ce mode efface ces valeurs obsolètes.
- `AUTOMATIC` exige un cycle et une ancre de renouvellement contractuel afin que `nextRenewalDate` soit calculable.
- `MANUAL` représente un renouvellement contractuel piloté par l'utilisateur ; ses données de cycle et d'alerte restent pertinentes, mais le calcul automatique de date demeure conforme aux règles existantes.
- `UNKNOWN` ne déclenche aucun calcul de renouvellement.

Le stockage reste aplati dans `Subscription` pendant ce lot afin de limiter la migration et la surface de synchronisation. Les validations et un helper métier partagé portent les invariants.

### 3. Faire de la facturation la source de l'échéancier

Le calcul pur de projection part de `nextChargeDate`, du prix et du `billingInterval`. Il détermine ensuite l'horizon :

1. facturation annuelle : une occurrence ;
2. facturation non annuelle continue (`ROLLING`) : au maximum douze occurrences ;
3. facturation mensuelle avec renouvellement contractuel annuel : occurrences jusqu'à `nextRenewalDate` incluse, au maximum douze ;
4. compatibilité immédiate : un ancien abonnement `AUTOMATIC` mensuel dont facturation et renouvellement sont identiques ne prend pas `nextRenewalDate` comme borne et produit douze occurrences ;
5. dans tous les cas, `serviceEndDate` tronque la fenêtre, date incluse.

Un helper tel que `hasDistinctContractualRenewal(subscription)` centralise la décision de borne. La matérialisation continue de comparer l'état désiré avec l'existant : elle crée, met à jour ou supprime seulement les projections générées et ne touche jamais aux paiements réels, importés ou corrigés.

### 4. Remplacer l'initialisation implicite par un choix utilisateur

Le formulaire pose la question « Comment l'abonnement se poursuit-il ? » avec quatre choix. `ROLLING` masque les champs contractuels et les nettoie à la sauvegarde. `AUTOMATIC` et `MANUAL` affichent la section de renouvellement contractuel appropriée. Le passage à `AUTOMATIC` ne copie plus le cycle de facturation ; l'utilisateur choisit explicitement le cycle contractuel.

Les écrans de liste et de détail utilisent le libellé « Reconduction continue ». Une carte « Prochain renouvellement » n'est affichée que lorsqu'une échéance contractuelle distincte existe ; l'échéancier financier reste visible indépendamment.

### 5. Effectuer une migration Dexie conservatrice et idempotente

Une nouvelle version Dexie étend l'enum sans nouvelle table. Pendant l'upgrade, un abonnement est converti de `AUTOMATIC` vers `ROLLING` uniquement si toutes les conditions déterministes sont réunies : facturation non annuelle, intervalles de facturation et de renouvellement égaux, et `nextChargeDate === nextRenewalDate`. Les champs contractuels et alertes devenus incompatibles sont alors effacés.

Les enregistrements ambigus restent inchangés et sont signalés par le diagnostic afin d'être revus. Relancer la migration ou le moteur ne produit aucune écriture si l'état cible est déjà atteint. Les modifications locales suivent le flux de synchronisation habituel ; aucun effacement d'historique financier n'est réalisé.

### 6. Maintenir la compatibilité d'import/export

Les exports JSON et CSV émettent `ROLLING`. Les imports l'acceptent et valident ses invariants. Les anciennes valeurs restent acceptées ; la normalisation vers `ROLLING` n'est appliquée que lorsque les mêmes critères déterministes que la migration sont satisfaits. Un snapshot restauré reste local-first et ses mutations sont synchronisées par le mécanisme existant.

### 7. Documenter la règle à deux niveaux

Le guide utilisateur en français explique les quatre modes, les champs affichés et les horizons d'échéancier. Le guide développeur décrit en anglais simplifié le discriminant, les invariants, l'algorithme de borne, l'idempotence, la protection des paiements et la migration. Le schéma d'import est mis à jour avec `ROLLING`.

## Risks / Trade-offs

- **Mauvaise conversion d'un contrat réellement mensuel** : la migration exige simultanément égalité des intervalles et des dates et exclut la facturation annuelle ; les autres cas restent à vérifier.
- **Données contractuelles effacées lors du passage à `ROLLING`** : le formulaire avertit implicitement par le changement de section et le nettoyage est testé ; l'historique de paiement n'est jamais concerné.
- **Coexistence temporaire de données legacy** : le helper métier tolère les anciens cas mensuels identiques pour corriger immédiatement la projection avant leur migration complète.
- **Enum nouveau dans les intégrations** : import, export, filtres et affichages sont modifiés dans le même lot ; les valeurs inconnues sont rejetées avec un diagnostic explicite.
- **Modèle aplati moins expressif qu'une union discriminée** : accepté pour limiter le risque de migration ; une normalisation structurelle est reportée au second temps.

## Migration Plan

1. Ajouter `ROLLING` au type, aux libellés, validations et sérialisations.
2. Ajouter la migration Dexie idempotente et ses tests sur base existante.
3. Déployer le helper de continuation contractuelle et corriger les calculateurs avant d'exposer le nouveau formulaire.
4. Mettre à jour formulaire, liste, détail, diagnostic et imports/exports.
5. Exécuter au démarrage le moteur existant : il réconcilie les projections générées sans modifier les paiements protégés.
6. Vérifier les cas ambigus dans les logs de diagnostic et permettre leur correction manuelle.

En cas de rollback applicatif, les données `ROLLING` doivent d'abord être exportées ou converties explicitement : une ancienne version ne connaît pas cette valeur. Aucun rollback ne doit restaurer artificiellement les champs contractuels effacés.

## Open Questions

Aucune question bloquante. Les simplifications structurelles supplémentaires sont consignées dans le handoff racine et restent hors de ce changement.
