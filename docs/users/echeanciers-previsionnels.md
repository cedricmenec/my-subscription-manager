# Comprendre les échéanciers prévisionnels

L’échéancier prévisionnel présente les paiements que l’application prévoit pour un abonnement. Il permet de voir le prochain paiement et plusieurs échéances futures sans les confondre avec les paiements réellement constatés.

## Ce qu’il faut renseigner

L’application peut construire un échéancier lorsque l’abonnement possède au minimum :

- un prix et une devise ;
- une prochaine date de facturation ;
- une fréquence de facturation, par exemple tous les mois ou tous les ans.

Un abonnement terminé ne produit plus de nouvelle échéance. Si un abonnement est en pause, une date de reprise doit être connue pour que l’application sache quand reprendre les prévisions.

## Combien d’échéances sont préparées ?

La règle dépend du rythme de facturation :

| Facturation | Échéancier préparé |
|---|---|
| Mensuelle en reconduction continue | Douze mensualités |
| Mensuelle avec contrat annuel | Jusqu’au renouvellement annuel inclus, au maximum douze mensualités |
| Tous les deux mois | Jusqu’à douze occurrences |
| Annuelle | Uniquement la prochaine échéance |
| Journalière ou hebdomadaire | Au maximum douze occurrences |

La fiche d’un abonnement affiche au maximum les douze premières échéances, classées de la plus proche à la plus lointaine.

## Quand l’échéancier s’arrête-t-il ?

L’application ne projette pas aveuglément douze mois. L’échéancier peut s’arrêter plus tôt :

- à la prochaine date de renouvellement contractuel distincte ;
- à la date de fin du service ;
- pendant une pause, jusqu’à la date de reprise.

Une échéance prévue exactement le jour du renouvellement ou de la fin du service reste incluse.

### Exemple mensuel

Pour une prochaine facturation au 15 août et aucun renouvellement connu, l’application prépare normalement :

```text
15 août, 15 septembre, 15 octobre, ... jusqu’au 15 juillet suivant
```

Une reconduction continue n'a pas de date contractuelle et conserve donc ses douze mensualités. Si un contrat annuel payé mensuellement est renouvelé le 15 décembre, l’échéancier s’arrête au 15 décembre inclus.

## Comment sont gérés les mois courts ?

L’application conserve le jour habituel de facturation autant que possible.

Pour une facturation ancrée au 30 janvier :

```text
30 janvier → 28 février → 30 mars
```

Le passage par février ne transforme donc pas l’abonnement en facturation de fin de mois.

Lorsqu’un abonnement est réellement facturé en fin de mois, cette règle est conservée :

```text
31 janvier → 28 février → 31 mars
```

## Prévision et paiement réel

Une ligne marquée **Prévu** est encore modifiable par le prochain recalcul. En revanche, l’application ne remplace jamais une échéance qui a été :

- supposée payée ;
- confirmée comme payée ;
- ignorée parce qu’aucun prélèvement n’a eu lieu ;
- remboursée ;
- corrigée manuellement ;
- saisie manuellement, importée ou créée par une automatisation.

Si une échéance réelle ou corrigée existe déjà à une date, aucune seconde prévision n’est créée pour le même jour.

Une échéance prévue dont la date est passée apparaît dans la zone **À vérifier**. Elle n’est pas automatiquement considérée comme un paiement confirmé.

## Quand le recalcul est-il effectué ?

L’échéancier est recalculé :

- au démarrage de l’application ;
- après une modification de l’abonnement qui change les prévisions ;
- après réception d’une modification synchronisée depuis un autre appareil ;
- lors des vérifications périodiques de l’application ;
- lorsque vous lancez manuellement un recalcul depuis le diagnostic.

Un recalcul sans changement ne recrée pas les mêmes lignes. L’application met uniquement à jour les échéances qui ont réellement changé, ce qui limite les synchronisations inutiles.

## Utilisation hors connexion

Le calcul est effectué localement sur votre appareil. Les échéances restent donc consultables hors connexion après avoir été calculées ou synchronisées une première fois.

Lorsque la connexion revient, Dexie Cloud synchronise les changements entre vos appareils. L’enregistrement local n’attend pas la fin de cette synchronisation.

## Si aucune échéance n’apparaît

Vérifiez les points suivants dans la fiche de l’abonnement :

1. le prix et la devise sont renseignés ;
2. la prochaine date de facturation est valide ;
3. la fréquence de facturation est définie ;
4. l’abonnement n’est pas terminé ou archivé ;
5. en cas de pause, la date de reprise est connue ;
6. en cas de résiliation en cours, la date de fin du service est renseignée.

Vous pouvez ensuite utiliser l’action de recalcul dans la page de diagnostic.
