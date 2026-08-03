## Purpose

Définir les garanties de versionnement, de préparation, de publication, de déploiement et de restauration des releases de l'application Abos.

## Requirements

### Requirement: Versionnement Semantic Versioning

Le système de publication SHALL attribuer à chaque release une version `MAJOR.MINOR.PATCH` conforme à Semantic Versioning et SHALL créer un tag Git immuable `vMAJOR.MINOR.PATCH` pointant sur le commit publié.

#### Scenario: Correctif compatible

- **WHEN** les changements publiables depuis la dernière release contiennent un commit `fix:` sans rupture
- **THEN** le système incrémente la composante PATCH
- **AND** il conserve MAJOR et MINOR

#### Scenario: Fonctionnalité compatible avant la version 1

- **WHEN** les changements publiables contiennent un commit `feat:` sans rupture et que MAJOR vaut `0`
- **THEN** le système incrémente la composante MINOR
- **AND** il remet PATCH à zéro

#### Scenario: Rupture avant la version 1

- **WHEN** un commit publiable contient `!` dans son type ou un footer `BREAKING CHANGE:` et que MAJOR vaut `0`
- **THEN** le système incrémente la composante MINOR conformément à la politique pre-major
- **AND** les notes de release signalent explicitement la rupture

#### Scenario: Tag déjà publié

- **WHEN** une correction est nécessaire après la publication d'un tag
- **THEN** le système crée une nouvelle version SemVer
- **AND** le tag existant n'est ni déplacé ni réutilisé

### Requirement: Préparation contrôlée d'une release

Le système SHALL analyser les Conventional Commits présents sur `main` et SHALL maintenir une unique PR de release contenant la prochaine version et le changelog, ciblant `main`. Un merge applicatif sur `main` MUST NOT déployer l'application avant la fusion explicite de cette PR.

#### Scenario: Changement publiable fusionné sur main

- **WHEN** des changements contenant au moins un Conventional Commit publiable sont fusionnés dans `main`
- **THEN** Release Please crée ou met à jour une unique PR de release ciblant `main`
- **AND** aucun déploiement Pages n'est effectué tant qu'aucune GitHub Release n'est créée

#### Scenario: Validation humaine de la publication

- **WHEN** la PR de release est relue et fusionnée dans `main`
- **THEN** le système met à jour la version et `CHANGELOG.md`
- **AND** il crée le tag et la GitHub Release correspondants
- **AND** il déclenche le déploiement Pages pour ce tag

#### Scenario: Commit sans impact de version

- **WHEN** seuls des commits sans impact SemVer tels que `docs:` ou `chore:` ont été ajoutés à `main`
- **THEN** le système ne publie pas automatiquement une nouvelle version

### Requirement: Déploiement traçable sur GitHub Pages

Le système SHALL déployer sur GitHub Pages uniquement un tag SemVer existant, après installation figée des dépendances, lint, tests et build réussis. Le répertoire statique `dist/` SHALL constituer l'unique artefact Pages, conformément à l'architecture statique et au lot 0.

#### Scenario: Release créée avec succès

- **WHEN** Release Please crée une GitHub Release
- **THEN** le pipeline checkout exactement le tag produit
- **AND** il exécute lint, tests et build
- **AND** il déploie `dist/` seulement si toutes les validations réussissent

#### Scenario: Validation en échec

- **WHEN** l'installation, le lint, les tests ou le build échoue
- **THEN** aucun nouvel artefact n'est déployé sur GitHub Pages
- **AND** la dernière release fonctionnelle reste servie

#### Scenario: Redéploiement manuel

- **WHEN** un mainteneur déclenche le workflow Pages avec un tag `vMAJOR.MINOR.PATCH` existant
- **THEN** le pipeline reconstruit et redéploie exactement ce tag
- **AND** il refuse une référence qui ne respecte pas le format de tag de release

### Requirement: Configuration et permissions de production sûres

Le build de production SHALL utiliser une URL Dexie Cloud fournie par la variable publique GitHub `VITE_DEXIE_CLOUD_URL`, SHALL refuser une valeur absente et MUST NOT intégrer de credential confidentiel, conformément à AC-019.

#### Scenario: Configuration publique présente

- **WHEN** `VITE_DEXIE_CLOUD_URL` est configurée et qu'une release est construite
- **THEN** Vite intègre cette URL publique au bundle
- **AND** l'environnement applicatif vaut `production`

#### Scenario: Configuration publique absente

- **WHEN** `VITE_DEXIE_CLOUD_URL` est vide ou absente
- **THEN** le pipeline échoue avant le build
- **AND** aucun déploiement n'est effectué

#### Scenario: Secrets exclus du frontend

- **WHEN** le pipeline construit une release
- **THEN** aucun secret Dexie Cloud machine, credential n8n ou fichier `dexie-cloud.key` n'est copié dans `dist/`

### Requirement: Documentation du processus de release

Le dépôt SHALL fournir un guide développeur décrivant la convention de commits, les incréments SemVer, la configuration GitHub, la publication depuis `main`, la vérification, le rollback et la migration depuis une ancienne branche `release`.

#### Scenario: Configuration ou migration

- **WHEN** un mainteneur configure les releases ou migre depuis une branche `release`
- **THEN** la documentation lui permet de protéger `main`, de conserver les tags existants et de supprimer `release` seulement après vérification du nouveau flux

#### Scenario: Publication courante

- **WHEN** un mainteneur veut publier une nouvelle version
- **THEN** la documentation lui fournit une checklist allant de la fusion des changements dans `main` à la fusion de l'unique PR Release Please et à la vérification de la version déployée

#### Scenario: Rollback

- **WHEN** une release déployée doit être retirée
- **THEN** la documentation explique comment redéployer un tag antérieur sans déplacer les tags
- **AND** elle avertit des limites liées aux migrations Dexie non rétrocompatibles
