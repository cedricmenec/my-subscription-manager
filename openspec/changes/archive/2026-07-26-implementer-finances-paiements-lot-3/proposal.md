## Why

Le socle actuel couvre les abonnements, leur complétude et le mode local-first, mais il ne permet pas encore de représenter l'historique des paiements ni de calculer les indicateurs financiers attendus par le Lot 3. Ce changement est nécessaire maintenant pour débloquer les vues de trésorerie, préparer les futures alertes n8n sur les paiements échus et satisfaire les objectifs OBJ-MET-001, OBJ-MET-002, AC-010 et AC-016 de la spécification de référence.

## What Changes

- Ajouter une table synchronisée `payments` avec identifiants globaux, statuts `PROJECTED`, `ASSUMED_PAID`, `CONFIRMED_PAID`, `SKIPPED` et `REFUNDED`, conformément à la section 13.4 et à la stratégie de vérité des paiements de la section 9.3.
- Étendre le modèle `Subscription` pour séparer la périodicité de facturation et les intervalles d'engagement et de renouvellement, en cohérence avec la section 7.2, RG-DAT-001 et la section 13.2.
- Implémenter un moteur local de projection des échéances financières pour générer les paiements à venir, avec un premier périmètre limité aux cas déterministes nécessaires au MVP: mensuel, annuel, fin de mois, pause, fin de service et résiliation effective.
- Implémenter les calculs métier du Lot 3: coût mensuel équivalent, coût annuel équivalent, décaissements prévus à 30 et 90 jours, dépenses sur période selon les statuts de paiement, conformément à la section 9.2.
- Ajouter un service de correction manuelle des paiements persistés sans réécrire l'abonnement complet, afin de préserver l'historique conformément à RG-STA-005, RG-FX-001 et la section 16.5.
- Exposer une première interface locale pour consulter le résumé financier et la liste des paiements, tout en laissant hors périmètre les vues calendrier avancées, l'import/export et l'automatisation n8n.
- Documenter explicitement les améliorations repoussées: devises consolidées, promotions, essais, projection multi-devises, renouvellement contractuel distinct quand il diffère de la facturation et matérialisation plus large des paiements futurs.

## Capabilities

### New Capabilities
- `finances-paiements`: modèle, projection, calculs et interface minimale des paiements et indicateurs financiers du Lot 3.

### Modified Capabilities
- `abonnements-v2-coeur-metier`: enrichissement du modèle abonnement pour porter les intervalles de facturation, d'engagement et de renouvellement nécessaires aux calculs financiers.

## Impact

- Code affecté: schéma Dexie, services métier des abonnements, nouvelle couche de services financiers et paiements, interface React principale et tests unitaires/intégration.
- Données persistées: nouvelle version de schéma Dexie avec migration des abonnements existants et ajout d'une table synchronisée `payments`.
- Vérification: nouveaux tests sur les calculs financiers, la projection d'échéances, la persistance IndexedDB et la correction manuelle des paiements, plus vérification `lint`, `test` et `build`.
- Dépendances: aucune dépendance backend ni nouvelle brique distante; le changement reste conforme à l'architecture browser-only, Dexie.js et Dexie Cloud.