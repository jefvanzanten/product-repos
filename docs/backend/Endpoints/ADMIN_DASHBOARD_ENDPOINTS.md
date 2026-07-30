# Admin dashboard endpointcontracten — productcatalogus

<!--
Documentatieregel: houd endpointdocs als compacte contract-DSL: routes, auth, params, body, responses, errorcodes en API-specifieke shapes.
Domeinregels, UI-gedrag, datamodeluitleg, voorbeelden en rationale horen in specs, ERD's of domeindocs; verwijs hier alleen kort wanneer dat nodig is.
-->

Dit document beschrijft alleen het HTTP-contract. Opslagvelden staan in [PRODUCT_ERD.md](../ERD/PRODUCT_ERD.md). Domeinregels staan in [productcatalogus-domeinregels.md](../../domein/productcatalogus-domeinregels.md).

## Contractconventies

```yaml
auth: admin
paths: Engelse plural resource names
body: strict; onbekende velden of verkeerde shapes => 400 VALIDATION_ERROR
text: trim voor validatie/opslag
decimal: string met puntseparator; backend canonicaliseert voor lookup/opslag
errorshape: { code, message, fields? }
domain: ../../domein/productcatalogus-domeinregels.md
```

## Errors

```yaml
400:
  - VALIDATION_ERROR
  - REFERENCE_NOT_FOUND
  - UNIT_DIMENSION_INCOMPATIBLE
404:
  - BRAND_NOT_FOUND
  - PRODUCT_NOT_FOUND
  - PRODUCT_PACKAGE_NOT_FOUND
409:
  - CATEGORY_ALREADY_EXISTS
  - CATEGORY_HAS_CHILDREN
  - CATEGORY_HAS_PRODUCTS
  - PRODUCT_ALREADY_EXISTS
  - PRODUCT_ARCHIVED
  - PRODUCT_PACKAGE_ALREADY_EXISTS
  - PRODUCT_MACRO_PROFILE_INVALID
```

## Endpoints

### Categories

```yaml
GET /categories:
  returns:
    200: Category[]

POST /categories:
  body: CreateCategory
  returns:
    201: Category
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND]
    409: [CATEGORY_ALREADY_EXISTS]

DELETE /categories/:id:
  params:
    id: category.id
  returns:
    200: DeletedId
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND]
    409: [CATEGORY_HAS_CHILDREN, CATEGORY_HAS_PRODUCTS]
```

### Brands

```yaml
GET /brands:
  query:
    query?: string; trim; minSearchLength=2; limit=10
  returns:
    200: Brand[]

GET /brands/:brandId:
  params:
    brandId: brand.id
  returns:
    200: Brand
  errors:
    404: [BRAND_NOT_FOUND]

POST /brands:
  body: CreateBrand
  returns:
    201: Brand # nieuw
    200: Brand # bestaand hergebruikt
  errors:
    400: [VALIDATION_ERROR]
```

### Referentiedata

```yaml
GET /unit-types:
  returns:
    200: UnitType[]

GET /package-types:
  returns:
    200: PackageType[]
```

### Catalogus browsen en zoeken

```yaml
GET /products:
  query:
    categoryId?: category.id
    brandId?: brand.id
    limit?: int; default=50; max=500
    status?: active|archived; default=active
  returns:
    200: CatalogBrowse
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND]

GET /products/search:
  query:
    query: string; trim; minSearchLength=2
    productLimit?: int; default=20; max=200
    brandLimit?: int; default=10; max=100
    categoryLimit?: int; default=10; max=100
    status?: active|archived; default=active
  returns:
    200: CatalogSearch
```

### Producten

```yaml
POST /products:
  body: CreateProduct
  returns:
    201: ProductCreated
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND, UNIT_DIMENSION_INCOMPATIBLE]
    409: [PRODUCT_ALREADY_EXISTS]
  headers:
    Location: not_required

GET /products/:productId:
  params:
    productId: product.id
  returns:
    200: ProductDetail
  errors:
    400: [REFERENCE_NOT_FOUND]
    404: [PRODUCT_NOT_FOUND]

PATCH /products/:productId:
  params:
    productId: product.id
  body: UpdateProduct
  returns:
    200: ProductDetail
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND, UNIT_DIMENSION_INCOMPATIBLE]
    404: [PRODUCT_NOT_FOUND]
    409: [PRODUCT_ALREADY_EXISTS]

POST /products/:productId/archive:
  params:
    productId: product.id
  returns:
    200: ProductDetail
  errors:
    404: [PRODUCT_NOT_FOUND]

POST /products/:productId/restore:
  params:
    productId: product.id
  returns:
    200: ProductDetail
  errors:
    404: [PRODUCT_NOT_FOUND]
```

### Verpakkingen

