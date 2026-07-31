PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE unit_type_aligned (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  dimension text NOT NULL CHECK (dimension IN ('MASS', 'VOLUME', 'COUNT')),
  conversion_to_base text NOT NULL CHECK (CAST(conversion_to_base AS REAL) > 0)
);
--> statement-breakpoint
INSERT INTO unit_type_aligned (id, name, symbol, dimension, conversion_to_base)
SELECT id, name, symbol, dimension, CAST(conversion_to_base AS TEXT) FROM unit_type;
--> statement-breakpoint
DROP TABLE unit_type;
--> statement-breakpoint
ALTER TABLE unit_type_aligned RENAME TO unit_type;
--> statement-breakpoint
CREATE UNIQUE INDEX unit_type_name_normalized_unique ON unit_type (lower(trim(name)));
--> statement-breakpoint
CREATE UNIQUE INDEX unit_type_symbol_normalized_unique ON unit_type (lower(trim(symbol)));
--> statement-breakpoint
CREATE TABLE unit_content_aligned (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  unit_type_id integer NOT NULL REFERENCES unit_type(id),
  amount text NOT NULL CHECK (CAST(amount AS REAL) > 0)
);
--> statement-breakpoint
INSERT INTO unit_content_aligned (id, unit_type_id, amount)
SELECT id, unit_type_id, CAST(amount AS TEXT) FROM unit_content;
--> statement-breakpoint
DROP TABLE unit_content;
--> statement-breakpoint
ALTER TABLE unit_content_aligned RENAME TO unit_content;
--> statement-breakpoint
CREATE UNIQUE INDEX unit_content_unit_type_id_amount_unique ON unit_content (unit_type_id, amount);
--> statement-breakpoint
CREATE TABLE product_aligned (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  category_id integer NOT NULL REFERENCES category(id),
  brand_id text REFERENCES brand(id),
  consumption_type text NOT NULL CHECK (consumption_type IN ('FOOD', 'DRINK', 'SUPPLEMENT')),
  archived_at text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO product_aligned (id, name, category_id, brand_id, consumption_type, archived_at, created_at, updated_at)
SELECT id, name, category_id, brand_id, consumption_type, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM product;
--> statement-breakpoint
DROP TABLE product;
--> statement-breakpoint
ALTER TABLE product_aligned RENAME TO product;
--> statement-breakpoint
CREATE UNIQUE INDEX product_brand_name_unique ON product (brand_id, category_id, lower(trim(name))) WHERE brand_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX product_no_brand_name_unique ON product (category_id, lower(trim(name))) WHERE brand_id IS NULL;
--> statement-breakpoint
CREATE TABLE product_package_aligned (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  product_id text NOT NULL REFERENCES product(id),
  unit_content_id integer NOT NULL REFERENCES unit_content(id),
  package_type_id integer NOT NULL REFERENCES package_type(id),
  individual_package_type_id integer REFERENCES package_type(id),
  units_per_package integer NOT NULL DEFAULT 1 CHECK (units_per_package > 0),
  archived_at text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((units_per_package = 1 AND individual_package_type_id IS NULL) OR (units_per_package > 1 AND individual_package_type_id IS NOT NULL))
);
--> statement-breakpoint
-- Legacy rows do not contain an individual package type. Preserve them with an explicit correction marker instead of guessing that the outer type is also the individual type.
INSERT INTO package_type (name)
SELECT 'Individueel type controleren'
WHERE EXISTS (SELECT 1 FROM product_package WHERE units_per_package > 1)
  AND NOT EXISTS (SELECT 1 FROM package_type WHERE lower(trim(name)) = lower('Individueel type controleren'));
--> statement-breakpoint
INSERT INTO product_package_aligned (id, product_id, unit_content_id, package_type_id, individual_package_type_id, units_per_package, archived_at, created_at, updated_at)
SELECT id, product_id, unit_content_id, package_type_id,
  CASE WHEN units_per_package > 1 THEN (SELECT id FROM package_type WHERE lower(trim(name)) = lower('Individueel type controleren') LIMIT 1) ELSE NULL END,
  units_per_package, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM product_package;
--> statement-breakpoint
DROP TABLE product_package;
--> statement-breakpoint
ALTER TABLE product_package_aligned RENAME TO product_package;
--> statement-breakpoint
CREATE UNIQUE INDEX product_package_with_individual_unique ON product_package (product_id, package_type_id, unit_content_id, units_per_package, individual_package_type_id) WHERE individual_package_type_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX product_package_without_individual_unique ON product_package (product_id, package_type_id, unit_content_id, units_per_package) WHERE individual_package_type_id IS NULL;
--> statement-breakpoint
CREATE INDEX product_package_product_idx ON product_package (product_id);
--> statement-breakpoint
CREATE TABLE product_macro_profile_aligned (
  product_id text PRIMARY KEY NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  reference_basis text NOT NULL CHECK (reference_basis IN ('PER_100_G', 'PER_100_ML', 'PER_UNIT')),
  calories_kcal text,
  protein_g text,
  carbohydrates_g text,
  fat_g text,
  calories_source text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (calories_kcal IS NULL OR CAST(calories_kcal AS REAL) >= 0),
  CHECK (protein_g IS NULL OR CAST(protein_g AS REAL) >= 0),
  CHECK (carbohydrates_g IS NULL OR CAST(carbohydrates_g AS REAL) >= 0),
  CHECK (fat_g IS NULL OR CAST(fat_g AS REAL) >= 0),
  CHECK (coalesce(CAST(calories_kcal AS REAL), 0) > 0 OR coalesce(CAST(protein_g AS REAL), 0) > 0 OR coalesce(CAST(carbohydrates_g AS REAL), 0) > 0 OR coalesce(CAST(fat_g AS REAL), 0) > 0),
  CHECK ((calories_kcal IS NULL AND calories_source IS NULL) OR (calories_kcal IS NOT NULL AND calories_source IN ('AUTOMATIC', 'MANUAL')))
);
--> statement-breakpoint
INSERT INTO product_macro_profile_aligned (product_id, reference_basis, calories_kcal, protein_g, carbohydrates_g, fat_g, calories_source, created_at, updated_at)
SELECT product_id, reference_basis, CAST(calories_kcal AS TEXT), CAST(protein_g AS TEXT), CAST(carbohydrates_g AS TEXT), CAST(fat_g AS TEXT), calories_source, created_at, updated_at FROM product_macro_profile;
--> statement-breakpoint
DROP TABLE product_macro_profile;
--> statement-breakpoint
ALTER TABLE product_macro_profile_aligned RENAME TO product_macro_profile;
--> statement-breakpoint
DROP TABLE IF EXISTS macro_nutrients;
--> statement-breakpoint
CREATE TABLE consumption_log (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id),
  product_package_id integer NOT NULL REFERENCES product_package(id),
  quantity text NOT NULL CHECK (CAST(quantity AS REAL) > 0),
  input_mode text NOT NULL CHECK (input_mode IN ('PACKAGE', 'INDIVIDUAL_UNIT', 'CONTENT_UNIT')),
  input_unit_type_id integer REFERENCES unit_type(id),
  consumed_at text NOT NULL,
  timezone text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  deleted_at text,
  CHECK ((input_mode = 'CONTENT_UNIT' AND input_unit_type_id IS NOT NULL) OR (input_mode IN ('PACKAGE', 'INDIVIDUAL_UNIT') AND input_unit_type_id IS NULL))
);
--> statement-breakpoint
CREATE INDEX consumption_log_user_consumed_at_idx ON consumption_log (user_id, consumed_at);
--> statement-breakpoint
CREATE INDEX consumption_log_product_package_idx ON consumption_log (product_package_id);
--> statement-breakpoint
CREATE INDEX consumption_log_deleted_at_idx ON consumption_log (deleted_at) WHERE deleted_at IS NOT NULL;
--> statement-breakpoint
CREATE TABLE user_nutrition_goal (
  user_id text PRIMARY KEY NOT NULL REFERENCES user(id),
  calories_kcal integer,
  protein_g text,
  carbohydrates_g text,
  fat_g text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  CHECK (calories_kcal IS NULL OR calories_kcal > 0),
  CHECK (protein_g IS NULL OR CAST(protein_g AS REAL) > 0),
  CHECK (carbohydrates_g IS NULL OR CAST(carbohydrates_g AS REAL) > 0),
  CHECK (fat_g IS NULL OR CAST(fat_g AS REAL) > 0)
);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
