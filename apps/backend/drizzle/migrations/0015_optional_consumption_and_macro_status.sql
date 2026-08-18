PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TEMP TABLE product_composition_migration_count (
  expected_count integer NOT NULL,
  actual_count integer NOT NULL,
  CHECK (expected_count = actual_count)
);
--> statement-breakpoint
CREATE TABLE product_composition_optional_consumption (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  category_id integer NOT NULL REFERENCES category(id),
  brand_id text REFERENCES brand(id),
  consumption_type text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_composition_consumption_type_valid CHECK (consumption_type IS NULL OR consumption_type IN ('FOOD', 'DRINK', 'SUPPLEMENT'))
);
--> statement-breakpoint
INSERT INTO product_composition_optional_consumption (id, name, category_id, brand_id, consumption_type, created_at, updated_at)
SELECT id, name, category_id, brand_id, consumption_type, created_at, updated_at FROM product_composition;
--> statement-breakpoint
INSERT INTO product_composition_migration_count (expected_count, actual_count)
SELECT (SELECT count(*) FROM product_composition), (SELECT count(*) FROM product_composition_optional_consumption);
--> statement-breakpoint
DROP TABLE product_composition;
--> statement-breakpoint
ALTER TABLE product_composition_optional_consumption RENAME TO product_composition;
--> statement-breakpoint
CREATE UNIQUE INDEX product_composition_brand_name_unique ON product_composition (brand_id, category_id, lower(trim(name))) WHERE brand_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX product_composition_no_brand_name_unique ON product_composition (category_id, lower(trim(name))) WHERE brand_id IS NULL;
--> statement-breakpoint
ALTER TABLE product_macro_profile ADD COLUMN is_active integer NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1));
--> statement-breakpoint
CREATE TEMP TABLE product_composition_foreign_key_check (
  violation_count integer NOT NULL CHECK (violation_count = 0)
);
--> statement-breakpoint
INSERT INTO product_composition_foreign_key_check (violation_count)
SELECT count(*) FROM pragma_foreign_key_check;
--> statement-breakpoint
DROP TABLE product_composition_foreign_key_check;
--> statement-breakpoint
DROP TABLE product_composition_migration_count;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
PRAGMA foreign_key_check;
