# Productcatalogus v2 endpointcontract

Doelcontract voor het concrete-productmodel. Bestaande categorie-, merk-, locatie- en uploadconventies blijven gelden tenzij hieronder vervangen.

```yaml
GET /product-compositions/search:
  auth: admin
  query: { query: string, limit?: int }
  returns: 200 ProductCompositionSuggestion[]

POST /product-compositions:
  auth: admin
  body: CreateProductComposition
  returns: 201 ProductCompositionDetail
  errors: 409 [PRODUCT_COMPOSITION_ALREADY_EXISTS]

PUT /product-compositions/:compositionId:
  auth: admin
  body: UpdateProductComposition
  behavior: shared change affects every child product
  returns: 200 ProductCompositionDetail

PUT /product-compositions/:compositionId/macro-profile:
  auth: admin
  body: ProductMacroProfileInput
  behavior: live correction for every child product and dependent domain
  returns: 200 ProductMacroProfile
  errors: 409 [REFERENCE_BASIS_IN_USE]

GET /products:
  auth: admin
  query: { query?: string, categoryId?: int, brandId?: uuid, archived?: boolean, cursor?: string, limit?: int }
  behavior: flat concrete-product results
  returns: 200 ProductPage

GET /products/:productId:
  auth: admin
  returns: 200 ProductDetail

POST /products:
  auth: admin
  body: CreateConcreteProduct
  returns: 201 ProductDetail
  errors: 409 [PRODUCT_ALREADY_EXISTS, BARCODE_ALREADY_EXISTS]

PUT /products/:productId:
  auth: admin
  body: UpdateConcreteProduct
  returns: 200 ProductDetail

POST /products/:productId/archive:
  auth: admin
  returns: 200 ProductDetail

POST /products/:productId/restore:
  auth: admin
  returns: 200 ProductDetail
```

```yaml
CreateProductComposition:
  name: string
  brandId?: uuid|null
  categoryId: int
  consumptionType: FOOD|DRINK|SUPPLEMENT
  macroProfile?: ProductMacroProfileInput|null

CreateConcreteProduct:
  productCompositionId: uuid
  packageTypeId?: int|null
  content?: { amount: decimal-string, unitTypeId: int }|null
  imageUrl?: string|null
  barcode?: string|null
  portion?: ProductPortionInput|null

ProductPortionInput:
  singularName: string
  pluralName: string
  amount: decimal-string
  unitTypeId: int
  portionsPerProduct?: int|null

ProductSummary:
  productId: uuid
  productCompositionId: uuid
  displayName: derived
  compositionName: string
  brandName: string|null
  categoryPath: string
  consumptionType: FOOD|DRINK|SUPPLEMENT
  packageSummary: string|null
  imageUrl: string|null
  archivedAt: timestamp|null
```
