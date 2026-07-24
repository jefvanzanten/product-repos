```yaml
location
    id: int PK autoincrement
    parent_id: int FK
    name: text NOT NULL
    UNIQUE (parent_id, name)

storage_record
    id: uuid PK
    product_sku_id: uuid FK NOT NULL
    location_id: int FK NOT NULL
    quantity: int NOT NULL
    expiration_date: date
```
