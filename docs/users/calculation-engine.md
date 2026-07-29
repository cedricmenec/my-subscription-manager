# Calculs et mise à jour automatique

L'application recalculera désormais automatiquement les paiements projetés et les dates à venir dès que les données sous-jacentes changent.

## Ce qui change

- Les données dérivées sont maintenues à jour sans action manuelle.
- Les écrans de paiements et d'abonnements se rafraîchissent lorsque les données locales évoluent.
- Un dialogue de diagnostic permet de consulter l'historique du moteur de calcul et le graphe de dépendances.

## Renouvellement automatique

La date de prochain renouvellement (`nextRenewalDate`) est désormais calculée automatiquement par le moteur de calcul. Vous n'avez plus besoin de la renseigner manuellement.

### Les trois dates importantes

- **Date de souscription (`subscriptionDate`)** : date initiale de souscription au service. Renseignée à la création, elle est **lecture seule** en édition. Elle sert d'ancre de secours pour le calcul.

- **Début de période en cours (`renewalPeriodStartDate`)** : début de la période de renouvellement actuelle. Ce champ est **ajustable** manuellement — par exemple si votre fournisseur vous offre un mois gratuit, vous pouvez décaler cette date.

- **Prochain renouvellement (`nextRenewalDate`)** : calculé automatiquement à partir du début de période et du cycle de renouvellement. Ce champ est **lecture seule**.

### Comment ça fonctionne

1. Le moteur parcourt tous vos abonnements actifs
2. Pour chaque abonnement en renouvellement automatique, il ajoute cycliquement l'intervalle de renouvellement au début de période jusqu'à dépasser la date du jour
3. Si un abonnement est terminé (`ENDED`) ou résilié avec une date de fin dépassée, `nextRenewalDate` est automatiquement effacé
4. La date est mise à jour au démarrage de l'application, après chaque modification, et périodiquement (toutes les heures)
