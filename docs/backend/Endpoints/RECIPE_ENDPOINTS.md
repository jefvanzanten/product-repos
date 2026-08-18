# Recepten endpointcontracten

Dit contract gebruikt technisch `dishes`; clients presenteren deze als recepten of gerechten. Decimalen zijn canonieke strings met puntseparator. Private-not-found, onbekend en gearchiveerd voor onbevoegden retourneren dezelfde `404 DISH_NOT_FOUND`.

## Publieke reads

```yaml
GET /recipes:
  auth: optional
  query:
    query?: string
    sort?: newest|oldest|name; default=newest
    cursor?: string
    limit?: int; default=30; max=100
  behavior:
    returns public non-archived recipes only
  returns: 200 RecipePage

GET /recipes/users/:userId:
  auth: optional
  query:
    query?: string
    archived?: boolean; owner-only; default=false
    cursor?: string
    limit?: int
  behavior:
    owner sees own public/private recipes; others see public non-archived only
  returns: 200 RecipePage

GET /recipes/users/:userId/:dishId:
  auth: optional
  returns: 200 RecipeDetail
  errors: 404 [DISH_NOT_FOUND]
```

## Beheer

```yaml
POST /recipes:
  auth: user
  body: CreateRecipe
  returns: 201 RecipeDetail
  errors: 400 [VALIDATION_ERROR, REFERENCE_NOT_FOUND]
          409 [DISH_ALREADY_EXISTS, PRODUCT_ARCHIVED, PRODUCT_NOT_CONSUMABLE]

PUT /recipes/:dishId:
  auth: owner
  body: UpdateRecipe
  behavior:
    name/visibility update stem; changed recipe content creates immutable version
  returns: 200 RecipeDetail
  errors: 404 [DISH_NOT_FOUND]
          409 [DISH_ALREADY_EXISTS, PRODUCT_ARCHIVED, PRODUCT_NOT_CONSUMABLE, DISH_UPDATE_CONFLICT]

POST /recipes/:dishId/archive:
  auth: owner
  returns: 200 RecipeArchiveResult
  errors: 404 [DISH_NOT_FOUND]

POST /recipes/:dishId/restore:
  auth: owner
  returns: 200 RecipeDetail
  errors: 404 [DISH_NOT_FOUND]
```

## Productselectie

```yaml
GET /recipes/products/search:
  auth: user
  query: { query: string, limit?: int }
  behavior: active concrete products with FOOD, DRINK, or SUPPLEMENT; match composition name and brand
  returns: 200 RecipeProductSearchResult[]

GET /recipes/products/:productId/input-units:
  auth: user
  returns: 200 RecipeIngredientInputOptions
  behavior:
    known nutrition basis => compatible dimension
    unknown basis => all active unit types grouped by dimension
```

## Shapes

```yaml
CreateRecipe:
  name: string
  visibility?: PRIVATE|PUBLIC; default=PRIVATE
  servings: decimal-string; >0
  instructions?: string|null
  ingredients: RecipeIngredientInput[]; min=1

UpdateRecipe:
  expectedUpdatedAt: timestamp
  name: string
  visibility: PRIVATE|PUBLIC
  servings: decimal-string; >0
  instructions?: string|null
  ingredients: RecipeIngredientInput[]; min=1

RecipeIngredientInput:
  productId: uuid
  quantity: decimal-string; >0
  inputMode: FULL_PRODUCT|PRODUCT_PORTION|CONTENT_UNIT
  inputUnitTypeId?: int|null

RecipeSummary:
  id: uuid
  userId: uuid
  makerDisplayName: string|null
  name: string
  visibility: PRIVATE|PUBLIC
  createdAt: timestamp
  updatedAt: timestamp

RecipeDetail:
  RecipeSummary + servings + instructions + ingredients + ownerActions

RecipeProductSearchResult:
  productId: uuid
  displayName: derived
  compositionName: string
  brandName: string|null
  packageSummary: string|null
  imageUrl: string|null
```
