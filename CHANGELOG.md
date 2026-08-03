# Changelog

## [0.2.0](https://github.com/cedricmenec/my-subscription-manager/compare/my-subscription-manager-v0.1.0...my-subscription-manager-v0.2.0) (2026-08-03)


### ⚠ BREAKING CHANGES

* **model:** suppression des champs renewalIntervalUnit, renewalIntervalCount, renewalPeriodStartDate et du mode MANUAL.

### Features

* add calculation engine ([4fa7c38](https://github.com/cedricmenec/my-subscription-manager/commit/4fa7c38f5e4b823235f6c85374a32d0e35e752f2))
* add dexie and fake-indexeddb dependencies, and create pnpm workspace configuration ([e58eb8e](https://github.com/cedricmenec/my-subscription-manager/commit/e58eb8ef6ffca4790b201b824fa3c36027cc798e))
* ajouter la fiche detaillee des abonnements ([6ed3bad](https://github.com/cedricmenec/my-subscription-manager/commit/6ed3bad6b70d68d30c6a89ab1c6eaebdaa917a56))
* améliorer les échéanciers prévisionnels ([dcca67f](https://github.com/cedricmenec/my-subscription-manager/commit/dcca67f3978f55221b55f6ad03fa021936bb5806))
* calcul automatique prochain renouvellement + sync specs + archive ([6bcb2c6](https://github.com/cedricmenec/my-subscription-manager/commit/6bcb2c65e65c808f05150d5ef34e17b31136c192))
* **diagnostic:** améliorer la visibilité des logs next-renewal-date et ajouter la relance manuelle ([7a1fd70](https://github.com/cedricmenec/my-subscription-manager/commit/7a1fd700c0f303a4ce61041461274f88d7034dd8))
* **dialog:** ajouter bouton Sauvegarder sans fermeture et indicateur horodate ([cc97910](https://github.com/cedricmenec/my-subscription-manager/commit/cc97910df31d885f583f8cd1cd5c54295b7b3987))
* **engine:** corriger calculs renouvellement, ajouter logs skip et calculateur échéances projetées ([44f6465](https://github.com/cedricmenec/my-subscription-manager/commit/44f646502863a1a85ac67baab99a6e10b0f14be5))
* externaliser configuration et diagnostic dans des pages dédiées ([2530c05](https://github.com/cedricmenec/my-subscription-manager/commit/2530c0598a9b784ab22cd81795a3a4dc25bb90db))
* implémenter abonnements v2 local-first et archiver le changement OpenSpec ([cb52a69](https://github.com/cedricmenec/my-subscription-manager/commit/cb52a6943015f43f07e201b528f98d07093fc8cc))
* implementer import/export lot 4 - snapshot JSON, import/export CSV, page /data ([1863d51](https://github.com/cedricmenec/my-subscription-manager/commit/1863d511ab514c215b5d84f9a3e384f9ef854cb7))
* initialiser le socle frontend ([d297335](https://github.com/cedricmenec/my-subscription-manager/commit/d297335901df615e89869d167998760741e54d58))
* **local-first:** initialiser le socle Dexie et Dexie Cloud ([570ed8f](https://github.com/cedricmenec/my-subscription-manager/commit/570ed8f72acf8fd6751c7452fb72ff801bd4a13d))
* **model:** unifier engagement et renouvellement, supprimer MANUAL ([2f04b86](https://github.com/cedricmenec/my-subscription-manager/commit/2f04b861ed81ce4221d130472831579937344da9))
* page gestion abonnements avec dashboard, modes compact/cartes, dialogue modal et navigation 5 onglets ([04bbd7f](https://github.com/cedricmenec/my-subscription-manager/commit/04bbd7f4b2bab06db5ab32094deabc13414eb73e))
* phase 2 - suppression des champs legacy currentPriceMinor et amountMinor ([5e9c362](https://github.com/cedricmenec/my-subscription-manager/commit/5e9c36260725c38cbab2699356c2c1b99a8468aa))
* prix en unités de devise (phase 1) ([dc888df](https://github.com/cedricmenec/my-subscription-manager/commit/dc888df464faa28ac06af55314e8b2a0c0267f26))
* **release:** automatiser SemVer et le déploiement GitHub Pages ([dbba5cb](https://github.com/cedricmenec/my-subscription-manager/commit/dbba5cb41376f26ce9dce89848a3255bf670bf79))
* simplifier le renouvellement et les échéanciers ([62eb19d](https://github.com/cedricmenec/my-subscription-manager/commit/62eb19d4a345a75c46826648757bffbcafc519c3))
* **subscription-form:** réorganiser le formulaire en sections fonctionnelles et ajouter les champs cycle/renouvellement ([5215152](https://github.com/cedricmenec/my-subscription-manager/commit/521515220bc9d2477cb5f73f52b8a10354f3f929))
* **taux-de-conversion:** configuration statique des taux de change (USD→EUR) ([317695f](https://github.com/cedricmenec/my-subscription-manager/commit/317695f50942b9b1f945bee53bd24011268f6d40))
* **ui:** ajouter un dialogue de confirmation avant toute action destructrice ([3c6c87c](https://github.com/cedricmenec/my-subscription-manager/commit/3c6c87c4d4a49733136772c5bbcd03c08f56f8ed))
* **ui:** rendre nextRenewalDate visible dans les listes, cartes et filtres ([2f369f1](https://github.com/cedricmenec/my-subscription-manager/commit/2f369f1f29450971328ec4bf73d5217234d98f0b))


### Bug Fixes

* brancher les filtres de recherche et ajouter un debounce sur la recherche textuelle ([c401be1](https://github.com/cedricmenec/my-subscription-manager/commit/c401be197fe624889bcc689a6c161375397449fe))
* **calc-engine:** purge orphan projections, add recalculate button & execution history ([913978d](https://github.com/cedricmenec/my-subscription-manager/commit/913978d6338c1e6c1b8fc05fdff06dd815d3bec6))
* **dexie-cloud:** corriger les préfixes d'ID pour la compatibilité [@id](https://github.com/id) ([0c83b68](https://github.com/cedricmenec/my-subscription-manager/commit/0c83b6875ad7074999dc4d4c59ffc3b9cf56b00f))
* **diagnostic:** fix layout so recalculate button and calc history are visible in dialog ([6fb4671](https://github.com/cedricmenec/my-subscription-manager/commit/6fb4671443ddc799972ada67ba70dd5c364f1ba9))
* **dialog:** synchroniser localForm avec formState quand le parent change d'abonnement ([13e9555](https://github.com/cedricmenec/my-subscription-manager/commit/13e95555052912d49594a9d51db143e91a365861))
* **engine:** fallback cycle facturation + auto-calcul nextChargeDate ([a2ce63d](https://github.com/cedricmenec/my-subscription-manager/commit/a2ce63d54be7f532eaf36cdc03912527ce52d0ed))
* **persistence:** corriger la persistance des taux de conversion et les erreurs de materialisation ([ce08364](https://github.com/cedricmenec/my-subscription-manager/commit/ce083649a3bf09ebecc399c8601f0c7242086bcf))
* **subscription:** rendre subscriptionDate modifiable pour débloquer le calcul du renouvellement ([8064d54](https://github.com/cedricmenec/my-subscription-manager/commit/8064d5493414a651ad8f17c65f597627635e6d13))
* **taux-de-conversion:** corriger la conversion des paiements USD dans les projections ([7c3f998](https://github.com/cedricmenec/my-subscription-manager/commit/7c3f998435818495a7f3f9b8b0af0739c8e481fe))
