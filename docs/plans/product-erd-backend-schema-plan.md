# Plan — Product ERD leidend maken in backend schema

## Aanleiding

`docs/backend/ERD/PRODUCT_ERD.md` is de bron van waarheid voor het productdatamodel. `apps/backend/src/db/schemas/products.schema.ts` wijkt daarvan af: sommige ERD-indexen ontbreken in het Drizzle-schema, `product_package.id` heeft een ander type, en er staan nog niet-ERD-tabellen (`product_variant`, `product_sku`) in het productschema.

## Doel

Zorg dat het backend schema exact de tabellen en constraints uit `PRODUCT_ERD.md` uitdrukt:

- `brand`
- `category`
- `unit_type`
- `unit_content`
- `package_type`
- `product`
- `product_package`

Buiten scope: nieuwe nutrition/calorie- of inventory-functionaliteit. Die ERD's zijn respectievelijk niet actueel of conceptueel.

## Huidige afwijkingen

1. `brand`
   - ERD: unieke index op `lower(trim(name))`.
   - Schema: geen unieke index.
2. `category`
   - ERD: twee partial/expression unique indexes voor rootcategorieën en siblings.
   - Schema: geen unieke indexen.
3. `unit_type`
   - ERD: unieke index op `lower(trim(name))`.
   - Schema: geen unieke index.
4. `package_type`
   - ERD: unieke index op `lower(trim(name))`.
   - Schema: geen unieke index.
5. `product`
   - ERD: partial/expression unique indexes voor producten met en zonder merk.
   - Schema: geen unieke indexen.
6. `product_package`
   - ERD: `id: uuid PK`.
   - Schema/migratie: `id integer autoincrement PK`.
7. Niet-ERD-tabellen
   - `product_variant` en `product_sku` staan in `products.schema.ts`, maar niet in de leidende Product ERD.
   - `calory-tracker.schema.ts` hangt nog aan `product_variant`, terwijl `CALORIE_TRACKER_ERD.md` expliciet niet actueel is.
8. Migrations versus schema
   - `0002_product_create_slice.sql` bevat al meerdere ERD-indexen die niet in `products.schema.ts` staan. Daardoor is er drift tussen Drizzle-schema en migratiestatus.

## Gewenste eindsituatie per tabel

### `brand`

- `id` als uuid/text primary key met default UUID.
- `name text NOT NULL`.
- Unique expression index: `lower(trim(name))`.

### `category`

- `id integer primary key autoincrement`.
- `parent_id integer NULL references category(id)`.
- `name text NOT NULL`.
- Unique expression/partial indexes:
  - root: `lower(trim(name)) WHERE parent_id IS NULL`;
  - sibling: `parent_id, lower(trim(name)) WHERE parent_id IS NOT NULL`.

### `unit_type`

- `id integer primary key autoincrement`.
- `name text NOT NULL`.
- Unique expression index: `lower(trim(name))`.

### `unit_content`

- `id integer primary key autoincrement`.
- `unit_type_id integer NOT NULL references unit_type(id)`.
- `amount decimal NOT NULL`.
- Unique index: `(unit_type_id, amount)`.
- Implementatiekeuze vastleggen: SQLite heeft geen echte decimal type. Behoud alleen `real` als we accepteren dat canonical decimal strings numeriek worden opgeslagen; anders migreren naar een tekstuele canonical decimal kolom.

### `package_type`

- `id integer primary key autoincrement`.
- `name text NOT NULL`.
- Unique expression index: `lower(trim(name))`.

### `product`

- `id` als uuid/text primary key met default UUID.
- `name text NOT NULL`.
- `category_id integer NOT NULL references category(id)`.
- `brand_id uuid/text NULL references brand(id)`.
- Unique expression/partial indexes:
  - met merk: `brand_id, category_id, lower(trim(name)) WHERE brand_id IS NOT NULL`;
  - zonder merk: `category_id, lower(trim(name)) WHERE brand_id IS NULL`.

