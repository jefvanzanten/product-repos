PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE product_consumption (
  consumption_log_id text PRIMARY KEY NOT NULL REFERENCES consumption_log(id) ON DELETE CASCADE,
  product_package_id integer NOT NULL REFERENCES product_package(id),
  quantity text NOT NULL CHECK (CAST(quantity AS REAL) > 0),
  input_mode text NOT NULL CHECK (input_mode IN ('PACKAGE', 'INDIVIDUAL_UNIT', 'CONTENT_UNIT')),
  input_unit_type_id integer REFERENCES unit_type(id),
  CHECK ((input_mode = 'CONTENT_UNIT' AND input_unit_type_id IS NOT NULL) OR (input_mode IN ('PACKAGE', 'INDIVIDUAL_UNIT') AND input_unit_type_id IS NULL))
);
--> statement-breakpoint
INSERT INTO product_consumption (consumption_log_id, product_package_id, quantity, input_mode, input_unit_type_id)
SELECT id, product_package_id, quantity, input_mode, input_unit_type_id FROM consumption_log;
--> statement-breakpoint
CREATE INDEX product_consumption_product_package_idx ON product_consumption (product_package_id);
--> statement-breakpoint
CREATE TABLE consumption_log_aligned (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id),
  type text NOT NULL CHECK (type IN ('PRODUCT', 'DISH')),
  consumed_at text NOT NULL,
  timezone text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  deleted_at text
);
--> statement-breakpoint
INSERT INTO consumption_log_aligned (id, user_id, type, consumed_at, timezone, created_at, updated_at, deleted_at)
SELECT id, user_id, 'PRODUCT', consumed_at, timezone, created_at, updated_at, deleted_at FROM consumption_log;
--> statement-breakpoint
DROP TABLE consumption_log;
--> statement-breakpoint
ALTER TABLE consumption_log_aligned RENAME TO consumption_log;
--> statement-breakpoint
CREATE INDEX consumption_log_user_consumed_at_idx ON consumption_log (user_id, consumed_at);
--> statement-breakpoint
CREATE INDEX consumption_log_deleted_at_idx ON consumption_log (deleted_at) WHERE deleted_at IS NOT NULL;
--> statement-breakpoint
CREATE TABLE dish (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id),
  name text NOT NULL,
  image_url text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  deleted_at text
);
--> statement-breakpoint
CREATE UNIQUE INDEX dish_user_name_unique ON dish (user_id, lower(trim(name))) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX dish_user_idx ON dish (user_id);
--> statement-breakpoint
CREATE TABLE dish_version (
  id text PRIMARY KEY NOT NULL,
  dish_id text NOT NULL REFERENCES dish(id),
  servings text NOT NULL CHECK (CAST(servings AS REAL) > 0),
  created_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX dish_version_dish_created_idx ON dish_version (dish_id, created_at);
--> statement-breakpoint
CREATE TABLE dish_ingredient (
  id text PRIMARY KEY NOT NULL,
  dish_version_id text NOT NULL REFERENCES dish_version(id),
  product_package_id integer NOT NULL REFERENCES product_package(id),
  quantity text NOT NULL CHECK (CAST(quantity AS REAL) > 0),
  input_mode text NOT NULL CHECK (input_mode IN ('PACKAGE', 'INDIVIDUAL_UNIT', 'CONTENT_UNIT')),
  input_unit_type_id integer REFERENCES unit_type(id),
  CHECK ((input_mode = 'CONTENT_UNIT' AND input_unit_type_id IS NOT NULL) OR (input_mode IN ('PACKAGE', 'INDIVIDUAL_UNIT') AND input_unit_type_id IS NULL))
);
--> statement-breakpoint
CREATE INDEX dish_ingredient_version_idx ON dish_ingredient (dish_version_id);
--> statement-breakpoint
CREATE TABLE dish_consumption (
  consumption_log_id text PRIMARY KEY NOT NULL REFERENCES consumption_log(id) ON DELETE CASCADE,
  dish_version_id text NOT NULL REFERENCES dish_version(id),
  quantity text NOT NULL CHECK (CAST(quantity AS REAL) > 0)
);
--> statement-breakpoint
CREATE INDEX dish_consumption_dish_version_idx ON dish_consumption (dish_version_id);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
