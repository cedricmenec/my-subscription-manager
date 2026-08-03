## Why

Le modèle actuel impose une PR de promotion de `main` vers `release`, puis une seconde PR maintenue par Release Please. Ce doublon ralentit la publication sans apporter de garantie supplémentaire pour un projet disposant d'une seule ligne de production.

## What Changes

- Déclencher Release Please sur chaque push vers `main` et cibler sa PR de release sur cette même branche.
- Conserver la validation humaine : seule la fusion explicite de l'unique PR Release Please crée le tag, la GitHub Release et le déploiement Pages.
- Rapatrier sur `main` la version `0.2.0` et son changelog déjà générés sur l'ancienne branche de release.
- Mettre à jour le guide développeur, la protection de branche et les procédures de restauration pour supprimer la dépendance à `release`.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `publication-releases`: la branche source des changements publiables et la procédure documentée passent de `release` à `main`.

## Impact

Les fichiers affectés sont le workflow Release Please, le manifest et les fichiers de version générés, la spécification de publication et le guide `docs/developers/releases-and-github-pages.md`. Aucun changement du frontend, des données persistées ou de la configuration Dexie Cloud n'est requis.
