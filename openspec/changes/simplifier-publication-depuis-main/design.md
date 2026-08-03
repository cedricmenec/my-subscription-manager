## Context

Le dépôt utilise actuellement une branche de promotion `release`. Une fusion de `main` vers cette branche lance Release Please, qui ouvre ensuite une PR de release sur `release`. Cette chaîne produit deux PR pour une publication. La release `0.2.0` a déjà été créée sur cette branche avec un tag historique préfixé par le composant ; elle ne doit pas être modifiée.

## Goals / Non-Goals

**Goals:**

- Utiliser `main` comme unique branche de production.
- Conserver une décision humaine explicite avant chaque tag et déploiement.
- Préserver le point de départ versionné `0.2.0` avant de changer la branche ciblée.
- Documenter l'exploitation, y compris la suppression ultérieure de l'ancienne branche.

**Non-Goals:**

- Ne pas supprimer, déplacer ou renommer les tags et releases historiques.
- Ne pas déclencher un déploiement à chaque fusion applicative sur `main`.
- Ne pas modifier les contrôles de build, la configuration Dexie Cloud ou le mécanisme de rollback.

## Decisions

### `main` est la branche de publication

Le workflow écoute les pushes sur `main` et passe `target-branch: main` à Release Please. Chaque commit publiable crée ou met à jour une seule PR de release. Sa fusion relance le workflow, qui détecte la release créée, produit le tag et appelle le workflow Pages.

L'alternative consistant à lancer Release Please uniquement manuellement a été écartée : après fusion de sa PR, une seconde exécution manuelle serait nécessaire pour créer le tag et déployer. Une branche `release` reste utile pour une phase de stabilisation longue, plusieurs versions maintenues ou des validations distinctes ; ces besoins ne sont pas présents ici.

### La release `0.2.0` est intégrée avant le basculement

Le commit généré par Release Please sur `release` est fusionné dans `main`. Il met le manifest à `0.2.0`, synchronise `package.json` et ajoute le changelog. Le tag historique `my-subscription-manager-v0.2.0` reste inchangé ; la configuration déjà corrigée génère désormais les nouveaux tags canoniques `vMAJOR.MINOR.PATCH`.

### Documentation orientée GitHub Flow

Le guide développeur décrit une unique PR Release Please et demande de protéger `main`. Il explique également de supprimer `release` seulement après que cette configuration et l'état `0.2.0` ont été poussés et vérifiés sur GitHub.

## Risks / Trade-offs

- [Une fusion applicative peut ouvrir une PR de release plus tôt que souhaité] → la PR reste non déployée tant que le mainteneur ne la fusionne pas.
- [L'ancienne branche pourrait être utilisée par erreur] → la documentation indique sa suppression après migration et les workflows ne l'écoutent plus.
- [Le tag historique ne respecte pas le format canonique] → il est conservé comme trace immuable ; seuls les nouveaux tags sont validés et déployables par le workflow.

## Migration Plan

1. Fusionner dans `main` le commit de release `0.2.0` déjà généré.
2. Déployer le workflow qui cible `main` et la documentation mise à jour.
3. Vérifier que le prochain commit publiable ouvre une unique PR Release Please sur `main`.
4. Après vérification sur GitHub, supprimer la branche distante `release` et sa règle de protection si elle existe.
5. En cas d'incident avant la suppression, restaurer temporairement le déclencheur précédent depuis l'historique Git ; les tags et le déploiement manuel restent inchangés.

## Open Questions

_Aucune._
