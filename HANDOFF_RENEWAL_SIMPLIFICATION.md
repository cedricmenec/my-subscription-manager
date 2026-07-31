# Handoff — simplification ultérieure du modèle de renouvellement

Ce fichier conserve les évolutions proposées pour un second temps. Elles ne font pas partie du changement OpenSpec `simplifier-renouvellement-et-echeanciers`, qui introduit d'abord `ROLLING`, corrige les horizons de projection et stabilise les usages actuels.

## 1. Remplacer l'ancre de période par une date contractuelle pilotée

Évaluer la dépréciation puis la suppression de `renewalPeriodStartDate`. Pour les contrats à date fixe, `nextRenewalDate` pourrait devenir le pointeur contractuel éditable et persistant, avancé explicitement lors d'un renouvellement au lieu d'être recalculé indéfiniment depuis une ancienne ancre.

Condition préalable : confirmer les besoins de correction manuelle, de traçabilité des renouvellements et de synchronisation concurrente. Prévoir une migration réversible et des tests de fin de mois.

## 2. Clarifier `startDate` et `subscriptionDate`

Auditer les usages réels des deux champs, leurs différences métier et leurs valeurs historiques. S'ils représentent finalement la même date, préparer une fusion documentée ; sinon, les renommer avec des libellés non ambigus (par exemple début de service vs souscription contractuelle).

Condition préalable : inventorier imports, calculs, affichages et données existantes afin d'éviter une perte de sens.

## 3. Normaliser le modèle de continuation

Après adoption de `ROLLING` et nettoyage des données legacy, envisager une union discriminée au lieu des champs aplatis, par exemple une continuation continue ou un renouvellement contractuel portant ses propres cycle, date et alerte. Cela rendrait les états invalides non représentables en TypeScript.

Condition préalable : mesurer le coût Dexie/Dexie Cloud, définir la compatibilité snapshot/CSV et supprimer d'abord les chemins temporaires de compatibilité mensuel/mensuel.

## 4. Retirer les compatibilités legacy

Une fois toutes les bases migrées et les cas ambigus corrigés, retirer le fallback qui interprète encore un ancien couple facturation mensuelle / renouvellement mensuel identique comme continu. Ajouter auparavant un diagnostic ou un rapport permettant de confirmer qu'aucun abonnement concerné ne subsiste.

## 5. Évaluer une séparation physique prévu/réel

Ne créer des entités ou tables distinctes `PlannedOccurrence` et `ActualOccurrence` que si le produit doit analyser les écarts entre prévision, paiement réel, annulation et ajustement. La protection actuelle des paiements réels suffit au besoin immédiat et évite une migration lourde.

Condition préalable : définir les cas d'usage de rapprochement, la source de vérité, les règles de promotion d'une projection en réel et l'impact de synchronisation.

## Reprise recommandée

Créer un nouveau changement OpenSpec après stabilisation du changement courant. Commencer par l'audit des champs de dates et des cas ambigus, puis traiter le pointeur contractuel et la normalisation du modèle avant toute séparation physique des échéances.
