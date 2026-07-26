## ADDED Requirements

### Requirement: Modèle abonnement v2 structuré

L'application SHALL persister un modèle `Subscription` couvrant au minimum `name`, `status`, `renewalMode`, `currentPrice`, `billingInterval`, `nextChargeDate`, `managementUrl`, `cancellationUrl`, `cancellationInstructions`, `notes` et les dates de cycle de vie utiles au lot, conformément à la section 13.2 et RG-DAT-006. Le modèle SHALL également porter des champs structurés séparant `billingInterval`, `commitmentInterval` et `renewalInterval` afin de représenter les cas de facturation et d'engagement distincts conformément à la section 7.2.

#### Scenario: Création avec dates civiles

- **WHEN** l'utilisateur crée un abonnement avec des dates contractuelles
- **THEN** les dates sont persistées au format civil `YYYY-MM-DD`
- **AND** aucune conversion implicite de fuseau n'est appliquée

#### Scenario: Abonnement avec engagement distinct de la facturation

- **WHEN** un abonnement est facturé mensuellement avec un engagement annuel
- **THEN** l'application peut persister séparément la fréquence de facturation et la durée d'engagement
- **AND** les calculs financiers peuvent s'appuyer sur ces champs sans ambiguïté

### Requirement: Statuts métier et renouvellement tri-état

L'application SHALL gérer les statuts `TRIAL`, `ACTIVE`, `PAUSED`, `CANCELLED_PENDING_END`, `ENDED`, `UNKNOWN` et le renouvellement `AUTOMATIC`, `MANUAL`, `UNKNOWN`, conformément à la section 8 et à la section 10.

#### Scenario: Changement de statut vers pause

- **WHEN** l'utilisateur passe un abonnement en statut `PAUSED`
- **THEN** le statut est enregistré localement immédiatement
- **AND** la fiche affiche explicitement l'information de pause et sa date de fin si renseignée

### Requirement: CRUD local-first des abonnements

L'application SHALL confirmer la réussite d'une création ou modification d'abonnement dès validation de la transaction locale Dexie, sans attendre la synchronisation distante, conformément à FUN-CRUD-001, FUN-CRUD-002 et TECH-LF-003.

#### Scenario: Modification hors connexion

- **WHEN** l'appareil est hors connexion et l'utilisateur modifie un abonnement
- **THEN** la modification est persistée localement
- **AND** l'interface indique que la synchronisation est en attente
- **AND** la donnée est toujours disponible après fermeture et réouverture

### Requirement: Liste d'abonnements filtrable et triable

L'application SHALL fournir une liste supportant au minimum recherche texte, filtre de statut, filtre de catégorie, filtre de mode de renouvellement et tri par prochaine échéance ou date de mise à jour, conformément à FUN-11.3.

#### Scenario: Filtrage des abonnements actifs

- **WHEN** l'utilisateur applique le filtre `ACTIVE`
- **THEN** la liste affiche uniquement les abonnements actifs non archivés
- **AND** le nombre d'éléments affichés est mis à jour sans rechargement manuel

### Requirement: Indicateur de complétude et vue à compléter

L'application SHALL calculer un indicateur de complétude basé sur les champs critiques (`name`, `status`, `price`, `currency`, `billingInterval`, `nextChargeDate`, `renewalMode`) et SHALL exposer une vue « À compléter », conformément à FUN-11.8.

#### Scenario: Abonnement incomplet

- **WHEN** un abonnement est enregistré sans prochaine échéance
- **THEN** il est marqué comme incomplet
- **AND** il apparaît dans la vue « À compléter »

### Requirement: Erreurs de synchronisation sans perte locale

Lorsqu'une synchronisation échoue après une écriture locale réussie, l'application SHALL signaler une erreur de synchronisation sans indiquer de perte locale, conformément à FUN-CRUD-004 et AC-009.

#### Scenario: Échec sync après enregistrement

- **WHEN** la synchronisation distante échoue après sauvegarde locale
- **THEN** l'interface affiche un état d'erreur de synchronisation
- **AND** l'abonnement reste consultable et modifiable localement

### Requirement: Sécurité des entrées utilisateur

Les champs texte libres de la fiche abonnement SHALL être rendus en texte non exécuté et validés côté frontend, et le changement MUST NOT introduire de secret frontend ni de fichier `dexie-cloud.key`, conformément à SEC-002, SEC-003 et SEC-005.

#### Scenario: Saisie d'un texte arbitraire

- **WHEN** l'utilisateur saisit un texte contenant des balises HTML dans les notes
- **THEN** l'interface affiche le contenu comme texte brut
- **AND** aucun script n'est exécuté
