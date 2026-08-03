## Context

Abos construit actuellement `SubscriptionDatabase` au chargement des modules et lui transmet une URL issue de `import.meta.env.VITE_DEXIE_CLOUD_URL`. Vite remplace cette valeur au build : une release Pages est donc liée à une base distante unique. Le navigateur possède déjà une base IndexedDB suffixée par l'identifiant Dexie Cloud et une session OTP protégée par `dexie-cloud-addon`.

La migration ne doit ni réécrire le schéma Dexie, ni copier les données, ni supprimer la base locale ou distante. Dexie Cloud ajoute par défaut l'identifiant de l'URL distante au nom IndexedDB : configurer la même URL réouvre la même base ; une URL différente sélectionne une base locale distincte. La configuration doit intervenir avant le premier accès à l'instance Dexie.

Le flux reste local-first : les données métier résident dans IndexedDB, la synchronisation est effectuée directement entre le navigateur et l'URL choisie, et l'authentification OTP ne nécessite aucun backend Abos. La limite de confiance est l'origine du site : l'URL locale et la session Dexie sont accessibles uniquement au profil navigateur de cette origine ; `dexie-cloud.key` reste une clé d'administration CLI hors navigateur.

## Goals / Non-Goals

**Goals:**

- produire un bundle GitHub Pages identique pour toutes les bases Dexie Cloud ;
- exiger une URL valide avant de charger les modules qui construisent la base ;
- préserver la base existante quand la même URL est saisie ;
- rendre un changement d'URL explicite, réversible et non destructif ;
- conserver `requireAuth: true` et le parcours OTP actuel ;
- couvrir le bootstrap, la validation, le changement d'URL, la non-suppression et l'absence d'URL dans le build ;
- mettre à jour un guide développeur en anglais simplifié et un guide utilisateur en français.

**Non-Goals:**

- fournir un mode local sans Dexie Cloud ;
- créer ou administrer une base Dexie Cloud depuis Abos ;
- déplacer automatiquement les données d'une base distante vers une autre ;
- intégrer une authentification personnalisée ou un backend ;
- récupérer ou embarquer `dexie-cloud.key` ;
- supprimer les anciennes bases IndexedDB après un changement d'URL.

## Decisions

### Stocker l'URL dans `localStorage` avant le bootstrap

Une petite couche `cloudConfiguration` normalise, valide, lit et écrit l'URL sous une clé versionnée propre à Abos. `localStorage` est retenu car sa lecture est synchrone avant l'import dynamique de l'application. La table Dexie `localSettings` est rejetée : elle appartient à la base dont l'URL est justement nécessaire pour l'ouvrir. L'URL n'étant pas un secret, aucun chiffrement trompeur n'est ajouté.

La validation accepte uniquement une URL HTTPS sans identifiants, paramètres ni fragment, dont l'hôte est `dexie.cloud` ou un sous-domaine direct. La valeur est normalisée sans slash terminal. Une extension future pourra traiter explicitement les serveurs Dexie Cloud auto-hébergés.

### Séparer le bootstrap du chargement applicatif

Le point d'entrée ne charge plus statiquement `App` ni le singleton `db`. Il affiche d'abord l'écran obligatoire si aucune URL valide n'est stockée. Après enregistrement, la page est rechargée ; le bootstrap importe alors dynamiquement l'application et la base. Ainsi, aucune base de fallback n'est créée et aucune requête Dexie n'est placée avant `db.cloud.configure()`, conformément à TECH-LF-004.

L'alternative d'exporter un `db` nullable a été rejetée : elle propagerait un état optionnel dans tous les services métier. Une URL de build transitoire a aussi été rejetée car elle maintiendrait la dépendance que le changement doit supprimer.

### Préserver les données par sélection, pas par migration

Le schéma Dexie et le nom logique `subscription-manager-db` restent inchangés. Avec le suffixe Dexie Cloud par défaut, la même URL sélectionne le même IndexedDB et retrouve sa session et ses données. La configuration initiale demande explicitement l'URL déjà utilisée et recommande un snapshot préalable.

Changer l'URL enregistre la nouvelle valeur puis recharge l'application. L'ancienne IndexedDB n'est ni supprimée ni modifiée. Reconfigurer l'ancienne URL permet de la retrouver. Aucun appel à `db.delete()` n'est lié au changement de configuration.

### Fournir deux écrans cohérents

Un composant de formulaire partagé sert à l'écran initial obligatoire et à la section Dexie Cloud de la page Configuration. Le changement depuis la page Configuration exige une confirmation présentant l'URL actuelle et avertissant qu'une autre base locale sera sélectionnée. Les erreurs sont associées au champ et annoncées de manière accessible.

### Retirer l'URL du pipeline

Le workflow Pages ne lit plus `vars.VITE_DEXIE_CLOUD_URL` et ne la valide plus. `.env.example` conserve seulement la version et l'environnement. Une vérification automatisée s'assure que le build ne contient ni URL de base imposée, ni `dexie-cloud.json`, ni `dexie-cloud.key`.

## Risks / Trade-offs

- [L'utilisateur saisit une URL différente de l'installation existante] → Dexie sélectionne une base locale distincte sans toucher à l'ancienne ; l'interface explique comment revenir à l'URL précédente.
- [L'URL locale est effacée par le navigateur] → l'écran initial réapparaît ; saisir la même URL retrouve la base IndexedDB existante.
- [Une URL syntaxiquement valide ne correspond pas à une base accessible] → l'authentification/synchronisation affiche l'erreur Dexie ; la page Configuration permet de corriger l'URL sans purge.
- [Un script exécuté sur la même origine lit l'URL] → l'URL n'est pas un credential ; les secrets administratifs restent absents et la session demeure protégée par Dexie Cloud.
- [Le changement de point d'entrée affecte les tests] → isoler la logique de configuration pure et tester séparément le bootstrap et l'application existante.

## Migration Plan

1. Avant publication, créer un snapshot applicatif et conserver l'URL Dexie Cloud actuellement utilisée.
2. Publier l'artefact sans `VITE_DEXIE_CLOUD_URL` ; aucune opération n'est envoyée à Dexie Cloud pendant le build.
3. Au premier chargement de la nouvelle version, saisir exactement l'URL conservée.
4. Vérifier l'identité connectée, le nom de la base locale, les volumes de données et l'état de synchronisation avant toute modification métier.
5. En cas d'URL erronée, utiliser la page Configuration pour remettre l'URL précédente ; l'ancienne IndexedDB n'a pas été supprimée.
6. En cas de régression applicative, redéployer le tag précédent et restaurer le snapshot uniquement si les contrôles montrent une perte réelle.

Il n'y a aucune nouvelle version de schéma IndexedDB et aucune migration de données persistées dans ce changement.

## Open Questions

_Aucune pour l'implémentation retenue._
