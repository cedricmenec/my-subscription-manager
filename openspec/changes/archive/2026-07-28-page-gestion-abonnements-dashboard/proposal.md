## Why

L'application Abos gère aujourd'hui l'ensemble des abonnements, paiements et résumé financier dans une seule page monolithique (`App.tsx` ~1250 lignes). Cette approche devient difficile à maintenir et n'offre pas une expérience utilisateur adaptée aux différents besoins : pilotage rapide (dashboard), gestion fine des abonnements (liste + recherche), et suivi des paiements. Cette refonte en pages spécialisées améliore la maintenabilité, la navigation et l'ergonomie.

## What Changes

- **Nouveau Dashboard** : page d'accueil avec cockpit de pilotage (4 cartes financières, échéances à venir, alertes de complétude)
- **Page Abonnements dédiée** : extraite du monolithe, avec deux modes d'affichage (compact type Excel et cartes modernes), recherche avancée multi-critères, tri enrichi, et dialogue modal pour la création/édition
- **Page Paiements dédiée** : extraite du monolithe dans son propre onglet
- **Navigation enrichie** : passage de 3 à 5 onglets (Dashboard, Abonnements, Paiements, Configuration, Données)
- **Architecture composants** : extraction des composants réutilisables dans `src/pages/` et `src/components/`
- **`App.tsx` allégé** : devient un routeur léger déléguant aux pages spécialisées

## Capabilities

### New Capabilities
- `subscription-list`: Liste des abonnements avec deux modes d'affichage (compact type Excel triable par colonne, cartes modernes aérées), recherche avancée multi-critères (nom, date, catégorie, montant), tri enrichi (nom, montant, date création, prochaine échéance, complétude)
- `subscription-dialog`: Dialogue modal de création et d'édition d'abonnement, structuré en sections (Général, Facturation, Dates, URLs, Notes), réutilisable depuis la liste et le dashboard
- `dashboard-cockpit`: Page d'accueil avec tableau de bord affichant le résumé financier (4 cartes), les prochaines échéances et les alertes de complétude
- `payments-page`: Page dédiée aux paiements reprenant la liste existante avec ses actions

### Modified Capabilities
- `socle-frontend-statique`: La navigation passe de 3 à 5 onglets ; `App.tsx` devient un routeur léger
- `abonnements-v2-coeur-metier`: Extension du type `SubscriptionSort` pour supporter le tri par nom, montant et date de création ; ajout de filtres de recherche avancée

## Impact

- **`src/App.tsx`** : refonte majeure, passe de ~1250 lignes à un routeur léger
- **`src/components/TopBar.tsx`** : ajout de 2 onglets (Dashboard, Paiements)
- **Nouveaux fichiers** : `src/pages/DashboardPage.tsx`, `src/pages/SubscriptionsPage.tsx`, `src/pages/PaymentsPage.tsx`, `src/components/SubscriptionCompactList.tsx`, `src/components/SubscriptionCardList.tsx`, `src/components/SubscriptionDialog.tsx`, `src/components/AdvancedSearchBar.tsx`
- **`src/services/subscriptions.ts`** : extension de `SubscriptionSort` et des filtres
- **`src/styles.css`** : nouveaux styles pour les modes compact/cartes, le dialogue modal, le dashboard
- Aucune modification du modèle de données Dexie