## Context

L'application "Abos" est actuellement une SPA avec une seule page (`App.tsx` ~1400 lignes) qui cumule :
- La gestion des abonnements (liste, formulaire, paiements, filtres)
- La configuration (catégories, taux de conversion, connexion Dexie Cloud, actions local-first)
- Le diagnostic (version, base, identité, statut réseau, synchro)

L'objectif est d'extraire la configuration et le diagnostic dans des espaces dédiés, tout en conservant les URLs bookmarkables (deep linking) pour les workflows externes comme N8N.

## Goals / Non-Goals

**Goals:**
- Alléger `App.tsx` en extrayant la configuration dans une page dédiée
- Remplacer la section diagnostic statique par un dialogue modal
- Permettre le deep linking via hash (`#/settings`, `#/subscriptions/abc123`)
- Garder une navigation fluide sans perte de contexte
- Aucune régression fonctionnelle sur les fonctionnalités existantes

**Non-Goals:**
- Pas de react-router ou autre bibliothèque de routage externe
- Pas de changement dans le modèle de données
- Pas de modification des services métier
- Pas de changement de comportement des abonnements, paiements ou synchro

## Decisions

### D1 : Navigation par hash (window.location.hash)

**Choix** : Utiliser `window.location.hash` et un `useEffect` pour synchroniser l'état de navigation, sans bibliothèque externe.

**Pourquoi** :
- Permet les URLs bookmarkables (`#/subscriptions/abc123`) — N8N peut envoyer un lien direct vers un abonnement
- Ne nécessite aucune configuration serveur (fonctionne avec un `dist` statique)
- Évite d'ajouter ~7KB de react-router-dom pour un besoin simple (2 pages + 1 modal)
- Compatible PWA offline

**Rejeté** : Navigation par state React uniquement — impossible de faire du deep linking externe.
**Rejeté** : react-router-dom en mode BrowserRouter — nécessite un serveur pour le fallback 404.

### D2 : Modal de diagnostic (Dialog)

**Choix** : Créer un composant `DiagnosticDialog` utilisant une `<dialog>` HTML native, contrôlé par un state React.

**Pourquoi** :
- La balise `<dialog>` est native, accessible (focus trap, rôle ARIA) et sans dépendance
- Overlay modal avec gestion native du clavier (Escape pour fermer)
- Léger, pas de bibliothèque externe

**Rejeté** : Portail React + div overlay — plus de code à maintenir, moins accessible.

### D3 : Extraction du TopBar

**Choix** : Extraire la barre supérieure dans un composant `TopBar` qui reçoit les props de navigation (`currentPage`, `onNavigate`, `onOpenDiagnostic`).

**Pourquoi** :
- `App.tsx` n'a plus à gérer le rendu du header
- Le TopBar peut évoluer indépendamment (ajout d'icônes, menu)
- Réutilisable si d'autres pages sont ajoutées

### D4 : Architecture de la page Settings

**Choix** : `SettingsPage` gère son propre état local pour les catégories et les taux de conversion, mais partage les données via des callbacks de remontée (props) pour que `App.tsx` reste source de vérité.

**Pourquoi** :
- Les catégories sont utilisées dans le formulaire d'abonnement (page subscriptions)
- Les taux de conversion sont utilisés dans les badges et le résumé financier
- Éviter la duplication d'état ou un contexte global

### D5 : Deep linking vers un abonnement

**Choix** : Le hash routeur supporte `#/subscriptions/<id>` pour ouvrir directement le formulaire d'édition d'un abonnement.

**Pourquoi** :
- N8N peut générer un lien `https://app/#/subscriptions/abc123` dans une alerte
- L'utilisateur arrive sur la page d'abonnements avec le formulaire pré-rempli

## Risques / Trade-offs

- **[Risque] Perte du hash au rechargement** → Mitigation : `useEffect` lit `window.location.hash` au mount et réagit à `hashchange` pour naviguer.
- **[Risque] Régressions de tests** → Mitigation : les tests existants (`App.test.tsx`) doivent être mis à jour pour refléter la nouvelle structure, mais les comportements métier testés via les services restent inchangés.
- **[Risque] Casse CSS** → Mitigation : les classes CSS existantes sont conservées, les nouvelles pages utilisent leur propre espace de noms (`settings-*`, `dialog-*`).
- **[Trade-off] Pas de react-router** → Perte des fonctionnalités avancées (route guards, lazy loading, nested routes). Acceptable pour une application à 2 pages.