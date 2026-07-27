PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS brand_name_normalized_unique ON brand (lower(trim(name)));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS category_root_name_unique ON category (lower(trim(name))) WHERE parent_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS category_sibling_name_unique ON category (parent_id, lower(trim(name))) WHERE parent_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS unit_type_name_normalized_unique ON unit_type (lower(trim(name)));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS package_type_name_normalized_unique ON package_type (lower(trim(name)));
--> statement-breakpoint
DROP INDEX IF EXISTS packaging_type_name_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_brand_name_unique ON product (brand_id, category_id, lower(trim(name))) WHERE brand_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_no_brand_name_unique ON product (category_id, lower(trim(name))) WHERE brand_id IS NULL;
--> statement-breakpoint
CREATE TABLE product_package_new (id text PRIMARY KEY NOT NULL, product_id text NOT NULL REFERENCES product(id), unit_content_id integer NOT NULL REFERENCES unit_content(id), package_type_id integer NOT NULL REFERENCES package_type(id), units_per_package integer NOT NULL DEFAULT 1);
--> statement-breakpoint
INSERT OR IGNORE INTO product_package_new (id, product_id, unit_content_id, package_type_id, units_per_package)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))), product_id, unit_content_id, package_type_id, units_per_package
FROM product_package;
--> statement-breakpoint
DROP TABLE product_package;
--> statement-breakpoint
ALTER TABLE product_package_new RENAME TO product_package;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_package_unique ON product_package (product_id, package_type_id, unit_content_id, units_per_package);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS storage_record_new (id text PRIMARY KEY NOT NULL, product_id text NOT NULL REFERENCES product(id), location_id integer NOT NULL REFERENCES location(id), quantity integer NOT NULL, expiration_date text);
--> statement-breakpoint
INSERT OR IGNORE INTO storage_record_new (id, product_id, location_id, quantity, expiration_date)
SELECT sr.id, pv.product_id, sr.location_id, sr.quantity, sr.expiration_date
FROM storage_record sr
INNER JOIN product_sku ps ON ps.id = sr.product_sku_id
INNER JOIN product_variant pv ON pv.id = ps.product_variant_id;
--> statement-breakpoint
DROP TABLE IF EXISTS storage_record;
--> statement-breakpoint
ALTER TABLE storage_record_new RENAME TO storage_record;
--> statement-breakpoint
DROP TABLE IF EXISTS macro_nutrients;
--> statement-breakpoint
DROP TABLE IF EXISTS product_sku;
--> statement-breakpoint
DROP TABLE IF EXISTS product_variant;
--> statement-breakpoint
DROP TABLE IF EXISTS product_type;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
