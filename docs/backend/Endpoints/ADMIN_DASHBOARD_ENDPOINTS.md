# Admin dashboard endpoints — product creation MVP

This document defines the runtime API needed for the vertical slice **create a new product**.

## Scope

A product is considered created only when both are created successfully:

1. the `product`
2. exactly one initial `product_package`

Out of scope for this MVP slice:

- nutrition endpoints
- storage/inventory endpoints
- product details endpoint
- editing products
- adding extra packages after product creation
- authentication/authorization details

## Conventions

- Endpoint paths use English plural resource names.
- Request bodies are strict: unknown fields or wrong shapes return `400 VALIDATION_ERROR`.
- Text fields are trimmed before validation/storage.
- Text duplicate checks are case-insensitive with `lower(trim(value))` semantics.
- No fuzzy text matching in this MVP. For example, `Cola Zero` and `Cola_Zero` are different.
- Decimal amounts are sent as decimal strings using `.` as decimal separator. UI input `1,5` must be converted by the client to `"1.5"`.
- Decimal values are canonicalized by the backend before lookup/storage. For example, `"1.50"` is returned and reused as `"1.5"`.

Common error shape, intentionally lightweight:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request is invalid",
  "fields": {
    "name": "Name is required"
  }
}
```

Implementation may model errors with typed/OOP domain errors. This document only defines the HTTP mapping.

## Seeded reference data

`unit_type` and `package_type` are managed through database seed/migration data, not through runtime create endpoints.

The product-create UI can only read them through:

- `GET /unit-types`
- `GET /package-types`

Seed values are Dutch/domain values such as `liter`, `gram`, `fles`, `blik`.

## DTOs

```ts
type BrandDto = {
  id: string
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
  amount: string // canonical decimal string, e.g. "1.5"
  unitType: UnitTypeDto
}

type ProductPackageDto = {
  id: number
  packageType: PackageTypeDto
  unitContent: UnitContentDto
  unitsPerPackage: number
}

