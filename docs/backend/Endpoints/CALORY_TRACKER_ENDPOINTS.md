# Calorie Tracker endpointcontracten

<!--
Documentatieregel: houd endpointdocs als compacte contract-DSL: routes, auth, params, headers, body, responses, errorcodes en API-specifieke shapes.
Domeinregels, UI-gedrag, datamodeluitleg, voorbeelden en rationale horen in specs, ERD's of domeindocs; verwijs hier alleen kort wanneer dat nodig is.
-->

Dit document beschrijft alleen het HTTP-contract. Opslagvelden staan in [CALORY_TRACKER_ERD.md](../ERD/CALORY_TRACKER_ERD.md). Gedeelde domeinregels staan in [calorie-tracker-domeinregels.md](../../domein/calorie-tracker-domeinregels.md). Catalogusregels staan in [productcatalogus-domeinregels.md](../../domein/productcatalogus-domeinregels.md).

## Contractconventies

```yaml
auth: user
paths: Engelse plural resource names
body: strict; onbekende velden of verkeerde shapes => 400 VALIDATION_ERROR
decimal: string met puntseparator
timezoneHeader: X-Browser-Timezone; IANA; bijvoorbeeld Europe/Amsterdam
privateNotFound: onbekend log-ID en log van andere gebruiker => 404 LOG_NOT_FOUND
softDeleted: normale responses sluiten deleted logs uit
errorshape: { code, message, fields? }
domain: ../../domein/calorie-tracker-domeinregels.md
```

## Errors

```yaml
400:
  - VALIDATION_ERROR
  - REFERENCE_NOT_FOUND
404:
  - PRODUCT_PACKAGE_NOT_FOUND
  - LOG_NOT_FOUND
409:
  - PRODUCT_PACKAGE_ARCHIVED
  - LOG_ALREADY_EXISTS
  - LOG_CREATE_CONFLICT
  - LOG_UPDATE_CONFLICT
  - LOG_RESTORE_WINDOW_EXPIRED
500:
  - INTERNAL_ERROR # onverwachte invariantbreuk; fields.correlationId beschikbaar
```

## Endpoints

### Catalogusverpakkingen voor logs

```yaml
GET /calorie-tracker/packages/search:
  query:
    query?: string; trim; minSearchLength=2
    limit?: int; default=20; max=100
  behavior:
    query omitted: recent gebruikte actieve verpakkingen van de ingelogde gebruiker
    query present: actieve verpakkingen gevonden op productnaam of merknaam
  returns:
    200: PackageSearchResult[]
  domain:
    selecteerbaarheid: ../../domein/productcatalogus-domeinregels.md

GET /calorie-tracker/packages/:packageId/input-units:
  params:
    packageId: product_package.id
  returns:
    200: AvailableInputUnit[]
  errors:
    404: [PRODUCT_PACKAGE_NOT_FOUND]
```

### Logs

```yaml
GET /calorie-tracker/logs:
  headers: [X-Browser-Timezone]
  query:
    date: localDate YYYY-MM-DD
    type?: all|food|drink|supplement; default=all
  returns:
    200: LogList
  errors:
    400: [VALIDATION_ERROR]

POST /calorie-tracker/logs:
  headers: [X-Browser-Timezone]
  body: CreateConsumptionLog
  returns:
    201: ConsumptionLog
    200: ConsumptionLog # idempotente retry met gelijke create-inhoud
  errors:
    400: [VALIDATION_ERROR]
    404: [PRODUCT_PACKAGE_NOT_FOUND]
    409: [PRODUCT_PACKAGE_ARCHIVED, LOG_ALREADY_EXISTS, LOG_CREATE_CONFLICT]

GET /calorie-tracker/logs/:logId:
  params:
    logId: consumption_log.id
  returns:
    200: ConsumptionLog
  errors:
    404: [LOG_NOT_FOUND]

PUT /calorie-tracker/logs/:logId:
  headers: [X-Browser-Timezone]
  params:
    logId: consumption_log.id
  body: UpdateConsumptionLog
  returns:
    200: ConsumptionLog
  errors:
    400: [VALIDATION_ERROR]
    404: [LOG_NOT_FOUND, PRODUCT_PACKAGE_NOT_FOUND]
    409: [PRODUCT_PACKAGE_ARCHIVED, LOG_UPDATE_CONFLICT]
  compatibility:
    PATCH: tijdelijke alias met hetzelfde volledige bodycontract; minimaal één releasecyclus

DELETE /calorie-tracker/logs/:logId:
  params:
    logId: consumption_log.id
  returns:
    200: DeleteLogResult
  errors:
    404: [LOG_NOT_FOUND]

POST /calorie-tracker/logs/:logId/restore:
  params:
    logId: consumption_log.id
  returns:
    200: ConsumptionLog
  errors:
    404: [LOG_NOT_FOUND]
    409: [LOG_RESTORE_WINDOW_EXPIRED]
```

