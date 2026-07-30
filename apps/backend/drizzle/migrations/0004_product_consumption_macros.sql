PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE unit_type_new (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  dimension text NOT NULL CHECK (dimension IN ('MASS', 'VOLUME', 'COUNT')),
  conversion_to_base real NOT NULL CHECK (conversion_to_base > 0)
);
--> statement-breakpoint
WITH normalized_unit_type AS (
  SELECT
    id,
    CASE lower(trim(name))
      WHEN 'g' THEN 'gram'
      WHEN 'kg' THEN 'kilogram'
      WHEN 'ml' THEN 'milliliter'
      WHEN 'cl' THEN 'centiliter'
      WHEN 'l' THEN 'liter'
      ELSE lower(trim(name))
    END AS name,
    CASE lower(trim(name))
      WHEN 'g' THEN 'g'
      WHEN 'gram' THEN 'g'
      WHEN 'kg' THEN 'kg'
      WHEN 'kilogram' THEN 'kg'
      WHEN 'ml' THEN 'ml'
      WHEN 'milliliter' THEN 'ml'
      WHEN 'cl' THEN 'cl'
      WHEN 'centiliter' THEN 'cl'
      WHEN 'l' THEN 'l'
      WHEN 'liter' THEN 'l'
      WHEN 'stuk' THEN 'st'
      ELSE lower(replace(trim(name), ' ', '_'))
    END AS symbol,
    CASE lower(trim(name))
      WHEN 'g' THEN 'MASS'
      WHEN 'gram' THEN 'MASS'
      WHEN 'kg' THEN 'MASS'
      WHEN 'kilogram' THEN 'MASS'
      WHEN 'ml' THEN 'VOLUME'
      WHEN 'milliliter' THEN 'VOLUME'
      WHEN 'cl' THEN 'VOLUME'
      WHEN 'centiliter' THEN 'VOLUME'
      WHEN 'l' THEN 'VOLUME'
      WHEN 'liter' THEN 'VOLUME'
      ELSE 'COUNT'
    END AS dimension,
    CASE lower(trim(name))
      WHEN 'kg' THEN 1000
      WHEN 'kilogram' THEN 1000
      WHEN 'cl' THEN 10
      WHEN 'centiliter' THEN 10
      WHEN 'l' THEN 1000
      WHEN 'liter' THEN 1000
      ELSE 1
    END AS conversion_to_base
  FROM unit_type
)
INSERT INTO unit_type_new (id, name, symbol, dimension, conversion_to_base)
SELECT min(id), name, symbol, dimension, conversion_to_base
FROM normalized_unit_type
GROUP BY name, symbol, dimension, conversion_to_base;
--> statement-breakpoint
UPDATE unit_content
SET unit_type_id = (
  SELECT unit_type_new.id
  FROM unit_type
  INNER JOIN unit_type_new ON unit_type_new.symbol = CASE lower(trim(unit_type.name))
    WHEN 'g' THEN 'g'
    WHEN 'gram' THEN 'g'
    WHEN 'kg' THEN 'kg'
    WHEN 'kilogram' THEN 'kg'
    WHEN 'ml' THEN 'ml'
    WHEN 'milliliter' THEN 'ml'
    WHEN 'cl' THEN 'cl'
    WHEN 'centiliter' THEN 'cl'
    WHEN 'l' THEN 'l'
    WHEN 'liter' THEN 'l'
    WHEN 'stuk' THEN 'st'
    ELSE lower(replace(trim(unit_type.name), ' ', '_'))
  END
  WHERE unit_type.id = unit_content.unit_type_id
);
--> statement-breakpoint
DROP TABLE unit_type;
--> statement-breakpoint
ALTER TABLE unit_type_new RENAME TO unit_type;
--> statement-breakpoint
CREATE UNIQUE INDEX unit_type_name_normalized_unique ON unit_type (lower(trim(name)));
--> statement-breakpoint
CREATE UNIQUE INDEX unit_type_symbol_normalized_unique ON unit_type (lower(trim(symbol)));
--> statement-breakpoint
CREATE TABLE product_new (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  category_id integer NOT NULL REFERENCES category(id),
  brand_id text REFERENCES brand(id),
  consumption_type text NOT NULL CHECK (consumption_type IN ('FOOD', 'DRINK', 'SUPPLEMENT'))
);
--> statement-breakpoint
WITH RECURSIVE category_roots(id, root_name) AS (
  SELECT id, name FROM category WHERE parent_id IS NULL
  UNION ALL
  SELECT child.id, category_roots.root_name
  FROM category child
  INNER JOIN category_roots ON child.parent_id = category_roots.id
)
INSERT INTO product_new (id, name, category_id, brand_id, consumption_type)
SELECT
  product.id,
  product.name,
  product.category_id,
  product.brand_id,
  CASE lower(trim(category_roots.root_name))
    WHEN 'dranken' THEN 'DRINK'
    WHEN 'drinken' THEN 'DRINK'
    WHEN 'supplementen' THEN 'SUPPLEMENT'
    ELSE 'FOOD'
  END
FROM product
LEFT JOIN category_roots ON category_roots.id = product.category_id;
--> statement-breakpoint
DROP TABLE product;
--> statement-breakpoint
ALTER TABLE product_new RENAME TO product;
--> statement-breakpoint
CREATE UNIQUE INDEX product_brand_name_unique ON product (brand_id, category_id, lower(trim(name))) WHERE brand_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX product_no_brand_name_unique ON product (category_id, lower(trim(name))) WHERE brand_id IS NULL;
--> statement-breakpoint
CREATE TABLE product_macro_profile (
  product_id text PRIMARY KEY NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  reference_basis text NOT NULL CHECK (reference_basis IN ('PER_100_G', 'PER_100_ML', 'PER_UNIT')),
  calories_kcal real,
  protein_g real,
  carbohydrates_g real,
  fat_g real,
  calories_source text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (calories_kcal IS NULL OR calories_kcal >= 0),
  CHECK (protein_g IS NULL OR protein_g >= 0),
  CHECK (carbohydrates_g IS NULL OR carbohydrates_g >= 0),
  CHECK (fat_g IS NULL OR fat_g >= 0),
  CHECK (
    coalesce(calories_kcal, 0) > 0 OR
    coalesce(protein_g, 0) > 0 OR
    coalesce(carbohydrates_g, 0) > 0 OR
    coalesce(fat_g, 0) > 0
  ),
  CHECK (
    (calories_kcal IS NULL AND calories_source IS NULL) OR
    (calories_kcal IS NOT NULL AND calories_source IN ('AUTOMATIC', 'MANUAL'))
  )
);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
