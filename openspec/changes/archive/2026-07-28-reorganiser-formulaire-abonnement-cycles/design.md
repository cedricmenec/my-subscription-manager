## Context

Le formulaire de création/édition d'abonnement (`SubscriptionDialog.tsx`) utilise actuellement deux sections — "Facturation" et "Dates" — qui mélangent des concepts métier distincts (cycle de facturation, engagement, renouvellement) sans distinction claire. L'interface utilisateur souffre d'un bug où le champ "Début de service" est lié à `serviceEndDate` au lieu de `startDate`. Par ailleurs, le modèle `Subscription` ne possède pas de champ `nextRenewalDate`, pourtant nécessaire au futur système d'alerting.

Les sections du formulaire doivent être réorganisées selon une logique fonctionnelle : Cycle de facturation, Renouvellement, Engagement, Pause, Fin de service. Chaque section doit être conditionnelle (affichée seulement si pertinente) et proposer des interactions adaptées (presets, calculs automatiques, surcharge).

## Goals / Non-Goals

**Goals:**
- Réorganiser le formulaire en sections : Cycle facturation, Renouvellement, Engagement, Pause, Fin de service
- Ajouter les champs `nextRenewalDate`, `renewalStartDate`, `commitmentStartDate`, `pauseStartDate` au modèle
- Implémenter le sélecteur de cycle avec 4 presets (Hebdo, Mensuel, Annuel, Personnalisé)
- Rendre les sections Renouvellement, Engagement, Pause conditionnelles
- Afficher les calculs informatifs (date fin engagement, date prochain renouvellement)
- Corriger le bug `startDate` / `serviceEndDate`
- Migration de schéma Dexie v3

**Non-Goals:**
- Modification du modèle de paiement ou de catégorie
- Refonte du dashboard ou de la liste
- Système d'alerting (hors périmètre)
- Modification du comportement de synchronisation Dexie Cloud

## Decisions

### D1 — Presets de cycle avec déduction automatique

Les cycles standards (1 WEEK → "Hebdo", 1 MONTH → "Mensuel", 1 YEAR → "Annuel") sont reconnus automatiquement à l'ouverture du formulaire. Si la combinaison count+unit ne correspond à aucun preset, le sélecteur passe en mode "Personnalisé" avec les champs quantité/unité visibles. Un texte récapitulatif est affiché en permanence (ex: "Toutes les 2 semaines", "Tous les 6 mois").

**Alternatives considérées :** ne stocker que le preset — rejeté car on perd la flexibilité des cycles non-standard.

### D2 — Renouvellement : copie par défaut du cycle de facturation

À l'activation du renouvellement automatique, les champs quantité/unité du renouvellement sont initialisés avec les valeurs du cycle de facturation. L'utilisateur peut les surcharger. Aucun indicateur visuel de "dérivation" n'est affiché (simplicité d'usage).

**Stockage :** les champs `renewalIntervalCount` et `renewalIntervalUnit` existent déjà dans le modèle. Ils conservent leur valeur même si elle est identique au cycle de facturation — pas de logique de "null = héritage" car cela compliquerait les requêtes et l'alerting.

### D3 — Calcul automatique de `nextRenewalDate`

La date de prochain renouvellement est calculée ainsi :

```
si renewalStartDate est renseigné :
  nextRenewalDate = renewalStartDate + renewalInterval
  tant que nextRenewalDate < aujourd'hui :
    nextRenewalDate += renewalInterval
sinon :
  nextRenewalDate = saisi manuellement par l'utilisateur
```

Le calcul est effectué côté client au moment de la soumission du formulaire. Le résultat est stocké en base pour être utilisé par le futur système d'alerting.

### D4 — Engagement : logique conditionnelle

Un bouton radio "Avec engagement" / "Sans engagement" contrôle l'affichage des champs. Par défaut : "Sans engagement".

Quand "Avec engagement" est sélectionné :
- Durée d'engagement (quantité + unité) — réutilise `commitmentIntervalCount` / `commitmentIntervalUnit` existants
- Date de début d'engagement — nouveau champ `commitmentStartDate`, initialisé à `startDate`
- Date de fin d'engagement — calculée et affichée de manière informative (non modifiable)

### D5 — Pause : déclencheur indépendant

Un bouton "Mettre en pause" dans la section Pause change le statut de l'abonnement en `PAUSED` et affiche les champs :
- Début de pause — nouveau champ `pauseStartDate`, par défaut la date du jour
- Fin de pause — champ existant `pauseUntil`

La section Pause n'est visible que si le statut est `PAUSED` ou si l'utilisateur clique sur "Mettre en pause".

### D6 — Correction du bug `startDate` / `serviceEndDate`

Le champ `SubscriptionFormState` ne contient actuellement pas `startDate`. Le label "Début de service" est incorrectement lié à `serviceEndDate`. Correction :
- Ajouter `startDate` dans `SubscriptionFormState`
- Mapper `subscription.startDate` dans `toFormState()`
- Ajouter `startDate` dans le payload de soumission
- Modifier le JSX pour lier "Début de service" à `startDate`
- "Fin de service" reste lié à `serviceEndDate`

### D7 — Texte récapitulatif du cycle

Un helper `describeInterval(count, unit): string` génère un texte lisible :
- 1 WEEK → "Toutes les semaines"
- 2 WEEK → "Toutes les 2 semaines"
- 1 MONTH → "Tous les mois"
- 3 MONTH → "Tous les 3 mois"
- 1 YEAR → "Tous les ans"
- 2 YEAR → "Tous les 2 ans"

## Risques / Trade-offs

- **[Risque] Migration Dexie v3** : les utilisateurs existants avec des données locales verront leur base migrée. Les nouveaux champs seront `undefined` pour les abonnements existants. → Atténué : ce sont des champs optionnels, l'application gère les valeurs manquantes.
- **[Risque] Cohérence `nextRenewalDate`** : si l'utilisateur modifie le cycle ou la date de début après avoir saisi `nextRenewalDate`, la valeur stockée peut devenir obsolète. → Atténué : le formulaire recalcule à chaque soumission si `renewalStartDate` est présent.
- **[Risque] Complexité du formulaire** : l'ajout de sections conditionnelles peut allonger le temps de chargement visuel. → Atténué : React ne rend que les sections pertinentes, la structure DOM reste légère.