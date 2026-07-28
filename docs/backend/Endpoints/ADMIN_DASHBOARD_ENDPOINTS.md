# Admin dashboard endpoints — productcatalogus

Dit document is het HTTP-contract voor de admin productcatalogus. Functionele UI- en productregels staan in:

- `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md`
- `docs/specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md`
- `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md`
- `docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md`

## Algemene endpointregels

- Endpoint paths gebruiken Engelse plural resource names.
- Request bodies zijn strict: onbekende velden of verkeerde shapes geven `400 VALIDATION_ERROR`.
- Text fields worden getrimd vóór validatie/opslag.
- Duplicaatchecks gebruiken `lower(trim(value))`-semantiek.
- Interne whitespace, punctuation en hyphens worden niet genormaliseerd in deze slice.
- Decimal amounts worden verzonden als string met `.` als separator, bijvoorbeeld `"1.5"`.
- De backend canonicaliseert decimal amounts vóór lookup/opslag, bijvoorbeeld `"1.50"` naar `"1.5"`.

## Error shape

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request is invalid",
  "fields": {
    "name": "Name is required"
  }
}
```

Mogelijke error codes in deze slice:

- `VALIDATION_ERROR`
- `REFERENCE_NOT_FOUND`
- `BRAND_NOT_FOUND`
- `CATEGORY_ALREADY_EXISTS`
- `CATEGORY_HAS_CHILDREN`
- `CATEGORY_HAS_PRODUCTS`
- `PRODUCT_ALREADY_EXISTS`
- `PRODUCT_NOT_FOUND`
- `PRODUCT_PACKAGE_ALREADY_EXISTS`
- `PRODUCT_PACKAGE_NOT_FOUND`

## DTOs

```ts
type BrandDto = {
  id: string // uuid
  name: string
}

type CategoryDto = {
  id: number
  name: string
  parentId: number | null
}

type UnitTypeDto = {
  id: number
  name: string
}

type PackageTypeDto = {
  id: number
  name: string
}

type UnitContentDto = {
  id: number
  amount: string
  unitType: UnitTypeDto
}

type ProductPackageDto = {
  id: string // uuid
  packageType: PackageTypeDto
  unitContent: UnitContentDto
  unitsPerPackage: number
  summary: string
}

type ProductCreatedDto = {
  id: string // uuid
  name: string
  category: CategoryDto
  brand: BrandDto | null
  package: ProductPackageDto
}

type ProductDetailDto = {
  id: string // uuid
  name: string
  displayName: string
  category: CategoryDto
  categoryPath: CategoryDto[]
  brand: BrandDto | null
  packages: ProductPackageDto[]
}

type CatalogProductRow = {
  id: string // uuid
  displayName: string
  brand: BrandDto | null
  categoryPath: string
  packageSummary: string
}

