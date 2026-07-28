## Why

Le formulaire actuel de création/édition d'abonnement mélange dans une même section "Facturation" des concepts distincts (cycle de facturation, engagement, renouvellement), et la section "Dates" ne suit pas une logique métier claire. Cela rend la saisie confuse et source d'erreurs. Par ailleurs, le modèle ne permet pas de stocker la date de prochain renouvellement, nécessaire au futur système d'alerting. Enfin, un bug fait que le champ "Début de service" est lié à la variable `serviceEndDate` au lieu de `startDate`.

## What Changes

- **Réorganisation complète du formulaire** : remplacer les sections "Facturation" et "Dates" par des sections fonctionnelles : Cycle de facturation, Renouvellement, Engagement, Pause, Fin de service.
- **Cycle de facturation** : 4 presets (Hebdo, Mensuel, Annuel, Personnalisé) avec affichage récapitulatif. Prix + Devise. Prochaine échéance. Début de service (`startDate`).
- **Renouvellement** : conditionnel (visible si renouvellement automatique). Cycle de renouvellement copié par défaut du cycle de facturation mais surchargeable. Date de début de période de renouvellement + date calculée de prochain renouvellement.
- **Engagement** : conditionnel (visible si "Avec engagement"). Durée + début d'engagement + date de fin calculée affichée de manière informative.
- **Pause** : conditionnelle (visible si l'abonnement est en pause). Bouton "Mettre en pause" qui affiche la durée de pause et les dates.
- **Fin de service** : affichée si renseignée, sinon message "Pas de fin de service programmée".
- **Ajout des champs** : `nextRenewalDate`, `renewalStartDate`, `commitmentStartDate`, `pauseStartDate` au modèle de données.
- **Correction du bug** : le champ "Début de service" pointe vers `startDate` et non plus `serviceEndDate`.
- **Migration de schéma Dexie** : nouvelle version avec indexation des nouveaux champs.

## Capabilities

### New Capabilities

- _Aucune nouvelle capability. La modification porte sur le dialogue existant._

### Modified Capabilities

- `subscription-dialog`: Réorganisation du formulaire en sections fonctionnelles (Cycle facturation, Renouvellement, Engagement, Pause, Fin de service) avec comportements conditionnels.
- `abonnements-v2-coeur-metier`: Ajout des champs `nextRenewalDate`, `renewalStartDate`, `commitmentStartDate`, `pauseStartDate` au modèle `Subscription`.

## Impact

- `src/data/db.ts` : ajout de 4 nouveaux champs sur `Subscription`, migration de schéma Dexie v3
- `src/components/SubscriptionDialog.tsx` : refonte complète des sections du formulaire, logique conditionnelle d'affichage
- `src/services/subscriptions.ts` : mise à jour des fonctions de création/mise à jour pour inclure les nouveaux champs
- `src/services/subscriptionValidation.ts` : mise à jour des validations pour les nouveaux champs