### Statistieken en doelen

```yaml
GET /calorie-tracker/statistics:
  headers: [X-Browser-Timezone]
  query:
    date: localDate YYYY-MM-DD; today or past
  returns:
    200: DailyStatistics
  errors:
    400: [VALIDATION_ERROR]
  domain:
    berekeningen: ../../domein/calorie-tracker-domeinregels.md

GET /calorie-tracker/goals:
  returns:
    200: NutritionGoal

PUT /calorie-tracker/goals:
  body: UpsertNutritionGoal
  returns:
    200: NutritionGoal
  errors:
    400: [VALIDATION_ERROR]
```

## API-shapes

Alle velden verwijzen naar de gelijknamige ERD-kolom in camelCase, behalve wanneer hier `derived`, `embedded` of `catalogus` staat.

```yaml
PackagePortion:
  source: product_package_portion + unit_content
  fields:
    - name
    - contentAmount: unit_content.amount
    - contentUnit: catalogus UnitType
    - portionsPerPackage: int|null

PackageSearchResult:
  source: product_package + optional product_package_portion + product + catalogusreferenties
  fields:
    - packageId: product_package.id
    - productId: product.id
    - productName: product.name
    - displayName: derived
    - brand: catalogus Brand|null
    - consumptionType: product.consumption_type
    - packageType: catalogus PackageType
    - contentAmount: unit_content.amount # volledige verpakkingsinhoud
    - contentUnit: catalogus UnitType
    - portion: PackagePortion|null
    - summary: derived
    - imageUrl: derived|null

AvailableInputUnit:
  fields:
    - inputMode: consumption_log.input_mode
    - unitType: catalogus UnitType|null
    - label: derived

MacroValues:
  source: product_macro_profile derived for consumed quantity
  fields: [caloriesKcal, proteinG, carbohydratesG, fatG]

ConsumptionLog:
  source: consumption_log + PackageSearchResult + derived values
  fields:
    - id
    - package: PackageSearchResult + { productArchived, packageArchived }
    - quantity
    - inputMode
    - inputUnitType: catalogus UnitType|null
    - consumedAt
    - timezone
    - localDate: derived
    - derivedQuantityLabel: derived
    - macroValues: MacroValues|null
    - createdAt
    - updatedAt

LogList:
  fields: [date, timezone, type, items:ConsumptionLog[]]

CreateConsumptionLog:
  id: consumption_log.id # client-generated
  packageId: consumption_log.product_package_id
  quantity: consumption_log.quantity
  inputMode: consumption_log.input_mode
  inputUnitTypeId: consumption_log.input_unit_type_id|null
  consumedAt: consumption_log.consumed_at

UpdateConsumptionLog:
  expectedUpdatedAt: consumption_log.updated_at
  packageId: consumption_log.product_package_id
  quantity: consumption_log.quantity
  inputMode: consumption_log.input_mode
  inputUnitTypeId: consumption_log.input_unit_type_id|null
  consumedAt: consumption_log.consumed_at

DeleteLogResult:
  fields: [id, deletedAt, restoreUntil]

NutritionGoal:
  source: user_nutrition_goal or empty goal defaults
  fields: [caloriesKcal, proteinG, carbohydratesG, fatG, updatedAt]

UpsertNutritionGoal:
  caloriesKcal: user_nutrition_goal.calories_kcal|null
  proteinG: user_nutrition_goal.protein_g|null
  carbohydratesG: user_nutrition_goal.carbohydrates_g|null
  fatG: user_nutrition_goal.fat_g|null

DailyStatistics:
  fields: [date, timezone, totals:MacroValues, goals:NutritionGoal|null]
```