type CatalogCategoryRow = CategoryDto & {
  path: string
  productCount: number
}
```

## `GET /categories`

Returns all categories as a flat tree source.

Response `200 OK`:

```json
[
  { "id": 1, "name": "Voeding", "parentId": null },
  { "id": 2, "name": "Drinken", "parentId": 1 }
]
```

Rules:

- Empty list is allowed: `200 OK []`.
- `parentId` is always present and is `null` for root categories.
- No `path` field is returned.

## `POST /categories`

Creates one category node.

Request:

```json
{
  "name": "Cola",
  "parentId": 3
}
```

For root categories, `parentId` may be omitted or set to `null`.

Response `201 Created`:

```json
{ "id": 4, "name": "Cola", "parentId": 3 }
```

Errors:

- `400 VALIDATION_ERROR` when request shape is invalid or `name` is empty after trim.
- `400 REFERENCE_NOT_FOUND` when `parentId` is provided and does not exist.
- `409 CATEGORY_ALREADY_EXISTS` when a sibling with the same name already exists case-insensitively after trim.

## `DELETE /categories/:id`

Deletes one category when it is safe to delete.

Response `200 OK`:

```json
{ "id": 4 }
```

Errors:

- `400 VALIDATION_ERROR` when `id` is invalid.
- `400 REFERENCE_NOT_FOUND` when the category does not exist.
- `409 CATEGORY_HAS_CHILDREN` when the category has subcategories.
- `409 CATEGORY_HAS_PRODUCTS` when products are linked to the category.

## `GET /brands?query=...`

Autocomplete search for brands.

Rules:

- `query` is optional.
- Query is trimmed.
- Missing, empty, or one-character query returns `200 OK []`.
- Search is case-insensitive contains search.
- Maximum 10 results.
- Results are sorted alphabetically by name, case-insensitive.

Response `200 OK`:

```json
[
  { "id": "7b8c4d5e-0000-4000-8000-000000000001", "name": "Coca-Cola" }
]
```

## `GET /brands/:brandId`

Returns one brand by UUID.

Response `200 OK`:

```json
{ "id": "7b8c4d5e-0000-4000-8000-000000000001", "name": "Coca-Cola" }
```

Errors:

- `404 BRAND_NOT_FOUND` when `brandId` is not a UUID or the brand does not exist.

## `POST /brands`

Find-or-create brand.

Request:

```json
{ "name": "Coca-Cola" }
```

Responses:

- `201 Created` when a new brand was created.
- `200 OK` when an existing brand was found and returned.

```json
{ "id": "7b8c4d5e-0000-4000-8000-000000000001", "name": "Coca-Cola" }
```

Errors:

- `400 VALIDATION_ERROR` when request shape is invalid or `name` is empty after trim.

## `GET /unit-types`

Returns seeded unit types for the content amount selector.

Response `200 OK`:

```json
[
  { "id": 1, "name": "gram" },
  { "id": 2, "name": "liter" }
]
```

Rules:

- Empty list is allowed: `200 OK []`.
- Sorted alphabetically by `name`, case-insensitive.

## `GET /package-types`

Returns seeded package types for the package type selector.

Response `200 OK`:

```json
[
  { "id": 1, "name": "blik" },
  { "id": 2, "name": "fles" }
]
```

Rules:

- Empty list is allowed: `200 OK []`.
- Sorted alphabetically by `name`, case-insensitive.

## `GET /products`

Browses the product catalog.

Query parameters:

- no query/context: root browse; returns relevant root categories and no flat product list.
- `categoryId=<number>`: category browse; returns direct subcategories and direct products only.
- `brandId=<uuid>`: brand result state; returns products for the brand grouped by category.
- `limit=<number>`: optional cumulative product-list limit. Default is 50, maximum is 500. Missing or invalid values fall back to the default. The response `cursor` is an opaque next-limit token for the next `limit` value.

Root response `200 OK`:

```json
{
  "state": "root",
  "categories": [
    { "id": 1, "name": "Dranken", "parentId": null, "path": "Dranken", "productCount": 12 }
  ],
  "isEmpty": false
}
```

Category response `200 OK`:

```json
{
  "state": "category",
  "category": { "id": 4, "name": "Cola", "parentId": 3, "path": "Dranken > Frisdrank > Cola", "productCount": 12 },
  "categoryPath": [
    { "id": 1, "name": "Dranken", "parentId": null },
    { "id": 3, "name": "Frisdrank", "parentId": 1 },
    { "id": 4, "name": "Cola", "parentId": 3 }
  ],
  "subcategories": [],
  "products": {
    "items": [
      {
        "id": "0a1b2c3d-0000-4000-8000-000000000001",
        "displayName": "Coca-Cola Zero Sugar",
        "brand": { "id": "7b8c4d5e-0000-4000-8000-000000000001", "name": "Coca-Cola" },
        "categoryPath": "Dranken > Frisdrank > Cola",
        "packageSummary": "fles 1.5 liter"
      }
    ],
    "hasMore": false,
    "cursor": null
  }
}
```

Brand response `200 OK`:

```json
{
  "state": "brand",
  "brand": { "id": "7b8c4d5e-0000-4000-8000-000000000001", "name": "Coca-Cola" },
  "productGroups": [
    {
      "category": { "id": 4, "name": "Cola", "parentId": 3 },
      "categoryPath": "Dranken > Frisdrank > Cola",
      "products": []
    }
  ],
  "hasMore": false,
  "cursor": null
}
```

Errors:

- `400 VALIDATION_ERROR` when `categoryId` has an invalid shape.
- `400 REFERENCE_NOT_FOUND` when a valid `categoryId` or `brandId` does not exist. The frontend renders this as an invalid-context state.

## `GET /products/search`

Searches products, brands and categories for the catalog page.

Query parameters:

- `query`: search text. Below two trimmed characters, all result groups are empty.
- `productLimit`: optional product result limit, default 20, maximum 200. Missing or invalid values fall back to the default.
- `brandLimit`: optional brand result limit, default 10, maximum 100. Missing or invalid values fall back to the default.
- `categoryLimit`: optional category result limit, default 10, maximum 100. Missing or invalid values fall back to the default.

Response `200 OK`:

```json
{
  "products": [],
  "brands": [
    { "id": "7b8c4d5e-0000-4000-8000-000000000001", "name": "Coca-Cola", "productCount": 4 }
  ],
  "categories": [
    { "id": 4, "name": "Cola", "parentId": 3, "path": "Dranken > Frisdrank > Cola", "productCount": 12 }
  ],
  "hasMore": {
    "products": false,
    "brands": false,
    "categories": false
  }
}
```

## `POST /products`

Creates a product with exactly one initial package.

Request:

```json
{
  "name": "Zero Sugar",
  "categoryId": 4,
  "brandId": "7b8c4d5e-0000-4000-8000-000000000001",
  "package": {
    "packageTypeId": 2,
    "amount": "1.5",
    "unitTypeId": 2,
    "unitsPerPackage": 1
  }
}
```

`brandId` may be omitted or explicitly set to `null`.

Response `201 Created`:

```json
{
  "id": "0a1b2c3d-0000-4000-8000-000000000001",
  "name": "Zero Sugar",
  "category": { "id": 4, "name": "Cola", "parentId": 3 },
  "brand": { "id": "7b8c4d5e-0000-4000-8000-000000000001", "name": "Coca-Cola" },
  "package": {
    "id": "9a9b9c9d-0000-4000-8000-000000000001",
    "packageType": { "id": 2, "name": "fles" },
    "unitContent": {
      "id": 456,
      "amount": "1.5",
      "unitType": { "id": 2, "name": "liter" }
    },
    "unitsPerPackage": 1,
    "summary": "fles 1.5 liter"
  }
}
```

For products without brand, the `brand` field is present as `null`.

Errors:

- `400 VALIDATION_ERROR` for missing/invalid fields, unknown fields, or wrong shapes.
- `400 REFERENCE_NOT_FOUND` for non-existing `categoryId`, `brandId`, `packageTypeId`, or `unitTypeId`.
- `409 PRODUCT_ALREADY_EXISTS` for duplicate product.

Example conflict:

```json
{
  "code": "PRODUCT_ALREADY_EXISTS",
  "message": "Product already exists",
  "existingProductId": "0a1b2c3d-0000-4000-8000-000000000001"
}
```

No `Location` header is required for this slice.

## `GET /products/:productId`

Returns product detail with all product packages.

Response `200 OK`: `ProductDetailDto`.

Errors:

- `404 PRODUCT_NOT_FOUND` when `productId` is not a UUID or does not exist.
- `400 REFERENCE_NOT_FOUND` when the product references missing/corrupt category or brand data.

## `PATCH /products/:productId`

Updates product identity fields.

Request:

```json
{
  "name": "Zero Sugar",
  "categoryId": 4,
  "brandId": null
}
```

Response `200 OK`: refreshed `ProductDetailDto`.

Errors:

- `400 VALIDATION_ERROR` for missing/invalid fields, unknown fields, wrong shapes, or empty `name` after trim.
- `400 REFERENCE_NOT_FOUND` for non-existing `categoryId` or `brandId`.
- `404 PRODUCT_NOT_FOUND` when `productId` is not a UUID or does not exist.
- `409 PRODUCT_ALREADY_EXISTS` for duplicate product; the current product itself is excluded from duplicate detection.

## `POST /products/:productId/packages`

Adds one package to an existing product.

Request:

```json
{
  "packageTypeId": 2,
  "amount": "1.5",
  "unitTypeId": 2,
  "unitsPerPackage": 1
}
```

Response `201 Created`: `ProductPackageDto` plus `productId`.

Errors:

- `400 VALIDATION_ERROR` for missing/invalid fields, unknown fields, wrong shapes, invalid decimal amount, or invalid `unitsPerPackage`.
- `400 REFERENCE_NOT_FOUND` for non-existing `packageTypeId` or `unitTypeId`.
- `404 PRODUCT_NOT_FOUND` when `productId` is not a UUID or does not exist.
- `409 PRODUCT_PACKAGE_ALREADY_EXISTS` when the same package already exists for the product.

## `GET /products/:productId/packages/:packageId`

Returns one package detail for a product/package pair.

Response `200 OK`: `ProductPackageDto` plus `productId`.

Errors:

- `404 PRODUCT_NOT_FOUND` when `productId` is not a UUID or does not exist.
- `404 PRODUCT_PACKAGE_NOT_FOUND` when `packageId` is not a UUID, does not exist, or does not belong to the product.

## `PATCH /products/:productId/packages/:packageId`

Updates one package and returns the refreshed package detail.

Request: same shape as `POST /products/:productId/packages`.

Response `200 OK`: `ProductPackageDto` plus `productId`.

Errors:

- `400 VALIDATION_ERROR` for missing/invalid fields, unknown fields, wrong shapes, invalid decimal amount, or invalid `unitsPerPackage`.
- `400 REFERENCE_NOT_FOUND` for non-existing `packageTypeId` or `unitTypeId`.
- `404 PRODUCT_NOT_FOUND` when `productId` is not a UUID or does not exist.
- `404 PRODUCT_PACKAGE_NOT_FOUND` when `packageId` is not a UUID, does not exist, or does not belong to the product.
- `409 PRODUCT_PACKAGE_ALREADY_EXISTS` when the update would duplicate another package under the same product.
