# Inventory endpointcontracten — doelmodel fysieke items

```yaml
auth read: user
auth mutate: admin
amount: decimal string in canonical base unit of product content dimension
version: optimistic locking
```

## Lijst en filters

```yaml
GET /inventory-items:
  auth: user
  query:
    query?: string
    filter?: all|low-stock|expiring; default=all
    cursor?: string
    limit?: int; default=30; max=100
  behavior:
    groups by concrete product
    full physical items with equal product/location/expiry may be presentation-grouped
    partial items remain separate
  returns: 200 InventoryPage

GET /inventory-items/:itemId:
  auth: user
  returns: 200 InventoryItemDetail
  errors: 404 [INVENTORY_ITEM_NOT_FOUND]

GET /inventory-items/products/search:
  auth: user
  query: { query: string, limit?: int }
  behavior: active concrete products with known total content
  returns: 200 InventoryProductSearchResult[]
```

## Toevoegen

```yaml
POST /inventory-items:
  auth: admin
  body: AddInventoryItems
  behavior: creates quantity separate full physical rows transactionally
  returns: 201 InventoryItem[]
  errors: 404 [PRODUCT_NOT_FOUND, LOCATION_NOT_FOUND]
          409 [PRODUCT_ARCHIVED, LOCATION_ARCHIVED, PRODUCT_CONTENT_UNKNOWN]
```

## Mutaties

```yaml
PUT /inventory-items/:itemId/content:
  auth: admin
  body: { remainingAmountBase: decimal-string; min=0, version: int }
  behavior: zero removes from active inventory; value may not exceed current product maximum
  returns: 200 InventoryItemDetail|204
  errors: 409 [INVENTORY_ITEM_VERSION_CONFLICT, AMOUNT_EXCEEDS_PRODUCT_CONTENT]

PUT /inventory-items/:itemId/location:
  auth: admin
  body: { locationId: int, version: int }
  returns: 200 InventoryItemDetail

PUT /inventory-items/:itemId/expiry:
  auth: admin
  body: { expiryDate: date|null, version: int }
  returns: 200 InventoryItemDetail

DELETE /inventory-items/:itemId:
  auth: admin
  body: { version: int }
  returns: 204
```

## Drempels

```yaml
PUT /inventory-items/products/:productId/low-stock-threshold:
  auth: admin
  body:
    lowStockAmountBase: decimal-string
    movementClass?: SLOW|MEDIUM|FAST|null
  returns: 200 ProductStockThreshold
```

## Shapes

```yaml
AddInventoryItems:
  productId: uuid
  quantity: int; min=1
  locationId: int
  expiryDate?: date|null

InventoryItem:
  id: uuid
  productId: uuid
  locationId: int
  expiryDate: date|null
  remainingAmountBase: decimal-string
  maximumAmountBase: decimal-string; derived from current product
  remainingRatio: decimal; derived
  isFull: boolean; derived
  version: int

InventoryProductGroup:
  product: InventoryProductSearchResult
  totalPackageEquivalent: decimal; presentation max one decimal
  earliestExpiryStatus: EXPIRED|TODAY|URGENT|SOON|LATER|NONE
  fullGroups: FullInventoryPresentationGroup[]
  partialItems: InventoryItemDetail[]

FullInventoryPresentationGroup:
  productId: uuid
  locationId: int
  locationPath: string
  expiryDate: date|null
  count: int
  itemIds: uuid[]
```