type ProductCreatedDto = {
  id: string
  name: string
  category: CategoryDto
  brand: BrandDto | null
  package: ProductPackageDto
}
```

No `displayName` or package preview string is returned. The frontend builds display strings from canonical response data.

## Categories

### `GET /categories`

Returns the complete category list as a flat tree source. The client builds the tree and breadcrumbs from `id` and `parentId`.

Response `200 OK`:

```json
[
  { "id": 1, "name": "Voeding & drinken", "parentId": null },
  { "id": 2, "name": "Dranken", "parentId": 1 },
  { "id": 3, "name": "Frisdrank", "parentId": 2 },
  { "id": 4, "name": "Cola", "parentId": 3 }
]
```

Rules:

- Empty list is allowed: `200 OK []`.
- Items are sorted alphabetically by `name`, case-insensitive, within each sibling group. Root categories are sorted the same way.
- `parentId` is always present and is `null` for root categories.
- No `path` field is returned.

### `POST /categories`

Creates one category node. Used from the category tree/picker, not inline inside `POST /products`.

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

Validation/errors:

- `400 VALIDATION_ERROR` when `name` is missing or empty after trim.
- `400 REFERENCE_NOT_FOUND` when `parentId` is provided and does not exist.
- `409 CATEGORY_ALREADY_EXISTS` when a sibling with the same name already exists case-insensitively after trim. This also applies to root categories.

Create-category only creates a new node, so category cycles are not relevant in this endpoint.

## Brands

### `GET /brands?query=...`

Autocomplete search for brands.

Rules:

- `query` is optional.
- Query is trimmed.
- Missing, empty, or one-character query returns `200 OK []`.
- Search is case-insensitive contains search.
- Maximum 10 results.
- Results are sorted alphabetically by name, case-insensitive. Relevance ranking can be added later.

Example:

```http
GET /brands?query=co
```

Response `200 OK`:

```json
[
  { "id": "7b8c4d5e-0000-0000-0000-000000000001", "name": "Coca-Cola" }
]
```

### `POST /brands`

Find-or-create brand. Used when the brand autocomplete offers `+ Merk aanmaken`.

Request:

```json
{ "name": "Coca-Cola" }
```

Responses:

- `201 Created` when a new brand was created.
- `200 OK` when an existing brand was found and returned.

```json
{ "id": "7b8c4d5e-0000-0000-0000-000000000001", "name": "Coca-Cola" }
```

Rules:

- `name` is trimmed before validation/storage.
- Empty name after trim returns `400 VALIDATION_ERROR`.
- Duplicate detection is case-insensitive after trim.
- Existing brand display name is preserved. Creating `coca-cola` returns existing `Coca-Cola` without renaming it.
- No punctuation, hyphen, or internal whitespace normalization in MVP.
- Response shape matches `BrandDto`.
- No extra `created` boolean; status code indicates whether it was created or reused.

## Unit types

### `GET /unit-types`

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
- Shape is `{ id, name }`.

## Package types

### `GET /package-types`

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
- Shape is `{ id, name }`.

## Products

### `POST /products`

Creates a product with exactly one initial package.

Request:

```json
{
  "name": "Zero Sugar",
  "categoryId": 4,
  "brandId": "7b8c4d5e-0000-0000-0000-000000000001",
  "package": {
    "packageTypeId": 2,
    "amount": "1.5",
    "unitTypeId": 2,
    "unitsPerPackage": 1
  }
}
```

`brandId` may be omitted or explicitly set to `null`.

Request rules:

- `name` is required, trimmed, and must not be empty after trim.
- `categoryId` is required and must reference an existing category.
- `brandId`, when provided and non-null, must reference an existing brand.
- `package` is required and must be an object, not an array.
- `package.packageTypeId` is required and must reference an existing package type.
- `package.unitTypeId` is required and must reference an existing unit type.
- `package.amount` is required and must be a positive decimal string using `.`, e.g. `"1.5"`. `"0"` and negative values are invalid. Numeric-equivalent values such as `"1.50"` are canonicalized before `unit_content` lookup/storage.
- `package.unitsPerPackage` is required and must be an integer `>= 1`.

Response `201 Created`:

```json
{
  "id": "0a1b2c3d-0000-0000-0000-000000000001",
  "name": "Zero Sugar",
  "category": { "id": 4, "name": "Cola", "parentId": 3 },
  "brand": { "id": "7b8c4d5e-0000-0000-0000-000000000001", "name": "Coca-Cola" },
  "package": {
    "id": 123,
    "packageType": { "id": 2, "name": "fles" },
    "unitContent": {
      "id": 456,
      "amount": "1.5",
      "unitType": { "id": 2, "name": "liter" }
    },
    "unitsPerPackage": 1
  }
}
```

For products without brand, the `brand` field is present as `null`.

Transaction behavior:

- `POST /products` is atomic.
- The backend find-or-creates `unit_content` for `(unitTypeId, amount)`.
- The backend then creates `product` and the initial `product_package` using the resulting `unit_content.id`.
- These database operations run in one transaction.
- If any step fails, no new `product`, `product_package`, or request-created `unit_content` remains.
- Existing matching `unit_content` is reused and never causes a conflict.
- Concurrent attempts to create the same `unit_content` must rely on the database unique constraint and reuse the existing row.

Duplicate product behavior:

- Duplicate products are rejected with `409 PRODUCT_ALREADY_EXISTS`.
- No product or package is created on duplicate.
- Existing product ID should be included when cheaply available.

Example conflict:

```json
{
  "code": "PRODUCT_ALREADY_EXISTS",
  "message": "Product already exists",
  "existingProductId": "0a1b2c3d-0000-0000-0000-000000000001"
}
```

Duplicate rule:

- With brand: unique by `(brandId, categoryId, lower(trim(name)))`.
- Without brand: unique by `(categoryId, lower(trim(name)))` where `brandId IS NULL`.

Errors:

- `400 VALIDATION_ERROR` for missing/invalid fields, unknown fields, or wrong shapes.
- `400 REFERENCE_NOT_FOUND` for non-existing `categoryId`, `brandId`, `packageTypeId`, or `unitTypeId`.
- `409 PRODUCT_ALREADY_EXISTS` for duplicate product.

No `Location` header is required for this MVP, because product details are outside this endpoint slice.