### `product_package`

- `id` als uuid/text primary key met default UUID, conform Product ERD.
- `product_id uuid/text NOT NULL references product(id)`.
- `unit_content_id integer NOT NULL references unit_content(id)`.
- `package_type_id integer NOT NULL references package_type(id)`.
- `units_per_package integer NOT NULL DEFAULT 1`.
- Unique index: `(product_id, package_type_id, unit_content_id, units_per_package)`.

## Uitvoerplan

### Stap 1 — Schema alignen

- Pas `apps/backend/src/db/schemas/products.schema.ts` aan zodat alleen Product-ERD-tabellen in dit schema staan.
- Voeg Drizzle-definities toe voor alle expression/partial unique indexes uit de ERD.
- Verwijder of verplaats `productVariants`, `productSkus`, `packagingType` en `packagingTypes` aliases uit het leidende productschema.
- Maak `product_package.id` een uuid/text primary key via de bestaande `uuid()` helper.

### Stap 2 — Afhankelijkheden opschonen

- Verwijder backend-imports die nog naar `productVariants` of `productSkus` wijzen.
- Omdat calorie/nutrition niet actueel is: haal `calory-tracker.schema.ts` uit `apps/backend/src/db/schema.ts`, of parkeer dit schema buiten de actieve Drizzle-export totdat er een nieuwe nutrition-ERD is.
- Controleer oude tijdelijke repositorycode (`apps/backend/src/repositories/tmp`) en verwijder/vervang verwijzingen naar `packagingType`/`packagingTypeId` als die code nog actief moet worden.

### Stap 3 — Contracts en DTO's aanpassen

- Update `packages/contracts/src/products.ts`: `productPackageDtoSchema.id` moet van `number().int()` naar `string().uuid()` als `product_package.id` uuid wordt.
- Controleer of `CreateProductRequest`, `ProductCreatedDto` en alle gerelateerde package/category/brand DTO's exact aansluiten op het nieuwe ERD-schema.
- Beschouw de contracts als de koppeling tussen backend en frontend: schemawijzigingen zijn pas klaar wanneer contracts, backend response en frontend usage hetzelfde model gebruiken.

### Stap 4 — Productcatalogus UI/frontend aanpassen

- Pas de product-aanmaken UI in `apps/inventory-admin_panel/app/routes/admin/new-product/new-product.tsx` aan op het nieuwe contract/schema.
- Pas de server-side frontend service in `apps/inventory-admin_panel/features/admin/product-catalog/services/productCatalogService.server.ts` aan op gewijzigde request/response types.
- Controleer alle admin productcatalogus-schermen op oude schema-aannames, vooral:
  - `product.package.id` als number versus uuid string;
  - oude `product_variant`/`product_sku`-concepten;
  - oude `packagingType`/`packagingTypeId` namen versus `packageType`/`packageTypeId`;
  - categorie-, merk-, unit- en package-type ids in form fields;
  - success-state na product aanmaken.
- De UI moet blijven werken voor de volledige create-flow: categorie kiezen/aanmaken, optioneel merk kiezen/aanmaken, productnaam invullen, eerste verpakking invullen en opslaan.
- Als frontend-tests voor product aanmaken ontbreken, voeg die toe of maak minimaal een route/action-level test die de formulierpayload naar het nieuwe contract valideert.

### Stap 5 — Repository- en servicegedrag aanpassen

- Update `apps/backend/src/repositories/products.repository.ts` voor uuid `product_package.id`.
- Laat duplicate-detectie in code bestaan als nette foutmelding, maar vertrouw de database unique indexes als harde waarborg.
- Voeg foutafhandeling toe voor database unique-constraint violations zodat race conditions ook als `PRODUCT_ALREADY_EXISTS`, `CATEGORY_ALREADY_EXISTS`, enzovoort terugkomen.

