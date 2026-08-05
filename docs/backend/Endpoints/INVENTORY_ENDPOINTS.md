# Inventory endpointcontracten — voorraad

<!--
Documentatieregel: houd endpointdocs als compacte contract-DSL: routes, auth, params, body, responses, errorcodes en API-specifieke shapes.
Domeinregels, UI-gedrag, datamodeluitleg, voorbeelden en rationale horen in specs, ERD's of domeindocs; verwijs hier alleen kort wanneer dat nodig is.
-->

Dit document beschrijft alleen het HTTP-contract voor voorraad. Locatiecontracten, inclusief `GET /locations`, staan in [LOCATION_ENDPOINTS.md](./LOCATION_ENDPOINTS.md). Opslagvelden staan in [STORAGE_ERD.md](../ERD/STORAGE_ERD.md). Featuregedrag staat in de [inventory client-specificaties](../../specs/inventory-client/inventory-client-specificatie.md). Catalogusregels staan in [productcatalogus-domeinregels.md](../../domein/productcatalogus-domeinregels.md).

## Contractconventies

```yaml
auth read: user
auth mutate: admin; mutatie-endpoints weigeren niet-beheerders zelfstandig
paths: Engelse plural resource names
body: strict; onbekende velden of verkeerde shapes => 400 VALIDATION_ERROR
text: trim voor validatie/opslag
date: kalenderdatum YYYY-MM-DD; null betekent geen datum
quantity: positief geheel getal; telt volledige verpakkingen
version: optimistic-lockingveld van inventory_item; mutaties sturen de gelezen versie mee
merge: mutaties op een bestaande combinatie productverpakking + locatie + datum tellen op bij die partij
timezoneHeader: X-Browser-Timezone; IANA; dagberekeningen gebruiken de applicatietijdzone
errorshape: { code, message, fields? }
```

## Errors

```yaml
400:
  - VALIDATION_ERROR
  - REFERENCE_NOT_FOUND
403:
  - ADMIN_ROLE_REQUIRED
404:
  - INVENTORY_ITEM_NOT_FOUND
  - LOCATION_NOT_FOUND
  - PRODUCT_PACKAGE_NOT_FOUND
409:
  - INVENTORY_ITEM_VERSION_CONFLICT
  - PRODUCT_PACKAGE_ARCHIVED
  - LOCATION_ARCHIVED
```

## Endpoints

### Voorraadlijst en zoeken

```yaml
GET /inventory-items:
  auth: user
  query:
    query?: string; trim; minSearchLength=2
    cursor?: string
    limit?: int; default=30; max=100 # productgroepen per pagina
  behavior:
    zonder query: alle partijen met quantity > 0, gegroepeerd per productverpakking
    met query: matcht op productnaam, merk, verpakkingsomschrijving, categoriepad en volledig locatiepad
    sortering: verlopen partijen eerst, dan vroegste houdbaarheidsdatum, datumloze groepen laatst alfabetisch
  returns:
    200: InventoryPage
  errors:
    400: [VALIDATION_ERROR]

GET /inventory-items/suggestions:
  auth: user
  query:
    query: string; trim; minSearchLength=2
  returns:
    200: InventorySuggestions
  errors:
    400: [VALIDATION_ERROR]
```

### Catalogus zoeken voor voorraadregistratie

```yaml
GET /inventory-items/packages/search:
  auth: user
  query:
    query?: string; trim; minSearchLength=2
    limit?: int; default=20; max=100
  behavior:
    toont uitsluitend actieve, niet-gearchiveerde producten en verpakkingen
    matcht op productnaam, merk, verpakkingsomschrijving en categoriepad
  returns:
    200: InventoryPackageSearchResult[]
  errors:
    400: [VALIDATION_ERROR]
  domain:
    selecteerbaarheid: ../../domein/productcatalogus-domeinregels.md
```

### Voorraad toevoegen

```yaml
POST /inventory-items:
  auth: admin
  body: AddInventoryItem
  behavior:
    verhoogt een bestaande partij op dezelfde productverpakking + locatie + datum of maakt een nieuwe partij
    locatie is verplicht; archivering van product, verpakking of locatie wordt geweigerd
  returns:
    201: InventoryItemRow
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND]
    403: [ADMIN_ROLE_REQUIRED]
    404: [PRODUCT_PACKAGE_NOT_FOUND, LOCATION_NOT_FOUND]
    409: [PRODUCT_PACKAGE_ARCHIVED, LOCATION_ARCHIVED]
```

### Voorraad aanpassen

