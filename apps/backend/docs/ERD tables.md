```yaml
location
    id: int PK autoincrement
    parent_id: int FK 
    name: text NOT NULL
    UNIQUE (parent_id, name)

brand
    id: uuid PK 
    name: text unique NOT NULL

product_type 
    id: uuid PK 
    name: text unique NOT NULL

unit_type
    id: int PK autoincrement
    name: text unique NOT NULL

unit_content
    id: int PK autoincrement
    unit_type_id: int FK NOT NULL
    amount: float NOT NULL
    UNIQUE (unit_type_id, amount)

macro_nutrients
    id: uuid PK 
    product_variant_id: uuid FK NOT NULL
    unit_content_id: int FK NOT NULL
    total_fat: float
    unsaturated_fat: float
    saturated_fat: float
    total_carbs: float
    sugars: float
    fibre: float
    protein: float

product
    id: uuid PK
    name: text NOT NULL
    product_type_id: uuid FK NOT NULL
    brand_id: uuid FK

product_variant
    id: uuid PK 
    product_id: uuid FK NOT NULL
    name: text NOT NULL

packaging_type
    id: int PK autoincrement
    name: text UNIQUE NOT NULL

product_sku
    id: uuid PK
    product_variant_id: int FK NOT NULL
    unit_content_id: int FK NOT NULL
    packaging_type_id: int FK NOT NULL
    units_per_package: int NOT NULL DEFAULT 1
    barcode: text UNIQUE

storage_record
    id: uuid PK
    product_sku_id: uuid FK NOT NULL
    location_id: int FK NOT NULL
    quantity: int NOT NULL
    expiration_date: date
```