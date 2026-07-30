## Why

La liste des abonnements expose seulement quelques champs et ouvre directement le dialogue d’édition, sans offrir de vue de consultation complète ni de mise en relief suffisante des prochaines échéances. La fiche détaillée demandée par la section 11.4 doit permettre d’identifier immédiatement le prochain paiement et, pour un renouvellement automatique, la prochaine date de renouvellement, tout en préservant l’historique financier conformément à RG-STA-005 et FUN-11.7.

## What Changes

- Ajouter une page dédiée de détail d’un abonnement, accessible par une URL contenant son identifiant.
- Donner la priorité visuelle au prochain paiement et au prochain renouvellement automatique.
- Afficher une liste chronologique courte des prochaines échéances de paiement.
- Organiser toutes les informations disponibles de l’abonnement en sections lisibles selon la section 11.4.
- Réutiliser le dialogue existant pour modifier l’abonnement depuis sa fiche.
- Ajouter un historique des paiements replié par défaut.
- Empêcher la rematérialisation des projections de supprimer ou remplacer les paiements déjà corrigés ou finalisés, conformément à RG-STA-005 et à la règle de conservation de FUN-11.7.
- Gérer explicitement les états de chargement, d’abonnement introuvable, d’absence d’échéance et de données de renouvellement insuffisantes.

Le changement appartient au lot d’interface de gestion des abonnements et au lot finances/paiements. Il n’ajoute ni backend, ni dépendance, ni migration de schéma Dexie.

Hors périmètre :

- modification directe d’un paiement depuis la fiche ;
- historique des modifications de l’abonnement ;
- graphiques financiers ;
- nouvelle logique de notification ou d’alerte externe ;
- affichage des abonnements archivés dans la liste active.

## Capabilities

### New Capabilities

- `subscription-detail`: Consultation détaillée d’un abonnement, mise en avant de ses échéances, affichage structuré de ses informations et ouverture de son édition.

### Modified Capabilities

- `subscription-list`: Ajout d’un accès explicite à la fiche détaillée depuis les modes compact et cartes.
- `finances-paiements`: Conservation des paiements corrigés ou finalisés lors de la rematérialisation des projections et consultation de l’historique par abonnement.

## Impact

- Navigation par hash et sélection de page dans `src/App.tsx`.
- Nouvelle page dans `src/pages/` et adaptations des listes d’abonnements.
- Réutilisation de `SubscriptionDialog` et des données réactives Dexie déjà chargées.
- Filtrage et classement des paiements par abonnement.
- Ajustement du service de matérialisation des paiements et de ses tests.
- Nouveaux styles et tests d’interface, sans nouvelle dépendance ni changement d’API externe.
