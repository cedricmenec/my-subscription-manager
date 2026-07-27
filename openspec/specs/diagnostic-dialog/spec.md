## Purpose

Définir les garanties du dialogue modal de diagnostic de l'application Abos : affichage des informations techniques (version, base, identité, statut réseau, synchronisation, environnement) dans un dialogue accessible.

## Requirements

### Requirement: Dialogue modal de diagnostic

Le système SHALL afficher les informations de diagnostic dans un dialogue modal accessible depuis une icône dans la barre supérieure.

#### Scenario: Ouverture du dialogue de diagnostic

- **WHEN** l'utilisateur clique sur l'icône d'information dans la barre supérieure
- **THEN** un dialogue modal s'ouvre au centre de l'écran
- **AND** le fond de la page est masqué par un overlay semi-transparent
- **AND** le focus est déplacé à l'intérieur du dialogue

#### Scenario: Fermeture du dialogue par le bouton de fermeture

- **WHEN** l'utilisateur clique sur le bouton "Fermer" ou l'icône de croix
- **THEN** le dialogue se ferme
- **AND** le focus retourne à l'icône qui a ouvert le dialogue

#### Scenario: Fermeture par la touche Échap

- **WHEN** le dialogue est ouvert et l'utilisateur appuie sur Échap
- **THEN** le dialogue se ferme

#### Scenario: Fermeture par clic sur l'overlay

- **WHEN** le dialogue est ouvert et l'utilisateur clique sur l'overlay (fond grisé)
- **THEN** le dialogue se ferme

### Requirement: Contenu du dialogue de diagnostic

Le dialogue de diagnostic SHALL afficher les mêmes informations que la section actuelle : version applicative, base locale, identité connectée, statut réseau, statut Dexie Cloud, dernière synchronisation, environnement.

#### Scenario: Affichage des informations de diagnostic

- **WHEN** le dialogue de diagnostic est ouvert
- **THEN** les informations suivantes sont affichées :
  - Version applicative : `VITE_APP_VERSION` ou "0.0.0-dev"
  - Base locale : `DEFAULT_DB_NAME`
  - Identité connectée : email ou userId ou "Non connecté"
  - Statut réseau : "En ligne" ou "Hors ligne"
  - Statut Dexie Cloud : label de synchronisation
  - Dernière synchronisation : timestamp ISO
  - Environnement : `VITE_APP_ENVIRONMENT` ou "development"

### Requirement: Accessibilité du dialogue

Le dialogue de diagnostic SHALL être accessible au clavier et aux lecteurs d'écran.

#### Scenario: Navigation au clavier dans le dialogue

- **WHEN** le dialogue est ouvert
- **THEN** le focus est piégé à l'intérieur du dialogue (Tab ne sort pas du dialogue)
- **AND** le rôle ARIA `dialog` est présent
- **AND** l'attribut `aria-modal="true"` est présent
- **AND** l'attribut `aria-labelledby` référence le titre du dialogue