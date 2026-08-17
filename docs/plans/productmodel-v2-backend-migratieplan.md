# Implementatieplan — backend en datamigratie productmodel v2

## Slice B1 — Schema additief

- Voeg `product_composition` toe en maak concrete v2-productrecords mogelijk.
- Migreer `product_macro_profile.product_id` naar `product_composition_id` als PK/FK.
- Verplaats packagevelden naar v2-product: package type, unit content, image, barcode, archive.
- Migreer portion naar `product_portion` met enkelvoud/meervoud.
- Voeg package type enkelvoud/meervoud toe en backfill bestaande namen gecontroleerd.
- Houd v1-tabellen tijdelijk intact.

## Slice B2 — Audit/backfill

- Maak een dry-runrapport per oude root met packagecount, macroprofiel en statuses.
- Laat handmatige splitsmapping toe voor afwijkende samenstellingen.
- Backfill één composition per bevestigde samenstelling en één product UUID per oude package.
- Maak mappingtabel of migratietabel `legacy_product_package_map`.
- Controleer unieke combinaties, barcodes en archiefprojectie.

## Slice B3 — Catalogusservices en repositories

- Introduceer composition- en concrete-productrepositories.
- Vervang packageprojecties door concrete productprojecties.
- Centraliseer `displayName` en package summary.
- Voeg composition autocomplete, create/update, macro-update en concrete product CRUD/archive toe.
- Blokkeer incompatibele nutrition-reference-basiswijzigingen met gebruikte receptingrediënten.

## Slice B4 — Consumerreferenties

- Migreer `product_consumption.product_package_id` naar `product_id`.
- Migreer `dish_ingredient.product_package_id` naar `product_id`.
- Pas unified search, nutrition summary, dish service en log repositories aan.
- Behoud live product/macroberekening; maak geen snapshots.

## Slice B5 — Receptendomein

- Voeg `dish.visibility`, `dish.archived_at` en `dish_version.instructions` toe; verwijder afbeelding uit MVP-contracten zonder historische file cleanup te forceren.
- Autoriseer publieke reads, owner private reads en owner writes.
- Maak archive/restore idempotent en neutraliseer private not-found.
- Laat oude logs gepinde versies behouden en actuele macro's gebruiken.

## Slice B6 — Fysieke voorraad

- Maak inventory-item één fysieke productverpakking met `remaining_amount_base`.
- Migreer oude quantity N naar N rijen met nieuwe UUID's.
- Migreer mutation/auditcontracten naar amount-gebaseerde mutaties.
- Voeg productdrempel en verloopprojectie toe.
- Groepeer alleen in readprojecties, nooit in opslag.

## Slice B7 — Opruimen

- Verwijder package-routes en oude repositories pas na consumer-cutover en één releasecyclus.
- Drop legacy mapping en v1-tabellen in een aparte destructieve migratie.
- Verwijder tijdelijke aliases en dead contracttypes.

## Tests

- migratiecounts, rollback en idempotente rerun;
- root/package archive matrix;
- macro live-correcties door logs en stats;
- public/private/archive receptauth;
- physical inventory expansion en contentconstraints;
- composition/product duplicateconstraints;
- geen orphans na iedere migratiefase.