### Stap 6 — Migratie maken

- Maak een nieuwe Drizzle/SQLite migratie die de bestaande database naar de ERD-vorm brengt.
- Belangrijke migratiepunten:
  - voeg ontbrekende expression/partial indexes toe als ze nog ontbreken;
  - migreer `product_package.id` van integer naar uuid/text;
  - verwijder tabellen die niet in de Product ERD horen uit de actieve schema/migraties wanneer er geen actuele feature op leunt;
  - herstel foreign keys na tabelrebuilds met `PRAGMA foreign_keys` zorgvuldig aan/uit.
- Let op: `docs/backend/ERD/STORAGE_ERD.md` noemt `product_package_id: int`, maar heeft status `concept`. Als inventory al data heeft, eerst kiezen of storage mee migreert naar uuid of buiten deze productmigratie blijft.

### Stap 7 — Seeds en testdata bijwerken

- Controleer seeds voor `unit_type`, `package_type`, `category` en `brand` op case/trim duplicaten vóór unieke indexen worden toegepast.
- Pas eventuele inserts van `product_package` aan zodat geen integer id meer wordt verwacht.

### Stap 8 — Product-aanmaken guardrail

- Na elke schema-, migratie-, contract-, repository- of frontendwijziging moet expliciet gecontroleerd worden dat product aanmaken nog steeds 100% werkt.
- Backend: gebruik hiervoor bij voorkeur de bestaande testsuite `apps/backend/tests/product-create.test.ts`.
- Als deze backendtest ontbreekt, eerst een product-aanmaken testsuite maken voordat de schemawijziging verder wordt afgerond.
- Deze testsuite moet minimaal bewijzen dat product aanmaken transactioneel één `product` en één eerste `product_package` opslaat met categorie, optioneel merk, verpakkingstype, inhoud, eenheid en `unitsPerPackage`.
- Frontend: controleer de admin productcatalogus-flow voor product aanmaken tegen het nieuwe contract. Als daar nog geen test voor bestaat, voeg een test toe of documenteer expliciet welke route/action-level test deze flow afdekt.
- De feature mag pas als klaar worden beschouwd als backendtests én frontendchecks voor product aanmaken volledig slagen.

### Stap 9 — Verificatie

- Run typecheck/testcommando's via `corepack pnpm` volgens de workspace-regels.
- Voeg of update tests voor:
  - product aanmaken met bestaand merk en eerste verpakking;
  - product aanmaken zonder merk;
  - validatiefouten bij ongeldige product- of verpakkingsinput;
  - rollback/geen half opgeslagen product bij falen tijdens product-aanmaken;
  - merknaam duplicate met andere casing/spaties;
  - rootcategorie duplicate;
  - siblingcategorie duplicate;
  - product duplicate met merk;
  - product duplicate zonder merk;
  - `unit_content` canonical duplicate (`1.5`, `1.50`, `01.500`);
  - `product_package.id` als uuid in responsecontract.

## Acceptatiecriteria

- `products.schema.ts` bevat alleen de tabellen uit `PRODUCT_ERD.md`.
- Alle unique constraints uit de ERD staan in het Drizzle-schema én in de actuele migratie.
- `product_package.id` is uuid/text in schema, migratie, repository, contract en frontendgebruik.
- Er zijn geen actieve imports meer naar niet-actuele `product_variant`/`product_sku` tabellen.
- De admin productcatalogus UI gebruikt het nieuwe create-product contract en verwijst niet meer naar oude schema-aannames.
- Product-aanmaken blijft transactioneel één `product` en één eerste `product_package` aanmaken.
- De product-aanmaken testsuite bestaat en slaagt volledig; als de suite ontbrak, is die eerst toegevoegd.
- De frontend product-aanmaken flow is getest of minimaal route/action-level afgedekt tegen het nieuwe contract.
- Tests en typecheck slagen via `corepack pnpm`.