```yaml
POST /inventory-items/:itemId/increment:
  auth: admin
  params:
    itemId: inventory_item.id
  behavior:
    atomaire relatieve mutatie +1; geen versienummer nodig
  returns:
    200: InventoryItemRow
  errors:
    403: [ADMIN_ROLE_REQUIRED]
    404: [INVENTORY_ITEM_NOT_FOUND]

POST /inventory-items/:itemId/decrement:
  auth: admin
  params:
    itemId: inventory_item.id
  behavior:
    atomaire relatieve mutatie −1; weigert onder nul
  returns:
    200: InventoryItemRow
  errors:
    400: [VALIDATION_ERROR]
    403: [ADMIN_ROLE_REQUIRED]
    404: [INVENTORY_ITEM_NOT_FOUND]

PUT /inventory-items/:itemId:
  auth: admin
  params:
    itemId: inventory_item.id
  body: SetInventoryQuantity
  behavior:
    zet de exacte voorraadstand; versieconflict => 409 met actuele stand
  returns:
    200: InventoryItemRow
  errors:
    400: [VALIDATION_ERROR]
    403: [ADMIN_ROLE_REQUIRED]
    404: [INVENTORY_ITEM_NOT_FOUND]
    409: [INVENTORY_ITEM_VERSION_CONFLICT]

POST /inventory-items/:itemId/move:
  auth: admin
  params:
    itemId: inventory_item.id
  body: MoveInventoryItem
  behavior:
    verlaagt de bronpartij en maakt of verhoogt de doelpartij in één transactie
    doellocatie mag niet de bronlocatie of een gearchiveerde locatie zijn
  returns:
    200: InventoryMoveResult
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND]
    403: [ADMIN_ROLE_REQUIRED]
    404: [INVENTORY_ITEM_NOT_FOUND, LOCATION_NOT_FOUND]
    409: [INVENTORY_ITEM_VERSION_CONFLICT, LOCATION_ARCHIVED]

POST /inventory-items/:itemId/set-expiry:
  auth: admin
  params:
    itemId: inventory_item.id
  body: SetInventoryExpiry
  behavior:
    wijzigt of verwijdert de houdbaarheidsdatum van een aantal verpakkingen
    het gewijzigde aantal wordt een nieuwe partij of telt op bij een bestaande partij op dezelfde locatie met de nieuwe datum
  returns:
    200: InventoryMoveResult
  errors:
    400: [VALIDATION_ERROR]
    403: [ADMIN_ROLE_REQUIRED]
    404: [INVENTORY_ITEM_NOT_FOUND]
    409: [INVENTORY_ITEM_VERSION_CONFLICT]
```

## API-shapes

Alle velden verwijzen naar de gelijknamige ERD-kolom in camelCase, behalve wanneer hier `derived` of `embedded` staat.

```yaml
InventoryPage:
  fields:
    - groups: InventoryProductGroup[]
    - nextCursor: string|null

InventoryProductGroup:
  source: product + product_package + unit_content + package_type
  fields:
    - productId
    - productPackageId
    - displayName: derived # productnaam
    - brandName: brand.name|null
    - packageSummary: derived # bijvoorbeeld `pak 1 liter`
    - categoryPath: derived # bijvoorbeeld `Voeding › Zuivel`
    - imageUrl: product_package.image_url|null
    - totalQuantity: derived # som van alle partijen van deze verpakking
    - earliestExpiryDate: inventory_item.expiry_date|null
    - archivedAt: product_package.archived_at|product.archived_at|null
    - items: InventoryItemRow[]

InventoryItemRow:
  source: inventory_item + location
  fields:
    - id
    - locationId
    - locationPath: derived # volledig pad, bijvoorbeeld `Keuken › Koelkast › Lade 1`
    - isLocationArchived: derived # true wanneer de locatie zelf of via een voorouder gearchiveerd is
    - expiryDate: inventory_item.expiry_date|null
    - quantity
    - version

InventorySuggestions:
  fields:
    - packages: InventoryPackageSearchResult[]
    - categories: CategorySuggestion[]
    - brands: BrandSuggestion[]
    - locations: LocationSuggestion[]

InventoryPackageSearchResult:
  source: product + product_package
  fields: [productId, productPackageId, displayName, brandName, packageSummary, categoryPath]

CategorySuggestion:
  fields: [id, name, path:derived]

BrandSuggestion:
  fields: [id, name]

LocationSuggestion:
  fields: [id, name, path:derived]

AddInventoryItem:
  productPackageId: product_package.id
  quantity: int; min=1
  locationId: location.id # verplicht
  expiryDate?: inventory_item.expiry_date|null

SetInventoryQuantity:
  quantity: int; min=0
  version: inventory_item.version

MoveInventoryItem:
  quantity: int; min=1; max=actueel aantal
  toLocationId: location.id
  version: inventory_item.version

SetInventoryExpiry:
  quantity: int; min=1; max=actueel aantal
  toExpiryDate: inventory_item.expiry_date|null
  version: inventory_item.version

InventoryMoveResult:
  fields:
    - source: InventoryItemRow
    - target: InventoryItemRow # aangemaakte of verhoogde doelpartij
```
