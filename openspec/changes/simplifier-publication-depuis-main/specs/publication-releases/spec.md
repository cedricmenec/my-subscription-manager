## MODIFIED Requirements

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
