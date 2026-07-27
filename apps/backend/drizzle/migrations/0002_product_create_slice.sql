PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE brand_new (id text PRIMARY KEY NOT NULL, name text NOT NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO brand_new (id, name) SELECT id, name FROM brand WHERE name IS NOT NULL;
--> statement-breakpoint
DROP TABLE brand;
--> statement-breakpoint
ALTER TABLE brand_new RENAME TO brand;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS brand_name_normalized_unique ON brand (lower(trim(name)));
--> statement-breakpoint
DROP TABLE IF EXISTS category;
--> statement-breakpoint
CREATE TABLE category (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, parent_id integer REFERENCES category(id), name text NOT NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO category (name) SELECT name FROM product_type WHERE name IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS category_root_name_unique ON category (lower(trim(name))) WHERE parent_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS category_sibling_name_unique ON category (parent_id, lower(trim(name))) WHERE parent_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE unit_type_new (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, name text NOT NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO unit_type_new (id, name) SELECT id, name FROM unit_type WHERE name IS NOT NULL;
--> statement-breakpoint
DROP TABLE unit_type;
--> statement-breakpoint
ALTER TABLE unit_type_new RENAME TO unit_type;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS unit_type_name_normalized_unique ON unit_type (lower(trim(name)));
--> statement-breakpoint
CREATE TABLE unit_content_new (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, unit_type_id integer NOT NULL REFERENCES unit_type(id), amount real NOT NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO unit_content_new (id, unit_type_id, amount) SELECT id, unit_type_id, amount FROM unit_content;
--> statement-breakpoint
DROP TABLE unit_content;
--> statement-breakpoint
ALTER TABLE unit_content_new RENAME TO unit_content;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS unit_content_unit_type_id_amount_unique ON unit_content (unit_type_id, amount);
--> statement-breakpoint
DROP TABLE IF EXISTS package_type;
--> statement-breakpoint
ALTER TABLE packaging_type RENAME TO package_type;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS package_type_name_normalized_unique ON package_type (lower(trim(name)));
--> statement-breakpoint
CREATE TABLE product_new (id text PRIMARY KEY NOT NULL, name text NOT NULL, category_id integer NOT NULL REFERENCES category(id), brand_id text REFERENCES brand(id));
--> statement-breakpoint
INSERT OR IGNORE INTO product_new (id, name, category_id, brand_id)
SELECT p.id, COALESCE(p.name, pt.name), c.id, p.brand_id
FROM product p
INNER JOIN product_type pt ON pt.id = p.product_type_id
INNER JOIN category c ON lower(trim(c.name)) = lower(trim(pt.name))
WHERE COALESCE(p.name, pt.name) IS NOT NULL;
--> statement-breakpoint
DROP TABLE product;
--> statement-breakpoint
ALTER TABLE product_new RENAME TO product;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_brand_name_unique ON product (brand_id, category_id, lower(trim(name))) WHERE brand_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_no_brand_name_unique ON product (category_id, lower(trim(name))) WHERE brand_id IS NULL;
--> statement-breakpoint
DROP TABLE IF EXISTS product_package;
--> statement-breakpoint
CREATE TABLE product_package (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, product_id text NOT NULL REFERENCES product(id), unit_content_id integer NOT NULL REFERENCES unit_content(id), package_type_id integer NOT NULL REFERENCES package_type(id), units_per_package integer NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_package_unique ON product_package (product_id, package_type_id, unit_content_id, units_per_package);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