```yaml
POST /products/:productId/packages:
  params:
    productId: product.id
  body: UpsertProductPackage
  returns:
    201: ProductPackageWithProduct
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND, UNIT_DIMENSION_INCOMPATIBLE]
    404: [PRODUCT_NOT_FOUND]
    409: [PRODUCT_ARCHIVED, PRODUCT_PACKAGE_ALREADY_EXISTS]

GET /products/:productId/packages/:packageId:
  params:
    productId: product.id
    packageId: product_package.id
  returns:
    200: ProductPackageWithProduct
  errors:
    404: [PRODUCT_NOT_FOUND, PRODUCT_PACKAGE_NOT_FOUND]

PATCH /products/:productId/packages/:packageId:
  params:
    productId: product.id
    packageId: product_package.id
  body: UpsertProductPackage
  returns:
    200: ProductPackageWithProduct
  errors:
    400: [VALIDATION_ERROR, REFERENCE_NOT_FOUND, UNIT_DIMENSION_INCOMPATIBLE]
    404: [PRODUCT_NOT_FOUND, PRODUCT_PACKAGE_NOT_FOUND]
    409: [PRODUCT_PACKAGE_ALREADY_EXISTS]

POST /products/:productId/packages/:packageId/archive:
  params:
    productId: product.id
    packageId: product_package.id
  returns:
    200: ProductPackageWithProduct
  errors:
    404: [PRODUCT_NOT_FOUND, PRODUCT_PACKAGE_NOT_FOUND]

POST /products/:productId/packages/:packageId/restore:
  params:
    productId: product.id
    packageId: product_package.id
  returns:
    200: ProductPackageWithProduct
  errors:
    404: [PRODUCT_NOT_FOUND, PRODUCT_PACKAGE_NOT_FOUND]
```

## API-shapes

Alle velden verwijzen naar de gelijknamige ERD-kolom in camelCase, behalve wanneer hier `derived` of `embedded` staat.

```yaml
DeletedId:
  id: int|uuid

Brand:
  source: brand
  fields: [id, name]

Category:
  source: category
  fields: [id, name, parentId]

CreateCategory:
  name: category.name
  parentId?: category.parent_id|null

CreateBrand:
  name: brand.name

UnitType:
  source: unit_type
  fields: [id, name, symbol, dimension]

PackageType:
  source: package_type
  fields: [id, name]

UnitContent:
  source: unit_content + UnitType
  fields: [id, amount, unitType]

MacroProfile:
  source: product_macro_profile
  fields: [referenceBasis, caloriesKcal, proteinG, carbohydratesG, fatG, caloriesSource]

ProductPackage:
  source: product_package + package_type + unit_content
  fields:
    - id
    - packageType: PackageType
    - individualPackageType: PackageType|null
    - unitContent: UnitContent
    - unitsPerPackage
    - archivedAt
    - summary: derived

ProductPackageWithProduct:
  productId: product.id
  package: ProductPackage

ProductCreated:
  source: product + first ProductPackage
  fields: [id, name, consumptionType, category, brand, macroProfile, package, archivedAt]

ProductDetail:
  source: product + packages
  fields:
    - id
    - name
    - displayName: derived
    - consumptionType
    - category: Category
    - categoryPath: Category[]
    - brand: Brand|null
    - macroProfile: MacroProfile|null
    - archivedAt
    - packages: ProductPackage[]

CatalogProductRow:
  source: product + package summary
  fields: [id, displayName:derived, brand, consumptionType, categoryPath:derived, packageSummary:derived, archivedAt]

CatalogCategoryRow:
  source: category
  fields: [id, name, parentId, path:derived, productCount:derived]

CatalogBrowse:
  states:
    root: { categories: CatalogCategoryRow[], isEmpty: boolean }
    category: { category: CatalogCategoryRow, categoryPath: Category[], subcategories: CatalogCategoryRow[], products: Page<CatalogProductRow> }
    brand: { brand: Brand, productGroups: CategoryProductGroup[], hasMore: boolean, cursor: string|null }

CatalogSearch:
  fields: [products:CatalogProductRow[], brands:BrandSearchRow[], categories:CatalogCategoryRow[], hasMore]

CreateProduct:
  name: product.name
  categoryId: product.category_id
  brandId?: product.brand_id|null
  consumptionType: product.consumption_type
  macroProfile?: MacroProfile|null
  package: UpsertProductPackage

UpdateProduct:
  name: product.name
  categoryId: product.category_id
  brandId: product.brand_id|null
  consumptionType: product.consumption_type
  macroProfile: MacroProfile|null

UpsertProductPackage:
  packageTypeId: product_package.package_type_id
  individualPackageTypeId: product_package.individual_package_type_id|null
  amount: unit_content.amount
  unitTypeId: unit_content.unit_type_id
  unitsPerPackage: product_package.units_per_package
```
