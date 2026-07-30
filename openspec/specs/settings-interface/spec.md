## Purpose

Définir les garanties de la page de configuration dédiée de l'application Abos : gestion des catégories, des taux de conversion, de la connexion Dexie Cloud et des actions local-first.

## Requirements

### Requirement: Page de configuration dédiée

Le système SHALL fournir une page "Configuration" accessible depuis la barre de navigation, dédiée à la gestion des paramètres de l'application.

#### Scenario: Navigation vers la page Configuration

- **WHEN** l'utilisateur clique sur le bouton "Configuration" dans la barre supérieure
- **THEN** l'URL affiche `#/settings` dans la barre d'adresse
- **AND** la page Configuration est affichée, remplaçant la vue des abonnements
- **AND** un bouton ou lien "Retour aux abonnements" est visible

#### Scenario: Rechargement sur la page Configuration

- **WHEN** l'utilisateur charge l'URL `#/settings`
- **THEN** la page Configuration est affichée directement

### Requirement: Gestion des catégories dans la page Configuration

La page Configuration SHALL permettre de lister, créer et supprimer des catégories d'abonnement.

#### Scenario: Liste des catégories existantes

- **WHEN** l'utilisateur consulte la page Configuration
- **THEN** la liste des catégories existantes est affichée

#### Scenario: Création d'une catégorie

- **WHEN** l'utilisateur saisit un nom de catégorie et clique "Ajouter"
- **THEN** la catégorie est créée et apparaît dans la liste
- **AND** la nouvelle catégorie est disponible dans le sélecteur du formulaire d'abonnement

#### Scenario: Suppression d'une catégorie avec confirmation

- **WHEN** l'utilisateur clique "Supprimer" sur une catégorie
- **THEN** un dialogue de confirmation s'affiche avec le message "Supprimer la catégorie {nom} ?"
- **AND** le bouton "Accepter" est en variante danger (rouge)
- **WHEN** l'utilisateur confirme
- **THEN** la catégorie est supprimée
- **AND** les abonnements liés à cette catégorie ne sont pas supprimés (leur catégorie devient vide)

#### Scenario: Annulation de la suppression d'une catégorie

- **WHEN** l'utilisateur clique "Refuser" dans le dialogue de confirmation
- **THEN** la catégorie n'est pas supprimée

### Requirement: Gestion des taux de conversion dans la page Configuration

La page Configuration SHALL permettre de lister, ajouter et supprimer des taux de conversion entre devises étrangères et EUR.

#### Scenario: Liste des taux configurés

- **WHEN** l'utilisateur consulte la page Configuration
- **THEN** la liste des taux de conversion configurés est affichée (devise → EUR, taux)

#### Scenario: Ajout d'un taux de conversion

- **WHEN** l'utilisateur saisit un code devise à 3 lettres et un taux, puis clique "Ajouter"
- **THEN** le taux est validé (devise à 3 lettres, taux positif)
- **AND** le taux est sauvegardé et apparaît dans la liste
- **AND** les badges "💱 Converti" apparaissent sur les abonnements concernés

#### Scenario: Suppression d'un taux de conversion avec confirmation

- **WHEN** l'utilisateur clique "Supprimer" sur un taux
- **THEN** un dialogue de confirmation s'affiche avec le message "Supprimer le taux de conversion {currency} → EUR ?"
- **AND** le bouton "Accepter" est en variante danger (rouge)
- **WHEN** l'utilisateur confirme
- **THEN** le taux est supprimé
- **AND** les abonnements dans cette devise sont exclus des totaux consolidés

#### Scenario: Annulation de la suppression d'un taux de conversion

- **WHEN** l'utilisateur clique "Refuser" dans le dialogue de confirmation
- **THEN** le taux de conversion n'est pas supprimé

### Requirement: Gestion de la connexion Dexie Cloud dans la page Configuration

La page Configuration SHALL inclure les contrôles de connexion Dexie Cloud (authentification par OTP, déconnexion).

#### Scenario: Connexion par OTP

- **WHEN** l'utilisateur saisit son email et clique "Se connecter (OTP)"
- **THEN** un code OTP est envoyé à l'adresse email
- **AND** l'utilisateur est connecté après validation

#### Scenario: Déconnexion

- **WHEN** l'utilisateur clique "Se déconnecter"
- **THEN** la session Dexie Cloud est fermée

### Requirement: Actions local-first dans la page Configuration

La page Configuration SHALL inclure les actions de gestion des données locales (enregistrement d'un brouillon, purge des données).

#### Scenario: Enregistrement d'un brouillon local

- **WHEN** l'utilisateur clique "Enregistrer un brouillon local"
- **THEN** un brouillon des données locales est sauvegardé dans IndexedDB

#### Scenario: Purge des données locales

- **WHEN** l'utilisateur clique "Purger les données locales"
- **THEN** les données locales sont effacées
- **AND** l'utilisateur doit confirmer l'action avant suppression