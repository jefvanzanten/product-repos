PRAGMA foreign_keys=OFF;
--> statement-breakpoint
INSERT INTO product_composition (id, name, category_id, brand_id, consumption_type, created_at, updated_at)
SELECT id, name, category_id, brand_id, consumption_type, created_at, updated_at FROM product;
--> statement-breakpoint
INSERT OR IGNORE INTO product_composition (id, name, category_id, brand_id, consumption_type)
SELECT DISTINCT product_composition_id, name, category_id, brand_id, consumption_type
FROM legacy_product_composition_override;
--> statement-breakpoint
INSERT INTO product_composition_macro_profile (
  product_composition_id, reference_basis, calories_kcal, protein_g, carbohydrates_g,
  fat_g, calories_source, created_at, updated_at
)
SELECT product_id, reference_basis, calories_kcal, protein_g, carbohydrates_g,
       fat_g, calories_source, created_at, updated_at
FROM product_macro_profile;
--> statement-breakpoint
INSERT INTO concrete_product (
  id, product_composition_id, package_type_id, unit_content_id, image_url,
  archived_at, created_at, updated_at
)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  coalesce(o.product_composition_id, pp.product_id),
  pp.package_type_id,
  pp.unit_content_id,
  pp.image_url,
  coalesce(p.archived_at, pp.archived_at),
  pp.created_at,
  pp.updated_at
FROM product_package pp
JOIN product p ON p.id = pp.product_id
LEFT JOIN legacy_product_composition_override o ON o.product_package_id = pp.id;
--> statement-breakpoint
INSERT INTO legacy_product_package_map (product_package_id, product_id)
SELECT pp.id, cp.id
FROM product_package pp
LEFT JOIN legacy_product_composition_override o ON o.product_package_id = pp.id
JOIN concrete_product cp
  ON cp.product_composition_id = coalesce(o.product_composition_id, pp.product_id)
 AND cp.package_type_id = pp.package_type_id
 AND cp.unit_content_id = pp.unit_content_id;
--> statement-breakpoint
INSERT INTO product_portion (product_id, singular_name, plural_name, unit_content_id, portions_per_product)
SELECT
  map.product_id,
  trim(ppp.name),
  CASE
    WHEN lower(trim(ppp.name)) = 'stuk' THEN 'stuks'
    WHEN lower(trim(ppp.name)) = 'portie' THEN 'porties'
    ELSE trim(ppp.name) || 's'
  END,
  ppp.unit_content_id,
  ppp.portions_per_package
FROM product_package_portion ppp
JOIN legacy_product_package_map map ON map.product_package_id = ppp.product_package_id;
--> statement-breakpoint
CREATE TABLE product_consumption_v2_transition (
  consumption_log_id text PRIMARY KEY NOT NULL REFERENCES consumption_log(id) ON DELETE CASCADE,
  product_package_id integer REFERENCES product_package(id),
  product_id text NOT NULL REFERENCES concrete_product(id),
  quantity text NOT NULL CHECK (CAST(quantity AS REAL) > 0),
  input_mode text NOT NULL CHECK (input_mode IN ('FULL_PRODUCT', 'PRODUCT_PORTION', 'CONTENT_UNIT')),
  input_unit_type_id integer REFERENCES unit_type(id),
  CHECK ((input_mode = 'CONTENT_UNIT' AND input_unit_type_id IS NOT NULL) OR (input_mode <> 'CONTENT_UNIT' AND input_unit_type_id IS NULL))
);
--> statement-breakpoint
INSERT INTO product_consumption_v2_transition (consumption_log_id, product_package_id, product_id, quantity, input_mode, input_unit_type_id)
SELECT pc.consumption_log_id, pc.product_package_id, map.product_id, pc.quantity,
  CASE pc.input_mode WHEN 'PACKAGE' THEN 'FULL_PRODUCT' WHEN 'INDIVIDUAL_UNIT' THEN 'PRODUCT_PORTION' ELSE pc.input_mode END,
  pc.input_unit_type_id
