# Calorie Tracker endpointcontracten — doelmodel

```yaml
auth: user
decimal: canonical string with dot
timezoneHeader: X-Browser-Timezone
errorshape: { code, message, fields? }
```

## Zoeken

```yaml
GET /calorie-tracker/search:
  query: { query?: string, limit?: int; default=20; max=100 }
  behavior:
    no query => recent consumed concrete products and accessible dishes mixed by recency
    query => products then dishes, alphabetical within type
    products => active concrete products
    dishes => own non-archived plus public non-archived
  returns: 200 ConsumableSearchResult[]

GET /calorie-tracker/products/:productId/input-units:
  returns: 200 AvailableInputUnit[]
  errors: 404 [PRODUCT_NOT_FOUND]
```

Receptbeheer gebruikt [RECIPE_ENDPOINTS.md](./RECIPE_ENDPOINTS.md) en bestaat niet onder de Calorie Tracker-prefix.

## Logs

```yaml
GET /calorie-tracker/logs:
  headers: [X-Browser-Timezone]
  query: { date: YYYY-MM-DD, type?: all|food|drink|supplement }
  returns: 200 LogList

POST /calorie-tracker/logs:
  headers: [X-Browser-Timezone]
  body: CreateConsumptionLog
  returns: 201 ConsumptionLog | 200 ConsumptionLog # identical retry
  errors: 404 [PRODUCT_NOT_FOUND, DISH_NOT_FOUND]
          409 [PRODUCT_ARCHIVED, DISH_UNAVAILABLE, LOG_ALREADY_EXISTS, LOG_CREATE_CONFLICT]

GET /calorie-tracker/logs/:logId:
  returns: 200 ConsumptionLog
  errors: 404 [LOG_NOT_FOUND]

PUT /calorie-tracker/logs/:logId:
  headers: [X-Browser-Timezone]
  body: UpdateConsumptionLog
  returns: 200 ConsumptionLog
  errors: 404 [LOG_NOT_FOUND, PRODUCT_NOT_FOUND]
          409 [PRODUCT_ARCHIVED, LOG_UPDATE_CONFLICT]

DELETE /calorie-tracker/logs/:logId:
  returns: 200 DeleteLogResult

POST /calorie-tracker/logs/:logId/restore:
  returns: 200 ConsumptionLog
  errors: 409 [LOG_RESTORE_WINDOW_EXPIRED]
```

## Statistieken en doelen

```yaml
GET /calorie-tracker/statistics:
  headers: [X-Browser-Timezone]
  query: { date: YYYY-MM-DD }
  returns: 200 DailyStatistics

GET /calorie-tracker/goals:
  returns: 200 NutritionGoal

PUT /calorie-tracker/goals:
  body: UpsertNutritionGoal
  returns: 200 NutritionGoal
```

## Shapes

```yaml
ProductSearchResult:
  type: PRODUCT
  productId: uuid
  displayName: derived
  compositionName: string
  brandName: string|null
  packageSummary: string|null
  consumptionType: FOOD|DRINK|SUPPLEMENT
  imageUrl: string|null
  macroProfile: derived current profile|null

DishSearchResult:
  type: DISH
  dishId: uuid
  userId: uuid
  name: string
  makerDisplayName: string|null
  servings: decimal-string
  recipeUrl: /recepten/gebruiker/:userId/:dishId

CreateProductLog:
  id: uuid
  type: PRODUCT
  productId: uuid
  quantity: decimal-string
  inputMode: FULL_PRODUCT|PRODUCT_PORTION|CONTENT_UNIT
  inputUnitTypeId?: int|null
  consumedAt: timestamp

CreateDishLog:
  id: uuid
  type: DISH
  dishId: uuid
  quantity: decimal-string # recipe servings
  consumedAt: timestamp

CreateConsumptionLog: CreateProductLog|CreateDishLog
```
