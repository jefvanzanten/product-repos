# Calorie Tracker ERD

<!--
Documentatieregel: houd ERD's beperkt tot persistente tabellen, relaties en harde databaseconstraints.
Domeinregels, UI-gedrag, endpointcontracten en rationale horen in specs of domeindocs; verwijs hier alleen kort wanneer dat nodig is.
-->

Dit document beschrijft de persistente gegevens voor voedingswaarden, persoonlijke doelen, gerechten en consumptielogs. Domeinregels staan in [calorie-tracker-domeinregels.md](../../domein/calorie-tracker-domeinregels.md). Product-, verpakkings- en eenheidsgegevens komen uit de gedeelde productcatalogus in [PRODUCT_ERD.md](./PRODUCT_ERD.md).

## Tabellen

```yaml
product_macro_profile
    product_id: uuid PK FK -> product.id
    reference_basis: enum(PER_100_G, PER_100_ML, PER_UNIT) NOT NULL
    calories_kcal: decimal NULL
    protein_g: decimal NULL
    carbohydrates_g: decimal NULL
    fat_g: decimal NULL
    calories_source: enum(AUTOMATIC, MANUAL) NULL
    created_at: timestamp with time zone NOT NULL
    updated_at: timestamp with time zone NOT NULL

    CHECK (calories_kcal IS NULL OR calories_kcal >= 0)
    CHECK (protein_g IS NULL OR protein_g >= 0)
    CHECK (carbohydrates_g IS NULL OR carbohydrates_g >= 0)
    CHECK (fat_g IS NULL OR fat_g >= 0)

    # At least one stored nutritional value must be greater than zero.
    CHECK (
        COALESCE(calories_kcal, 0) > 0 OR
        COALESCE(protein_g, 0) > 0 OR
        COALESCE(carbohydrates_g, 0) > 0 OR
        COALESCE(fat_g, 0) > 0
    )

    # A calorie source exists exactly when calories are stored.
    CHECK (
        (calories_kcal IS NULL AND calories_source IS NULL) OR
        (calories_kcal IS NOT NULL AND calories_source IS NOT NULL)
    )

dish
    id: uuid PK
    user_id: uuid FK -> user.id NOT NULL
    name: text NOT NULL
    image_url: text NULL

    created_at: timestamp with time zone NOT NULL
    updated_at: timestamp with time zone NOT NULL
    deleted_at: timestamp with time zone NULL

    # Name is unique per user among non-deleted dishes, case-insensitive after trim.
    UNIQUE INDEX (user_id, lower(trim(name))) WHERE deleted_at IS NULL

dish_version
    id: uuid PK
    dish_id: uuid FK -> dish.id NOT NULL
    servings: decimal NOT NULL
    created_at: timestamp with time zone NOT NULL

    CHECK (servings > 0)

    # Versions are immutable; they are never updated or deleted so pinned
    # consumption logs remain readable and computable.

dish_ingredient
    id: uuid PK
    dish_version_id: uuid FK -> dish_version.id NOT NULL

    product_package_id: int FK -> product_package.id NOT NULL

    quantity: decimal NOT NULL
    input_mode: enum(PACKAGE, INDIVIDUAL_UNIT, CONTENT_UNIT) NOT NULL
    input_unit_type_id: int FK -> unit_type.id NULL

    CHECK (quantity > 0)

    CHECK (
        (input_mode = CONTENT_UNIT AND input_unit_type_id IS NOT NULL)
        OR
        (input_mode IN (PACKAGE, INDIVIDUAL_UNIT) AND input_unit_type_id IS NULL)
    )

    # A version has at least one ingredient (enforced in the dish service).

product_consumption
    consumption_log_id: uuid PK
        FK -> consumption_log.id
        ON DELETE CASCADE

    product_package_id: int FK NOT NULL
    quantity: decimal NOT NULL
    input_mode: enum(...) NOT NULL
    input_unit_type_id: int FK NULL

dish_consumption
    consumption_log_id: uuid PK
        FK -> consumption_log.id
        ON DELETE CASCADE

    # Pins the exact recipe version consumed; history never changes when the dish is edited.
    dish_version_id: uuid FK -> dish_version.id NOT NULL
    quantity: decimal NOT NULL

    CHECK (quantity > 0)

consumption_log
    id: uuid PK
    user_id: uuid FK -> user.id NOT NULL
    type: enum (PRODUCT, DISH) NOT NULL
    consumed_at: timestamp with time zone NOT NULL
    timezone: text NOT NULL
    created_at: timestamp with time zone NOT NULL
    updated_at: timestamp with time zone NOT NULL
    deleted_at: timestamp with time zone NULL

    INDEX (user_id, consumed_at)
    INDEX (deleted_at) WHERE deleted_at IS NOT NULL

user_nutrition_goal
    user_id: uuid PK FK -> user.id
    calories_kcal: int NULL
    protein_g: decimal NULL
    carbohydrates_g: decimal NULL
    fat_g: decimal NULL
    created_at: timestamp with time zone NOT NULL
    updated_at: timestamp with time zone NOT NULL

    CHECK (calories_kcal IS NULL OR calories_kcal > 0)
    CHECK (protein_g IS NULL OR protein_g > 0)
    CHECK (carbohydrates_g IS NULL OR carbohydrates_g > 0)
    CHECK (fat_g IS NULL OR fat_g > 0)
```

## Relaties

```mermaid
erDiagram
    USER ||--o{ CONSUMPTION_LOG : owns
    USER ||--o| USER_NUTRITION_GOAL : sets
    USER ||--o{ DISH : owns
    PRODUCT ||--o| PRODUCT_MACRO_PROFILE : has
    PRODUCT ||--|{ PRODUCT_PACKAGE : has
    PRODUCT_PACKAGE ||--o{ PRODUCT_CONSUMPTION : referenced_by
    UNIT_TYPE ||--o{ PRODUCT_CONSUMPTION : selected_for_content_input
    DISH ||--|{ DISH_VERSION : versioned_as
    DISH_VERSION ||--|{ DISH_INGREDIENT : composed_of
    DISH_VERSION ||--o{ DISH_CONSUMPTION : pinned_by
    PRODUCT_PACKAGE ||--o{ DISH_INGREDIENT : referenced_by
    UNIT_TYPE ||--o{ DISH_INGREDIENT : selected_for_content_input
    CONSUMPTION_LOG ||--o| PRODUCT_CONSUMPTION : detailed_by
    CONSUMPTION_LOG ||--o| DISH_CONSUMPTION : detailed_by
```

## Catalogusafhankelijkheden

De catalogustabellen staan in [PRODUCT_ERD.md](./PRODUCT_ERD.md). Gedeelde regels voor selecteerbaarheid, eenheden, macroprofielen en cataloguscorrecties staan in [productcatalogus-domeinregels.md](../../domein/productcatalogus-domeinregels.md).

## Domeinregels

Berekeningen, lokale kalenderdagen, retrygedrag en bewaarbeleid staan in [calorie-tracker-domeinregels.md](../../domein/calorie-tracker-domeinregels.md).
