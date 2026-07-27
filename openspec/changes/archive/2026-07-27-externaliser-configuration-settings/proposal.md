## Why

L'unique page de l'application (App.tsx) dépasse 1400 lignes et cumule des sections de natures différentes : la gestion courante des abonnements (liste, formulaire, paiements) côtoie la configuration (catégories, taux de conversion, connexion Dexie Cloud, actions local-first) et le diagnostic. Cette promiscuité rend la page principale chargée visuellement et complexifie la navigation quotidienne. En extrayant la configuration et le diagnostic dans des espaces dédiés, on obtient une application plus structurée et agréable à utiliser.

## What Changes

- **Nouvelle page "Configuration"** : externalise la gestion des catégories, des taux de conversion, de la connexion Dexie Cloud et des actions local-first (brouillon local, purge) dans une page dédiée.
- **Dialog de diagnostic** : remplace la section `<section class="diagnostics">` en bas de page par un dialogue modal accessible via une icône d'information dans la barre supérieure.
- **Barre supérieure enrichie** : ajout d'un bouton de navigation "Configuration" et d'une icône d'information pour ouvrir le diagnostic.
- **Navigation par hash** : mise en place d'un mécanisme de navigation basé sur `window.location.hash` pour permettre le deep linking (ex: N8N peut renvoyer vers un abonnement spécifique).
- **La page principale est allégée** : les sections "Taux de conversion", "Catégories" (dans le formulaire), "Connexion Dexie Cloud", "Local-first" et "Diagnostic" sont retirées d'App.tsx.
- **Aucun changement fonctionnel** : les comportements métier (création d'abonnement, filtres, paiements, synchro) restent identiques.

## Capabilities

### New Capabilities
- `settings-interface`: Page dédiée à la configuration de l'application (catégories, taux de conversion, connexion Dexie Cloud, actions local-first).
- `diagnostic-dialog`: Dialogue modal affichant les informations de diagnostic (version, base locale, identité, statut réseau, synchro Dexie Cloud, environnement).

### Modified Capabilities
- `socle-frontend-statique`: Le shell de l'application (topbar, navigation, routage) est modifié pour supporter la navigation par hash et la bascule entre pages.

## Impact

- `src/App.tsx` : refactorisation majeure — extraction de sections vers les nouvelles pages, ajout du state de navigation.
- `src/pages/SettingsPage.tsx` : nouveau fichier — page de configuration.
- `src/components/DiagnosticDialog.tsx` : nouveau fichier — dialogue modal.
- `src/components/TopBar.tsx` : nouveau fichier — barre supérieure avec navigation.
- `src/styles.css` : ajout des styles pour la page settings et le dialogue modal.
- `src/main.tsx` : inchangé (le routage est géré dans App.tsx).
- Pas de nouvelle dépendance npm (navigation par hash native, pas de react-router).