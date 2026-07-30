## Why

Les échéances prévisionnelles sont aujourd’hui produites par deux mécanismes concurrents : des paiements `PROJECTED` synchronisés limités à 90 jours et une liste locale de dates non consommée par l’interface. Cette duplication, ainsi que la recréation globale des projections dès qu’une valeur change, limite la visibilité annuelle et génère du trafic Dexie Cloud inutile, alors que RG-DAT-001 à RG-DAT-006, RG-STA-003, RG-PAU-001, RG-CAN-002 et AC-016 imposent une projection déterministe, locale-first et respectueuse de l’historique.

Ce changement constitue le lot « échéanciers prévisionnels adaptatifs ». Il consolide la génération autour d’une seule source de vérité financière et rend explicites les conventions calendaires et d’idempotence.

## What Changes

- Introduire un calcul RF-01 générique retournant la première occurrence supérieure ou égale à une date de référence, à partir d’une ancre, d’un intervalle et d’une politique calendaire documentée.
- Calculer chaque occurrence depuis l’ancre afin d’éviter les dérives de fin de mois après un mois court.
- Remplacer l’horizon fixe de 90 jours par une politique adaptative : une échéance pour une facturation annuelle, échéances jusqu’au renouvellement dans la limite de douze mois, ou horizon glissant de douze mois sans borne de renouvellement.
- Conserver `payments` comme source synchronisée unique des échéances financières et retirer la matérialisation locale redondante `projected-charge-dates`.
- Réconcilier différentiellement les paiements `GENERATED/PROJECTED` : aucune écriture si le résultat est identique, mises à jour ciblées, créations et suppressions minimales, avec identifiants déterministes.
- Ne jamais modifier ni supprimer une échéance corrigée, finalisée, manuelle ou importée ; ne pas recréer de projection à une date déjà occupée par une échéance réelle.
- Afficher sur la fiche abonnement toutes les échéances matérialisées de l’horizon adaptatif, soit jusqu’à douze échéances pour le cas mensuel standard.
- Conserver les déclenchements existants au démarrage, après mutation, périodiquement et manuellement, avec observabilité du résultat.

Non-objectifs :

- créer une table séparée `ActualOccurrence` ou conserver simultanément la valeur prévue initiale et la valeur réellement constatée ;
- ajouter un backend applicatif ou un ordonnanceur autre que les mécanismes existants et n8n ;
- gérer les promotions, essais ou tarifs variables non déterministes ;
- transformer `overdue` en statut persisté : une projection passée reste un état dérivé « À vérifier ».

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `projected-charge-dates`: formaliser RF-01, les politiques calendaires et l’horizon adaptatif, sans matérialisation locale redondante.
- `calculation-engine`: remplacer la double projection par une orchestration unique et une réconciliation différentielle idempotente.
- `finances-paiements`: préciser l’identité stable et la protection des échéances réelles pendant la rematérialisation.
- `subscription-detail`: afficher l’échéancier futur complet produit par la politique adaptative.
- `next-renewal-date-calculator`: documenter la convention inclusive et le calcul ancré sans dérive calendaire.

## Impact

- Calculs de dates civiles dans `src/services/civilDate.ts`.
- Projection et réconciliation dans `src/services/finance.ts`, `src/services/payments.ts` et `src/services/calculationEngine.ts`.
- Types et migration Dexie uniquement si une donnée persistée supplémentaire s’avère nécessaire ; aucun nouveau stockage métier n’est prévu.
- Fiche abonnement et documentation utilisateur.
- Tests unitaires du calendrier, de l’horizon, de la réconciliation, de la protection de l’historique et de l’affichage.
- La table synchronisée `payments` reste compatible ; les identifiants générés continuent de respecter le préfixe Dexie Cloud `pym`.
