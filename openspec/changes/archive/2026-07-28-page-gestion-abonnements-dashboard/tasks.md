## 1. Fondations — Extension des types et services

- [x] 1.1 Étendre `SubscriptionSort` dans `subscriptions.ts` avec `name`, `currentPrice`, `createdAt`, `completion`
- [x] 1.2 Ajouter les filtres de recherche avancée dans `SubscriptionFilters` (dateMin, dateMax, amountMin, amountMax)
- [x] 1.3 Implémenter la logique de filtrage avancé dans `listSubscriptions` (plages de dates, plages de montant)
- [x] 1.4 Implémenter la logique de tri enrichi dans `listSubscriptions` (nom, montant, date création, complétude)

## 2. Composants de liste — Mode compact et mode cartes

- [x] 2.1 Créer `SubscriptionCompactList.tsx` : tableau HTML avec colonnes Nom, Statut, Prix, Cycle, Échéance, Catégorie, Actions
- [x] 2.2 Implémenter le tri par colonne (clic sur en-tête alterne asc/desc avec indicateur visuel ⬍/⬎)
- [x] 2.3 Créer `SubscriptionCardList.tsx` : grille de cartes modernes avec badge statut, prix, fréquence, échéance, actions
- [x] 2.4 Ajouter les indicateurs visuels (badge exclusion, indicateur conversion) dans les deux modes
- [x] 2.5 Implémenter le basculement compact/cartes avec persistance dans localStorage

## 3. Barre de recherche avancée

- [x] 3.1 Créer `AdvancedSearchBar.tsx` avec champs : nom, date min/max, catégorie, montant min/max
- [x] 3.2 Connecter les filtres avancés à l'état de la page Abonnements

## 4. Dialogue modal de création/édition

- [x] 4.1 Créer `SubscriptionDialog.tsx` avec `<dialog>` natif, structuré en sections (Général, Facturation, Dates, URLs, Notes)
- [x] 4.2 Extraire le formulaire existant dans le dialogue avec validation et soumission
- [x] 4.3 Implémenter l'accessibilité (piège de focus, aria-modal, aria-labelledby, fermeture Échap/arrière-plan)

## 5. Page Dashboard

- [x] 5.1 Créer `DashboardPage.tsx` avec les 4 cartes de résumé financier
- [x] 5.2 Ajouter la section "Prochaines échéances" (5 prochaines)
- [x] 5.3 Ajouter la section "Abonnements à compléter" avec scores
- [x] 5.4 Ajouter le panneau de statut synchronisation

## 6. Page Abonnements

- [x] 6.1 Créer `SubscriptionsPage.tsx` orchestrant la recherche avancée, le toggle de mode, la liste et le dialogue
- [x] 6.2 Intégrer le chargement des données (subscriptions, catégories, summary) depuis les services existants

## 7. Page Paiements

- [x] 7.1 Créer `PaymentsPage.tsx` reprenant la liste des paiements et leurs actions

## 8. Navigation et routage

- [x] 8.1 Mettre à jour `TopBar.tsx` avec 5 onglets : Dashboard, Abonnements, Paiements, Configuration, Données
- [x] 8.2 Mettre à jour `App.tsx` : routeur léger avec les 5 pages, hash routing mis à jour
- [x] 8.3 Définir le Dashboard comme page par défaut (hash `#/` ou racine)

## 9. Styles

- [x] 9.1 Ajouter les styles CSS pour le mode compact (tableau dense, en-têtes triables)
- [x] 9.2 Ajouter les styles CSS pour le mode cartes (grille, cartes, badges statut)
- [x] 9.3 Ajouter les styles CSS pour le dialogue modal structuré en sections
- [x] 9.4 Ajouter les styles CSS pour le dashboard (prochaines échéances, alertes)
- [x] 9.5 Ajouter les styles CSS pour la barre de recherche avancée

## 10. Tests et vérification

- [x] 10.1 Vérifier que `listSubscriptions` avec les nouveaux tris et filtres fonctionne correctement
- [x] 10.2 Exécuter `pnpm lint` avec succès
- [x] 10.3 Exécuter `pnpm test` avec succès
- [x] 10.4 Exécuter `pnpm build` avec succès