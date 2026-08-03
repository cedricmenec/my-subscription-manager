## MODIFIED Requirements

### Requirement: Gestion de la connexion Dexie Cloud dans la page Configuration

La page Configuration SHALL afficher l'URL Dexie Cloud locale active, inclure les contrôles d'authentification OTP et de déconnexion, et permettre un changement d'URL explicite et confirmé sans supprimer de données locales ou distantes.

#### Scenario: Connexion par OTP

- **WHEN** l'utilisateur saisit son email et clique "Se connecter (OTP)"
- **THEN** un code OTP est envoyé à l'adresse email pour la base active
- **AND** l'utilisateur est connecté après validation

#### Scenario: Déconnexion

- **WHEN** l'utilisateur clique "Se déconnecter"
- **THEN** la session Dexie Cloud est fermée

#### Scenario: Changement d'URL confirmé

- **WHEN** l'utilisateur saisit une URL valide différente et confirme l'avertissement
- **THEN** la nouvelle URL est enregistrée localement
- **AND** l'application est rechargée sur la base associée à cette URL
- **AND** l'ancienne base locale n'est pas purgée

#### Scenario: Changement d'URL annulé

- **WHEN** l'utilisateur annule la confirmation de changement
- **THEN** l'URL active reste inchangée
- **AND** aucun rechargement ni accès à une autre base n'a lieu

## ADDED Requirements

### Requirement: Écran initial de configuration Dexie Cloud

L'application SHALL présenter un écran bloquant en français lorsque l'URL Dexie Cloud locale est absente ou invalide. Le formulaire SHALL expliquer la reprise d'une installation existante, valider l'URL et ne demander aucun secret administratif.

#### Scenario: Configuration initiale valide

- **WHEN** l'utilisateur saisit une URL HTTPS Dexie Cloud valide et valide le formulaire
- **THEN** l'URL normalisée est enregistrée localement
- **AND** l'application se recharge puis initialise Dexie Cloud avec cette URL

#### Scenario: Configuration initiale invalide

- **WHEN** l'utilisateur saisit une URL vide, non HTTPS, avec credentials, query ou fragment, ou hors domaine Dexie Cloud
- **THEN** le formulaire affiche une erreur associée au champ
- **AND** aucune base synchronisée n'est initialisée

#### Scenario: Reprise d'une installation existante

- **WHEN** l'écran initial est affiché après la migration depuis une release utilisant `VITE_DEXIE_CLOUD_URL`
- **THEN** il demande de saisir exactement l'URL précédemment utilisée
- **AND** il indique qu'une URL différente sélectionnera une autre base locale sans supprimer l'ancienne
