# Productcatalogus v2 endpointcontract

Doelcontract voor het concrete-productmodel. Bestaande categorie-, merk-, locatie- en uploadconventies blijven gelden tenzij hieronder vervangen.

```yaml
GET /product-compositions/search:
  auth: admin
  query: { query: string, limit?: int }
  returns: 200 ProductCompositionDto[]

POST /product-compositions:
  auth: admin
  body: CreateProductComposition
  returns: 201 ProductCompositionDto
  errors: 409 [PRODUCT_COMPOSITION_ALREADY_EXISTS]

PUT /product-compositions/:compositionId:
  auth: admin
  body: UpdateProductComposition
  behavior: shared change affects every child product
  returns: 200 ProductCompositionDto

PUT /product-compositions/:compositionId/macro-profile:
  auth: admin
  body: ProductMacroProfileMutation
  behavior:
    enabled=true => validate and activate supplied values
    enabled=false => deactivate while preserving stored values
    live correction affects every child product and dependent domain
  returns: 200 ProductMacroProfile|null
  errors: 409 [REFERENCE_BASIS_IN_USE]

GET /products:
  auth: admin
  query: { query?: string, categoryId?: int, brandId?: uuid, archived?: boolean, cursor?: string, limit?: int }
  behavior: flat concrete-product results
  returns: 200 ConcreteProductPage

GET /products/:productId:
  auth: admin
  returns: 200 ConcreteProductDetail

POST /products:
  auth: admin
  body: CreateConcreteProduct
  returns: 201 ConcreteProductDetail
  errors: 409 [PRODUCT_ALREADY_EXISTS, BARCODE_ALREADY_EXISTS]

PUT /products/:productId:
  auth: admin
  body: UpdateConcreteProduct
  behavior: composition identity remains unchanged
  returns: 200 ConcreteProductDetail

POST /products/:productId/archive:
  auth: admin
  returns: 200 ConcreteProductDetail

POST /products/:productId/restore:
  auth: admin
  returns: 200 ConcreteProductDetail
```

```yaml
CreateProductComposition:
  name: string
  brandId?: uuid|null
  categoryId: int
  consumptionType: FOOD|DRINK|SUPPLEMENT|null
  macroProfile?: ProductMacroProfileInput|null # supplied profile starts active

UpdateProductComposition:
  name: string
  brandId?: uuid|null
  categoryId: int
  consumptionType: FOOD|DRINK|SUPPLEMENT|null
  behavior: setting consumptionType=null deactivates but does not delete a stored macro profile

ProductMacroProfileMutation:
  enabled: boolean
  profile?: ProductMacroProfileInput # required when enabling; omitted when disabling preserves stored values

ProductMacroProfile:
  enabled: boolean
  referenceBasis: PER_100_G|PER_100_ML|PER_UNIT
  caloriesKcal: decimal-string|null
  proteinG: decimal-string|null
  carbohydratesG: decimal-string|null
  fatG: decimal-string|null
  caloriesSource: AUTOMATIC|MANUAL|null

ProductCompositionDto:
  id: uuid
  name: string
  brand: Brand|null
  category: Category
  categoryPath: Category[]
  consumptionType: FOOD|DRINK|SUPPLEMENT|null
  macroProfile: ProductMacroProfile|null
  productCount: int
  activeProductCount?: int

CreateConcreteProduct:
  productCompositionId: uuid
  packageTypeId?: int|null
  content?: { amount: decimal-string, unitTypeId: int }|null
  imageUrl?: string|null
  barcode?: string|null
  portion?: ProductPortionInput|null

UpdateConcreteProduct:
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

ConcreteProductSummary:
  productId: uuid
  productCompositionId: uuid
  displayName: derived
  compositionName: string
  brandName: string|null
  categoryPath: string
  consumptionType: FOOD|DRINK|SUPPLEMENT|null
  packageSummary: string|null
  imageUrl: string|null
  barcode: string|null
  archivedAt: timestamp|null

ConcreteProductDetail:
  extends: ConcreteProductSummary
  composition: ProductCompositionDto
  packageTypeId: int|null
  content: { amount: decimal-string, unitTypeId: int, symbol: string, dimension: MASS|VOLUME|COUNT }|null
  portion: { singularName: string, pluralName: string, amount: decimal-string, unitTypeId: int, portionsPerProduct: int|null }|null
```
