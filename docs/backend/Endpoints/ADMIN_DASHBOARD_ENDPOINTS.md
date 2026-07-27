# Admin dashboard endpoints — product aanmaken vertical slice

Dit document is het HTTP-contract voor de huidige product-aanmaak vertical slice. Functionele UI- en productregels staan in:

- `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md`
- `docs/specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md`

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
- `CATEGORY_ALREADY_EXISTS`
- `CATEGORY_HAS_CHILDREN`
- `CATEGORY_HAS_PRODUCTS`
- `PRODUCT_ALREADY_EXISTS`

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
  amount: string
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
  { "id": "7b8c4d5e-0000-0000-0000-000000000001", "name": "Coca-Cola" }
]
```

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
{ "id": "7b8c4d5e-0000-0000-0000-000000000001", "name": "Coca-Cola" }
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

## `POST /products`

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

Errors:

- `400 VALIDATION_ERROR` for missing/invalid fields, unknown fields, or wrong shapes.
- `400 REFERENCE_NOT_FOUND` for non-existing `categoryId`, `brandId`, `packageTypeId`, or `unitTypeId`.
- `409 PRODUCT_ALREADY_EXISTS` for duplicate product.

Example conflict:

```json
{
  "code": "PRODUCT_ALREADY_EXISTS",
  "message": "Product already exists",
  "existingProductId": "0a1b2c3d-0000-0000-0000-000000000001"
}
```

No `Location` header is required for this slice.
