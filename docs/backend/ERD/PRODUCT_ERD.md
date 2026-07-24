```yaml
brand
    id: uuid PK
    name: text NOT NULL

    # Preserve original display name, but prevent case/trim duplicates.
    UNIQUE (lower(trim(name)))

category
    id: int PK
    parent_id: int FK
    name: text NOT NULL

    # Category names are unique among siblings, case-insensitive after trim.
    # Implement with database-specific partial/expression indexes so nullable
    # parent_id behaves correctly.
    UNIQUE (parent_id, lower(trim(name))) WHERE parent_id IS NOT NULL
    UNIQUE (lower(trim(name))) WHERE parent_id IS NULL

unit_type
    id: int PK autoincrement
    name: text NOT NULL

    # Seeded/admin-managed reference data.
    UNIQUE (lower(trim(name)))

unit_content
    id: int PK autoincrement
    unit_type_id: int FK NOT NULL
    amount: decimal NOT NULL

    # Decimal values are canonicalized before insert/find-or-create, so
    # 1.5, 1.50, and 01.500 refer to the same content amount.
    UNIQUE (unit_type_id, amount)

package_type
    id: int PK autoincrement
    name: text NOT NULL

    # Seeded/admin-managed reference data.
    UNIQUE (lower(trim(name)))

product_package
    id: int PK
    product_id: uuid FK NOT NULL
    unit_content_id: int FK NOT NULL
    package_type_id: int FK NOT NULL
    units_per_package: int NOT NULL default 1

    UNIQUE (
        product_id,
        package_type_id,
        unit_content_id,
        units_per_package
    )

product
    id: uuid PK
    name: text NOT NULL
    category_id: int FK NOT NULL
    brand_id: uuid FK

    # Product display name is preserved, but duplicate detection uses
    # lower(trim(name)). Implement with database-specific partial/expression
    # indexes so nullable brand_id behaves correctly.
    UNIQUE (brand_id, category_id, lower(trim(name))) WHERE brand_id IS NOT NULL
    UNIQUE (category_id, lower(trim(name))) WHERE brand_id IS NULL
```
