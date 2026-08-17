# Masterplan — productsamenstellingen, concrete producten en Recepten-app

## Doel

Dit plan coördineert de catalogusrevamp en de extractie van receptbeheer uit de Calorie Tracker. Vanwege de omvang wordt het werk in deploybare slices uitgevoerd. Appspecifieke uitvoering staat in de gekoppelde plannen.

## Bronnen

- [Productmodel v2](../specs/admin-dashboard/product-catalogus/productmodel-v2-specificatie.md)
- [Recepten-app](../specs/recipe/recipe-app-spec.md)
- [Inventory](../specs/inventory-client/inventory-client-specificatie.md)
- [Calorie Tracker](../specs/calorie-tracker/calorie-tracker-specificatie.md)
- [Product ERD](../backend/ERD/PRODUCT_ERD.md)
- [Calorie/Recept ERD](../backend/ERD/CALORIE_TRACKER_ERD.md)
- [Storage ERD](../backend/ERD/STORAGE_ERD.md)

## Appplannen

1. [Backend en migratie](./productmodel-v2-backend-migratieplan.md)
2. [Contracts/shared](./productmodel-v2-contracts-shared-plan.md)
3. [Product Management Admin](./productmodel-v2-admin-dashboard-plan.md)
4. [Calorie Tracker](./productmodel-v2-calorie-tracker-plan.md)
5. [Inventory](./productmodel-v2-inventory-plan.md)
6. [Recepten-app](./recepten-app-implementatieplan.md)

## Doorsnijdende slices

### Slice 0 — Audit en migratiebewijs

- Inventariseer alle FK's naar `product_package` en oude rootproducten.
- Genereer rapport van roots met meerdere verpakkingen, macroprofiel, archiefstatus en mogelijke afwijkingen.
- Leg verwachte aantallen vast: roots, packages, logs, ingrediënten en voorraadpartijen.
- Bouw migratietests met representatieve multi-package-, archief-, portie- en voorraadcases.

**Exit:** rapport beoordeeld; geen productdata wordt nog gewijzigd.

### Slice 1 — Additief productmodel

- Voeg `product_composition`, nieuw concreet productmodel, productportie en macro-FK toe zonder oude tabellen te verwijderen.
- Backfill compositions en concrete producten met nieuwe UUID's.
- Bewaar een tijdelijke package→product-mapping.
- Voeg v2 read-contracts toe; v1 blijft operationeel.

**Exit:** aantallen en mappings zijn reproduceerbaar en v1-tests blijven groen.

### Slice 2 — Admin v2

- Lever platte concrete productlijst, detail en gedeelde samenstellingsdata.
- Lever create/edit/archive en autocomplete voor productsamenstellingen.
- Laat v1 package-writes tijdelijk read-only of feature-flagged naast v2 bestaan.

**Exit:** alle nieuwe catalogusdata wordt uitsluitend via v2 gemaakt.

### Slice 3 — Consumer-FK-cutover

- Migreer productconsumpties en receptingrediënten van package-ID naar product-UUID.
- Migreer iedere inventory-quantity naar fysieke inventory-items.
- Zet backendservices en contracts per domein om naar product-ID.
- Draai invariantcontroles vóór commit en na migratie.

**Exit:** Calorie Tracker en Inventory kunnen volledig via v2 lezen/schrijven.

### Slice 4 — Recepten-app en beheerextractie

- Voeg publieke/privé recipe reads en ownerbeheer toe.
- Bouw `/recepten`, gebruikersroutes en detail.
- Verwijder gerechtbeheer uit Calorie Tracker en voeg cross-app links toe.

**Exit:** recepten worden alleen in de Recepten-app beheerd; gerechten blijven logbaar.

### Slice 5 — Inventory resterende inhoud

- Lever fysieke-itemdetail, resterende inhoud, groepering, progressbar en THT-filters.
- Lever handmatige lage-voorraaddrempel.
- Valideer UI-tweaks met echte massa-, volume- en COUNT-producten.

### Slice 6 — Opschonen en post-MVP

- Verwijder v1 package-contracts, adapters, tabellen en compatibiliteitsroutes na één bewezen releasecyclus.
- Later: OCR/clipboard macro-extractie, lage-voorraadsuggesties en receptaanbevelingen.

## Rolloutregels

- Geen destructieve migratie vóór succesvolle backfill-, count- en FK-validatie.
- Gebruik feature flags of versie-endpoints voor tijdelijke dual-read; vermijd langdurige dual-write.
- Iedere slice heeft een rollbackpad zolang oude tabellen nog bestaan.
- Oude package-ID's worden nooit als nieuwe product-ID hergebruikt.
- Productnaam- en macrocorrecties blijven live; introduceer geen snapshots.

## Verificatie per cutover

- orphan-FK count = 0;
- iedere oude package heeft exact één nieuwe productmapping;
- iedere oude inventory quantity N levert N fysieke items;
- gearchiveerd wanneer oude root of package gearchiveerd was;
- log- en statistiektotalen vóór/na gelijk bij ongewijzigde data;
- bestaande dishlogs blijven aan dezelfde dishversie gekoppeld.