FROM product_consumption pc
JOIN legacy_product_package_map map ON map.product_package_id = pc.product_package_id;
--> statement-breakpoint
DROP TABLE product_consumption;
--> statement-breakpoint
ALTER TABLE product_consumption_v2_transition RENAME TO product_consumption;
--> statement-breakpoint
CREATE INDEX product_consumption_product_package_idx ON product_consumption (product_package_id);
--> statement-breakpoint
CREATE INDEX product_consumption_product_idx ON product_consumption (product_id);
--> statement-breakpoint
CREATE TABLE dish_ingredient_v2_transition (
  id text PRIMARY KEY NOT NULL,
  dish_version_id text NOT NULL REFERENCES dish_version(id),
  product_package_id integer REFERENCES product_package(id),
  product_id text NOT NULL REFERENCES concrete_product(id),
  quantity text NOT NULL CHECK (CAST(quantity AS REAL) > 0),
  input_mode text NOT NULL CHECK (input_mode IN ('FULL_PRODUCT', 'PRODUCT_PORTION', 'CONTENT_UNIT')),
  input_unit_type_id integer REFERENCES unit_type(id),
  CHECK ((input_mode = 'CONTENT_UNIT' AND input_unit_type_id IS NOT NULL) OR (input_mode <> 'CONTENT_UNIT' AND input_unit_type_id IS NULL))
);
--> statement-breakpoint
INSERT INTO dish_ingredient_v2_transition (id, dish_version_id, product_package_id, product_id, quantity, input_mode, input_unit_type_id)
SELECT di.id, di.dish_version_id, di.product_package_id, map.product_id, di.quantity,
  CASE di.input_mode WHEN 'PACKAGE' THEN 'FULL_PRODUCT' WHEN 'INDIVIDUAL_UNIT' THEN 'PRODUCT_PORTION' ELSE di.input_mode END,
  di.input_unit_type_id
