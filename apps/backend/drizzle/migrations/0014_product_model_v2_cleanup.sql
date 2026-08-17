PRAGMA foreign_keys=OFF;
--> statement-breakpoint
DROP VIEW IF EXISTS product_model_v2_migration_audit;
--> statement-breakpoint
DROP VIEW IF EXISTS product_model_v2_invariants;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_product_insert_v2;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_product_update_v2;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_macro_insert_v2;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_macro_update_v2;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_macro_delete_v2;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_package_insert_v2;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_package_update_v2;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_portion_insert_v2;
--> statement-breakpoint
DROP TRIGGER IF EXISTS legacy_portion_delete_v2;
--> statement-breakpoint
CREATE TABLE product_consumption_v2_final (
  consumption_log_id text PRIMARY KEY NOT NULL REFERENCES consumption_log(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES concrete_product(id),
  quantity text NOT NULL CHECK (CAST(quantity AS REAL) > 0),
  input_mode text NOT NULL CHECK (input_mode IN ('FULL_PRODUCT', 'PRODUCT_PORTION', 'CONTENT_UNIT')),
  input_unit_type_id integer REFERENCES unit_type(id),
  CHECK ((input_mode = 'CONTENT_UNIT' AND input_unit_type_id IS NOT NULL) OR (input_mode IN ('FULL_PRODUCT', 'PRODUCT_PORTION') AND input_unit_type_id IS NULL))
);
--> statement-breakpoint
INSERT INTO product_consumption_v2_final (consumption_log_id, product_id, quantity, input_mode, input_unit_type_id)
SELECT consumption_log_id, product_id, quantity, input_mode, input_unit_type_id FROM product_consumption;
--> statement-breakpoint
DROP TABLE product_consumption;
--> statement-breakpoint
ALTER TABLE product_consumption_v2_final RENAME TO product_consumption;
--> statement-breakpoint
CREATE INDEX product_consumption_product_idx ON product_consumption (product_id);
--> statement-breakpoint
CREATE TABLE dish_ingredient_v2_final (
  id text PRIMARY KEY NOT NULL,
  dish_version_id text NOT NULL REFERENCES dish_version(id),
  product_id text NOT NULL REFERENCES concrete_product(id),
  quantity text NOT NULL CHECK (CAST(quantity AS REAL) > 0),
  input_mode text NOT NULL CHECK (input_mode IN ('FULL_PRODUCT', 'PRODUCT_PORTION', 'CONTENT_UNIT')),
  input_unit_type_id integer REFERENCES unit_type(id),
  CHECK ((input_mode = 'CONTENT_UNIT' AND input_unit_type_id IS NOT NULL) OR (input_mode IN ('FULL_PRODUCT', 'PRODUCT_PORTION') AND input_unit_type_id IS NULL))
);
--> statement-breakpoint
INSERT INTO dish_ingredient_v2_final (id, dish_version_id, product_id, quantity, input_mode, input_unit_type_id)
SELECT id, dish_version_id, product_id, quantity, input_mode, input_unit_type_id FROM dish_ingredient;
--> statement-breakpoint
DROP TABLE dish_ingredient;
--> statement-breakpoint
ALTER TABLE dish_ingredient_v2_final RENAME TO dish_ingredient;
--> statement-breakpoint
CREATE INDEX dish_ingredient_version_idx ON dish_ingredient (dish_version_id);
--> statement-breakpoint
CREATE INDEX dish_ingredient_product_idx ON dish_ingredient (product_id);
--> statement-breakpoint
DROP TABLE IF EXISTS inventory_mutation;
--> statement-breakpoint
DROP TABLE IF EXISTS inventory_item;
--> statement-breakpoint
DROP TABLE IF EXISTS legacy_product_composition_override;
--> statement-breakpoint
DROP TABLE IF EXISTS legacy_product_package_map;
--> statement-breakpoint
DROP TABLE IF EXISTS product_package_portion;
--> statement-breakpoint
DROP TABLE IF EXISTS product_package;
--> statement-breakpoint
DROP TABLE IF EXISTS product_sku;
--> statement-breakpoint
DROP TABLE IF EXISTS product_variant;
--> statement-breakpoint
DROP TABLE IF EXISTS product_macro_profile;
--> statement-breakpoint
ALTER TABLE product RENAME TO legacy_product_v1;
--> statement-breakpoint
ALTER TABLE concrete_product RENAME TO product;
--> statement-breakpoint
DROP INDEX IF EXISTS concrete_product_barcode_unique;
--> statement-breakpoint
DROP INDEX IF EXISTS concrete_product_composition_package_content_unique;
--> statement-breakpoint
DROP INDEX IF EXISTS concrete_product_composition_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX product_barcode_unique ON product (barcode) WHERE barcode IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX product_composition_package_content_unique ON product (product_composition_id, package_type_id, unit_content_id) WHERE package_type_id IS NOT NULL AND unit_content_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX product_composition_idx ON product (product_composition_id);
--> statement-breakpoint
DROP TABLE legacy_product_v1;
--> statement-breakpoint
ALTER TABLE product_composition_macro_profile RENAME TO product_macro_profile;
--> statement-breakpoint
DROP INDEX IF EXISTS package_type_name_normalized_unique;
--> statement-breakpoint
DROP INDEX IF EXISTS packaging_type_name_unique;
--> statement-breakpoint
ALTER TABLE package_type DROP COLUMN name;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
PRAGMA foreign_key_check;
