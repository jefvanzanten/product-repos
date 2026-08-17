PRAGMA foreign_keys=OFF;
--> statement-breakpoint
ALTER TABLE package_type ADD COLUMN singular_name text;
--> statement-breakpoint
ALTER TABLE package_type ADD COLUMN plural_name text;
--> statement-breakpoint
UPDATE package_type SET
  singular_name = trim(name),
  plural_name = CASE lower(trim(name))
    WHEN 'fles' THEN 'flessen'
    WHEN 'blik' THEN 'blikken'
    WHEN 'pot' THEN 'potten'
    WHEN 'zak' THEN 'zakken'
    WHEN 'doos' THEN 'dozen'
    WHEN 'pak' THEN 'pakken'
    WHEN 'tube' THEN 'tubes'
    WHEN 'bus' THEN 'bussen'
    WHEN 'tray' THEN 'trays'
    WHEN 'multipack' THEN 'multipacks'
    WHEN 'los stuk' THEN 'losse stuks'
    WHEN 'overig' THEN 'overige'
    ELSE trim(name) || 's'
  END
WHERE singular_name IS NULL OR plural_name IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX package_type_singular_name_normalized_unique ON package_type (lower(trim(singular_name)));
--> statement-breakpoint
CREATE UNIQUE INDEX package_type_plural_name_normalized_unique ON package_type (lower(trim(plural_name)));
--> statement-breakpoint
CREATE TABLE product_composition (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  category_id integer NOT NULL REFERENCES category(id),
  brand_id text REFERENCES brand(id),
  consumption_type text NOT NULL CHECK (consumption_type IN ('FOOD', 'DRINK', 'SUPPLEMENT')),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX product_composition_brand_name_unique ON product_composition (brand_id, category_id, lower(trim(name))) WHERE brand_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX product_composition_no_brand_name_unique ON product_composition (category_id, lower(trim(name))) WHERE brand_id IS NULL;
--> statement-breakpoint
CREATE TABLE product_composition_macro_profile (
  product_composition_id text PRIMARY KEY NOT NULL REFERENCES product_composition(id) ON DELETE CASCADE,
  reference_basis text NOT NULL CHECK (reference_basis IN ('PER_100_G', 'PER_100_ML', 'PER_UNIT')),
  calories_kcal text,
  protein_g text,
  carbohydrates_g text,
  fat_g text,
  calories_source text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (coalesce(CAST(calories_kcal AS REAL), 0) > 0 OR coalesce(CAST(protein_g AS REAL), 0) > 0 OR coalesce(CAST(carbohydrates_g AS REAL), 0) > 0 OR coalesce(CAST(fat_g AS REAL), 0) > 0),
  CHECK ((calories_kcal IS NULL AND calories_source IS NULL) OR (calories_kcal IS NOT NULL AND calories_source IN ('AUTOMATIC', 'MANUAL')))
);
--> statement-breakpoint
CREATE TABLE concrete_product (
  id text PRIMARY KEY NOT NULL,
  product_composition_id text NOT NULL REFERENCES product_composition(id),
  package_type_id integer REFERENCES package_type(id),
  unit_content_id integer REFERENCES unit_content(id),
  image_url text,
  barcode text,
  archived_at text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX concrete_product_barcode_unique ON concrete_product (barcode) WHERE barcode IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX concrete_product_composition_package_content_unique ON concrete_product (product_composition_id, package_type_id, unit_content_id) WHERE package_type_id IS NOT NULL AND unit_content_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX concrete_product_composition_idx ON concrete_product (product_composition_id);
--> statement-breakpoint
CREATE TABLE product_portion (
  product_id text PRIMARY KEY NOT NULL REFERENCES concrete_product(id) ON DELETE CASCADE,
  singular_name text NOT NULL CHECK (length(trim(singular_name)) > 0),
  plural_name text NOT NULL CHECK (length(trim(plural_name)) > 0),
  unit_content_id integer NOT NULL REFERENCES unit_content(id),
  portions_per_product integer CHECK (portions_per_product IS NULL OR portions_per_product > 0)
);
--> statement-breakpoint
CREATE TABLE legacy_product_package_map (
  product_package_id integer PRIMARY KEY NOT NULL REFERENCES product_package(id),
  product_id text NOT NULL UNIQUE REFERENCES concrete_product(id),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE legacy_product_composition_override (
  product_package_id integer PRIMARY KEY NOT NULL REFERENCES product_package(id),
  product_composition_id text NOT NULL,
  name text NOT NULL,
  category_id integer NOT NULL REFERENCES category(id),
  brand_id text REFERENCES brand(id),
  consumption_type text NOT NULL CHECK (consumption_type IN ('FOOD', 'DRINK', 'SUPPLEMENT')),
  confirmed_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE VIEW product_model_v2_migration_audit AS
SELECT
  p.id AS legacy_product_id,
  p.name AS legacy_product_name,
  (SELECT COUNT(*) FROM product_package pp WHERE pp.product_id = p.id) AS package_count,
  CASE WHEN EXISTS (SELECT 1 FROM product_macro_profile pmp WHERE pmp.product_id = p.id) THEN 1 ELSE 0 END AS has_macro_profile,
  p.archived_at AS root_archived_at,
  (SELECT COUNT(*) FROM product_package pp WHERE pp.product_id = p.id AND pp.archived_at IS NOT NULL) AS archived_package_count,
  (SELECT COUNT(*) FROM product_package_portion ppp JOIN product_package pp ON pp.id = ppp.product_package_id WHERE pp.product_id = p.id) AS portion_count,
  (SELECT coalesce(SUM(ii.quantity), 0) FROM inventory_item ii JOIN product_package pp ON pp.id = ii.product_package_id WHERE pp.product_id = p.id) AS inventory_physical_item_count
FROM product p;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
