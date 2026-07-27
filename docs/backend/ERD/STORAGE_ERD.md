# Storage / inventory ERD — concept

> Status: concept. Final backend contracts for voorraad/inventory moeten nog worden uitgewerkt bij de inventory-client specs.

```yaml
location
    id: int PK autoincrement
    parent_id: int FK NULL
    name: text NOT NULL

    UNIQUE (parent_id, lower(trim(name))) WHERE parent_id IS NOT NULL
    UNIQUE (lower(trim(name))) WHERE parent_id IS NULL

inventory_item
    id: uuid PK
    product_package_id: uuid FK NOT NULL
    location_id: int FK NULL
    quantity: decimal NOT NULL
    created_at: datetime NOT NULL
    updated_at: datetime NOT NULL
```

## Open keuzes

- Of voorraad op productniveau of verpakkingniveau wordt geregistreerd. Voorlopig is `product_package_id` het meest concreet omdat verpakkingen al in de productcatalogus bestaan.
- Of mutaties als losse voorraadlog worden opgeslagen naast de actuele voorraadstand.
- Of `location_id` verplicht is bij toevoegen.
