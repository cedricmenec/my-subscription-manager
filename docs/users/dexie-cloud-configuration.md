# Configurer votre base Dexie Cloud

Abos est une application individuelle. Le site publié sur GitHub Pages ne contient aucune adresse de base de données : vous configurez votre propre base dans chaque navigateur.

## Avant la première configuration

Si vous utilisiez déjà Abos avec Dexie Cloud :

1. Ouvrez la page **Données** dans l'ancienne version.
2. Créez et conservez un snapshot complet.
3. Notez exactement l'URL Dexie Cloud actuellement utilisée, par exemple `https://identifiant.dexie.cloud`.
4. Ne supprimez ni les données locales du navigateur ni la base distante.

L'URL n'est pas un mot de passe. Ne saisissez jamais dans Abos le contenu de `dexie-cloud.key`, un secret client ou un jeton administratif.

## Configurer Abos

Au premier chargement, Abos affiche **Connecter votre base Dexie Cloud** avant d'ouvrir la base locale.

1. Saisissez votre URL HTTPS se terminant par `.dexie.cloud`.
2. Si vous aviez déjà une installation, utilisez exactement la même URL.
3. Cliquez sur **Enregistrer et ouvrir Abos**.
4. Saisissez votre adresse e-mail dans la page Configuration.
5. Cliquez sur **Se connecter (OTP)** et suivez le message reçu par e-mail.

L'URL est enregistrée uniquement dans le stockage local de ce navigateur. Il faut donc la configurer de nouveau dans un autre navigateur, un autre profil ou un autre appareil.

## Vérifier la reprise de votre base existante

Après avoir configuré l'ancienne URL :

1. Vérifiez l'identité connectée dans la barre supérieure ou le diagnostic.
2. Vérifiez que vos abonnements, catégories et paiements sont présents.
3. Ouvrez le diagnostic et contrôlez le nom de la base locale et l'état Dexie Cloud.
4. Attendez la fin de la synchronisation avant d'effectuer des changements importants.

Abos ne modifie pas le schéma et ne copie pas les données pendant cette configuration. La même URL permet à Dexie Cloud de retrouver l'IndexedDB existante.

## Changer de base Dexie Cloud

Dans **Configuration > Connexion Dexie Cloud** :

1. Vérifiez l'URL active affichée.
2. Saisissez la nouvelle URL dans **Changer de base Dexie Cloud**.
3. Cliquez sur **Changer de base**.
4. Lisez l'avertissement puis confirmez avec **Changer et recharger**.

Une URL différente sélectionne une base locale distincte. L'ancienne base locale et la base distante ne sont pas supprimées.

## Retrouver l'ancienne base

Si vous avez saisi une mauvaise URL ou souhaitez revenir à la précédente :

1. Ouvrez **Configuration**.
2. Saisissez l'ancienne URL exacte.
3. Confirmez le changement et le rechargement.
4. Reconnectez-vous par OTP si Dexie Cloud le demande.

Si le stockage local de configuration a été effacé, l'écran initial réapparaît. Saisissez la même URL : tant que les données du site n'ont pas été purgées dans le navigateur, l'ancienne IndexedDB reste disponible.

## Préparer une nouvelle base

La base doit exister avant sa configuration dans Abos. Son propriétaire doit aussi autoriser l'origine du site GitHub Pages avec les outils Dexie Cloud. La création, l'administration, les sauvegardes serveur et le fichier `dexie-cloud.key` restent hors de l'application.
