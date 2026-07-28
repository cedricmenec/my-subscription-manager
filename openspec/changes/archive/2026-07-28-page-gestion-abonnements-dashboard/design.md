## Context

L'application Abos est actuellement monolithique dans `App.tsx` (~1250 lignes) qui gère l'ensemble des vues (abonnements, paiements, résumé financier, formulaire) dans un seul composant. La navigation propose 3 onglets : Abonnements, Configuration, Données.

Le modèle de données et les services métier sont déjà matures (subscriptions, paiements, catégories, validation). Le besoin est de réorganiser l'interface utilisateur en pages spécialisées pour améliorer la maintenabilité et l'expérience utilisateur.

## Goals / Non-Goals

**Goals:**
- Créer un Dashboard d'accueil avec cockpit de pilotage (4 cartes financières, échéances à venir, alertes de complétude)
- Créer une page Abonnements dédiée avec deux modes d'affichage (compact type Excel, cartes modernes)
- Créer une page Paiements dédiée
- Implémenter une recherche avancée multi-critères (nom, date, catégorie, montant)
- Enrichir le tri (nom, montant, date création, etc.) avec tri mono-colonne asc/desc
- Ajouter un dialogue modal pour la création/édition d'abonnement structuré en sections
- Passer de 3 à 5 onglets de navigation
- Extraire les composants réutilisables dans `src/pages/` et `src/components/`

**Non-Goals:**
- Modification du modèle de données Dexie (aucune migration)
- Nouveaux services backend ou API
- Graphiques ou visualisations complexes dans le dashboard (texte et indicateurs uniquement)
- Mode multi-colonnes pour le tri

## Decisions

### D1 : Pages spécialisées plutôt que composants dans App.tsx
- **Choix** : Extraire chaque vue dans `src/pages/<Name>.tsx` avec ses propres responsabilités
- **Raison** : `App.tsx` est devenu trop gros (~1250 lignes). Chaque page peut gérer son propre état et ses sous-composants
- **Alternative** : Garder tout dans App.tsx avec des sections conditionnelles — rejeté pour maintenabilité

### D2 : Deux composants de liste distincts (compact / cartes)
- **Choix** : `SubscriptionCompactList.tsx` (tableau `<table>` sémantique) et `SubscriptionCardList.tsx` (grille de cartes)
- **Raison** : Les deux modes ont des structures DOM très différentes. Un seul composant avec des variantes de rendu serait complexe
- **Alternative** : Un composant avec `props.mode` — rejeté car le JSX conditionnel deviendrait illisible

### D3 : Dialogue modal natif `<dialog>`
- **Choix** : Utiliser l'élément HTML `<dialog>` avec `showModal()`, suivant le pattern existant de `DiagnosticDialog`
- **Raison** : Pas de dépendance externe, léger, accessible nativement, déjà utilisé dans le projet
- **Alternative** : Portail React avec overlay — plus flexible mais plus lourd et redondant avec le pattern existant

### D4 : Tri mono-colonne avec état local
- **Choix** : Chaque en-tête de colonne cliquable alterne `asc`/`desc` ; un seul champ de tri actif à la fois
- **Raison** : Simple, prévisible, suffisant pour le cas d'usage (gestion personnelle)
- **Alternative** : Tri multi-colonnes — complexité inutile pour ce besoin

### D5 : État de la vue (compact/cartes) persistant en local
- **Choix** : Stocker la préférence de mode d'affichage dans `localStorage`
- **Raison** : Pas besoin de synchronisation multi-appareil pour une préférence UI ; évite un round-trip Dexie
- **Alternative** : Stocker dans la table `settings` synchronisée — overkill pour une préférence d'affichage

### D6 : Recherche avancée en filtres locaux
- **Choix** : Les filtres avancés (nom, date min/max, catégorie, montant min/max) sont appliqués côté client sur les données déjà chargées
- **Raison** : Le volume de données est faible (quelques centaines d'abonnements max). Pas besoin de requêtes Dexie complexes
- **Alternative** : Requêtes Dexie avec indexes — plus performant pour de gros volumes, mais inutile ici

### D7 : Dashboard sans rechargement dédié
- **Choix** : Le dashboard réutilise les données déjà chargées par le routeur (subscriptions, summary, payments)
- **Raison** : Évite des appels redondants à Dexie ; le rafraîchissement est déclenché par les actions de l'utilisateur
- **Alternative** : Chargement indépendant par page — plus autonome mais duplique les appels

## Risks / Trade-offs

- **[Risque] Régression sur les filtres existants** → Les tests existants couvrent `listSubscriptions` avec les filtres ; les nouveaux composants utilisent la même fonction
- **[Risque] Perte de fonctionnalités lors de l'extraction** → Chaque page extraite est testée visuellement et fonctionnellement avant désactivation de l'ancienne vue
- **[Risque] Formulaire inline supprimé** → Le dialogue modal remplace le formulaire inline ; vérifier que tous les champs sont présents
- **[Trade-off] Mode compact = tableau HTML** → Moins flexible en responsive mais parfait pour un affichage dense d'information
- **[Trade-off] Pas de virtualisation** → La liste complète charge tous les abonnements en mémoire ; acceptable pour < 500 abonnements