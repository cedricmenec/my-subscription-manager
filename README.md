# Abos

Abos est une application web personnelle pour centraliser ses abonnements, suivre leurs coûts et anticiper les prochaines échéances. Elle s’adresse aux personnes qui veulent retrouver au même endroit les informations de facturation, de renouvellement et de résiliation de leurs services récurrents.

L’application adopte une approche local-first : les données restent disponibles dans le navigateur et peuvent être synchronisées entre appareils avec votre propre base Dexie Cloud.

## Fonctionnalités principales

- gestion des abonnements, catégories, tarifs, cycles de facturation et renouvellements ;
- tableau de bord financier avec coûts mensuels et annuels, dépenses et prochaines échéances ;
- génération d’échéanciers prévisionnels et suivi de l’état des paiements ;
- recherche, filtrage et consultation détaillée des abonnements ;
- import et export des données en JSON ou CSV ;
- synchronisation Dexie Cloud, fonctionnement hors connexion et diagnostic local.

## Démarrage rapide

### Prérequis

- Node.js 22 ou version ultérieure ;
- pnpm 11.4.0 ;
- une base Dexie Cloud existante et son URL HTTPS se terminant par `.dexie.cloud`.

### Lancer l’application

1. Clonez le dépôt et placez-vous dans son répertoire :

   ```bash
   git clone https://github.com/cedricmenec/my-subscription-manager.git
   cd my-subscription-manager
   ```

2. Installez les dépendances verrouillées :

   ```bash
   pnpm install --frozen-lockfile
   ```

3. Démarrez le serveur de développement :

   ```bash
   pnpm dev
   ```

4. Ouvrez l’adresse locale indiquée par Vite. L’écran **Connecter votre base Dexie Cloud** doit apparaître au premier lancement.
5. Saisissez l’URL de votre base, puis connectez-vous par e-mail et code OTP depuis la page **Paramètres**.

L’URL de la base est enregistrée dans le stockage local du navigateur. Aucun fichier `dexie-cloud.key`, secret client ou jeton administratif ne doit être saisi dans l’application. Consultez [le guide de configuration Dexie Cloud](docs/users/dexie-cloud-configuration.md) pour préparer une nouvelle base ou reprendre une installation existante.

## Commandes utiles

| Commande | Usage |
|---|---|
| `pnpm dev` | Démarrer le serveur de développement Vite |
| `pnpm test` | Exécuter les tests avec Vitest |
| `pnpm test:watch` | Relancer les tests à chaque modification |
| `pnpm lint` | Analyser le code avec ESLint |
| `pnpm build` | Vérifier TypeScript et produire les fichiers statiques dans `dist/` |

## Socle technique

Abos est une application React et TypeScript construite avec Vite. Les données sont stockées dans IndexedDB avec Dexie et synchronisées au moyen de Dexie Cloud. Les calculs d’échéances s’exécutent localement et alimentent la même collection de paiements que les opérations importées ou saisies manuellement.

## Contribuer

Le projet n’est pas encore suffisamment mature pour accueillir des contributions externes dans de bonnes conditions. Les modalités de contribution seront publiées dès que le processus sera prêt. Merci de votre intérêt et de votre compréhension.

## Pour aller plus loin

- [Comprendre les échéanciers prévisionnels](docs/users/echeanciers-previsionnels.md)
- [Consulter la fiche détaillée d’un abonnement](docs/users/subscription-detail.md)
- [Schéma d’import et d’export](docs/import-schema.md)
- [Fonctionnement du moteur de calcul](docs/developers/calculation-engine.md)
- [Processus de release et déploiement GitHub Pages](docs/developers/releases-and-github-pages.md)