FROM dish_ingredient di
JOIN legacy_product_package_map map ON map.product_package_id = di.product_package_id;
--> statement-breakpoint
DROP TABLE dish_ingredient;
--> statement-breakpoint
ALTER TABLE dish_ingredient_v2_transition RENAME TO dish_ingredient;
--> statement-breakpoint
CREATE INDEX dish_ingredient_version_idx ON dish_ingredient (dish_version_id);
--> statement-breakpoint
CREATE INDEX dish_ingredient_product_idx ON dish_ingredient (product_id);
--> statement-breakpoint
ALTER TABLE dish ADD COLUMN visibility text NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'PUBLIC'));
--> statement-breakpoint
ALTER TABLE dish ADD COLUMN archived_at text;
--> statement-breakpoint
ALTER TABLE dish_version ADD COLUMN instructions text;
--> statement-breakpoint
CREATE TABLE physical_inventory_item (
  id text PRIMARY KEY NOT NULL,
  product_id text NOT NULL REFERENCES concrete_product(id),
  location_id integer NOT NULL REFERENCES location(id) ON DELETE RESTRICT,
  expiry_date text,
  remaining_amount_base text NOT NULL CHECK (CAST(remaining_amount_base AS REAL) >= 0),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
WITH RECURSIVE expanded(legacy_item_id, product_id, location_id, expiry_date, remaining_amount_base, version, created_at, updated_at, item_number, quantity) AS (
  SELECT
    ii.id,
    map.product_id,
    ii.location_id,
    ii.expiry_date,
    CAST(CAST(uc.amount AS REAL) * CAST(ut.conversion_to_base AS REAL) AS TEXT),
    ii.version,
    ii.created_at,
    ii.updated_at,
    1,
    ii.quantity
  FROM inventory_item ii
  JOIN legacy_product_package_map map ON map.product_package_id = ii.product_package_id
  JOIN product_package pp ON pp.id = ii.product_package_id
  JOIN unit_content uc ON uc.id = pp.unit_content_id
  JOIN unit_type ut ON ut.id = uc.unit_type_id
  WHERE ii.quantity > 0
  UNION ALL
  SELECT legacy_item_id, product_id, location_id, expiry_date, remaining_amount_base, version, created_at, updated_at, item_number + 1, quantity
  FROM expanded WHERE item_number < quantity
)
INSERT INTO physical_inventory_item (id, product_id, location_id, expiry_date, remaining_amount_base, version, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  product_id, location_id, expiry_date, remaining_amount_base, version, created_at, updated_at
FROM expanded;
--> statement-breakpoint
CREATE INDEX physical_inventory_product_idx ON physical_inventory_item (product_id);
--> statement-breakpoint
CREATE INDEX physical_inventory_location_idx ON physical_inventory_item (location_id);
--> statement-breakpoint
CREATE TABLE physical_inventory_mutation (
  id text PRIMARY KEY NOT NULL,
  inventory_item_id text NOT NULL REFERENCES physical_inventory_item(id),
  kind text NOT NULL CHECK (kind IN ('ADD', 'CONTENT_SET', 'MOVE', 'DATE_CHANGE', 'REMOVE')),
  amount_delta_base text,
  resulting_amount_base text NOT NULL CHECK (CAST(resulting_amount_base AS REAL) >= 0),
  from_location_id integer REFERENCES location(id) ON DELETE RESTRICT,
  to_location_id integer REFERENCES location(id) ON DELETE RESTRICT,
  from_expiry_date text,
  to_expiry_date text,
  user_id text NOT NULL REFERENCES user(id),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX physical_inventory_mutation_item_idx ON physical_inventory_mutation (inventory_item_id);
--> statement-breakpoint
CREATE TABLE product_stock_threshold (
  product_id text PRIMARY KEY NOT NULL REFERENCES concrete_product(id) ON DELETE CASCADE,
  low_stock_amount_base text NOT NULL CHECK (CAST(low_stock_amount_base AS REAL) >= 0),
  movement_class text CHECK (movement_class IS NULL OR movement_class IN ('SLOW', 'MEDIUM', 'FAST')),
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TRIGGER legacy_product_insert_v2
AFTER INSERT ON product
BEGIN
  INSERT INTO product_composition (id, name, category_id, brand_id, consumption_type, created_at, updated_at)
  VALUES (NEW.id, NEW.name, NEW.category_id, NEW.brand_id, NEW.consumption_type, NEW.created_at, NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER legacy_product_update_v2
AFTER UPDATE ON product
BEGIN
  UPDATE product_composition SET name = NEW.name, category_id = NEW.category_id, brand_id = NEW.brand_id,
    consumption_type = NEW.consumption_type, updated_at = NEW.updated_at WHERE id = NEW.id;
  UPDATE concrete_product SET archived_at = coalesce(NEW.archived_at, (SELECT archived_at FROM product_package WHERE id = (SELECT product_package_id FROM legacy_product_package_map WHERE product_id = concrete_product.id))), updated_at = NEW.updated_at
    WHERE product_composition_id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER legacy_macro_insert_v2
AFTER INSERT ON product_macro_profile
BEGIN
  INSERT INTO product_composition_macro_profile (product_composition_id, reference_basis, calories_kcal, protein_g, carbohydrates_g, fat_g, calories_source, created_at, updated_at)
  VALUES (NEW.product_id, NEW.reference_basis, NEW.calories_kcal, NEW.protein_g, NEW.carbohydrates_g, NEW.fat_g, NEW.calories_source, NEW.created_at, NEW.updated_at)
  ON CONFLICT(product_composition_id) DO UPDATE SET reference_basis = excluded.reference_basis, calories_kcal = excluded.calories_kcal, protein_g = excluded.protein_g, carbohydrates_g = excluded.carbohydrates_g, fat_g = excluded.fat_g, calories_source = excluded.calories_source, updated_at = excluded.updated_at;
END;
--> statement-breakpoint
CREATE TRIGGER legacy_macro_update_v2
AFTER UPDATE ON product_macro_profile
BEGIN
  UPDATE product_composition_macro_profile SET reference_basis = NEW.reference_basis, calories_kcal = NEW.calories_kcal, protein_g = NEW.protein_g, carbohydrates_g = NEW.carbohydrates_g, fat_g = NEW.fat_g, calories_source = NEW.calories_source, updated_at = NEW.updated_at WHERE product_composition_id = NEW.product_id;
END;
--> statement-breakpoint
CREATE TRIGGER legacy_macro_delete_v2
AFTER DELETE ON product_macro_profile
BEGIN
  DELETE FROM product_composition_macro_profile WHERE product_composition_id = OLD.product_id;
END;
--> statement-breakpoint
CREATE TRIGGER legacy_package_insert_v2
AFTER INSERT ON product_package
BEGIN
  INSERT INTO concrete_product (id, product_composition_id, package_type_id, unit_content_id, image_url, archived_at, created_at, updated_at)
  VALUES (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))), NEW.product_id, NEW.package_type_id, NEW.unit_content_id, NEW.image_url, coalesce((SELECT archived_at FROM product WHERE id = NEW.product_id), NEW.archived_at), NEW.created_at, NEW.updated_at);
  INSERT INTO legacy_product_package_map (product_package_id, product_id)
  SELECT NEW.id, id FROM concrete_product WHERE product_composition_id = NEW.product_id AND package_type_id = NEW.package_type_id AND unit_content_id = NEW.unit_content_id;
END;
--> statement-breakpoint
CREATE TRIGGER legacy_package_update_v2
AFTER UPDATE ON product_package
BEGIN
  UPDATE concrete_product SET package_type_id = NEW.package_type_id, unit_content_id = NEW.unit_content_id, image_url = NEW.image_url,
    archived_at = coalesce((SELECT archived_at FROM product WHERE id = NEW.product_id), NEW.archived_at), updated_at = NEW.updated_at
  WHERE id = (SELECT product_id FROM legacy_product_package_map WHERE product_package_id = NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER legacy_portion_insert_v2
AFTER INSERT ON product_package_portion
BEGIN
  INSERT INTO product_portion (product_id, singular_name, plural_name, unit_content_id, portions_per_product)
  VALUES ((SELECT product_id FROM legacy_product_package_map WHERE product_package_id = NEW.product_package_id), trim(NEW.name), CASE WHEN lower(trim(NEW.name)) = 'stuk' THEN 'stuks' WHEN lower(trim(NEW.name)) = 'portie' THEN 'porties' ELSE trim(NEW.name) || 's' END, NEW.unit_content_id, NEW.portions_per_package);
END;
--> statement-breakpoint
CREATE TRIGGER legacy_portion_delete_v2
AFTER DELETE ON product_package_portion
BEGIN
  DELETE FROM product_portion WHERE product_id = (SELECT product_id FROM legacy_product_package_map WHERE product_package_id = OLD.product_package_id);
END;
--> statement-breakpoint
CREATE VIEW product_model_v2_invariants AS
SELECT
  (SELECT COUNT(*) FROM product_package) AS legacy_package_count,
  (SELECT COUNT(*) FROM legacy_product_package_map) AS mapped_package_count,
  (SELECT COUNT(*) FROM concrete_product) AS concrete_product_count,
  (SELECT coalesce(SUM(quantity), 0) FROM inventory_item) AS expected_physical_inventory_count,
  (SELECT COUNT(*) FROM physical_inventory_item) AS physical_inventory_count,
  (SELECT COUNT(*) FROM product_consumption WHERE product_id IS NULL) AS consumption_orphan_count,
  (SELECT COUNT(*) FROM dish_ingredient WHERE product_id IS NULL) AS ingredient_orphan_count;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
