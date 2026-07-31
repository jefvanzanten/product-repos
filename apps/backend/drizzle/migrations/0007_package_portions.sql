PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE product_package_portion_stage (
  product_package_id integer PRIMARY KEY NOT NULL,
  name text NOT NULL,
  unit_content_id integer NOT NULL,
  portions_per_package integer
);
--> statement-breakpoint
INSERT INTO product_package_portion_stage (product_package_id, name, unit_content_id, portions_per_package)
SELECT pp.id, ipt.name, pp.unit_content_id, pp.units_per_package
FROM product_package pp
INNER JOIN package_type ipt ON ipt.id = pp.individual_package_type_id
WHERE pp.units_per_package > 1;
--> statement-breakpoint
INSERT OR IGNORE INTO unit_content (unit_type_id, amount)
SELECT DISTINCT uc.unit_type_id,
  rtrim(rtrim(printf('%.15f', CAST(uc.amount AS REAL) * pp.units_per_package), '0'), '.')
FROM product_package pp
INNER JOIN unit_content uc ON uc.id = pp.unit_content_id
WHERE pp.units_per_package > 1;
--> statement-breakpoint
CREATE TABLE product_package_portion_aligned (
  product_package_id integer PRIMARY KEY NOT NULL REFERENCES product_package(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  unit_content_id integer NOT NULL REFERENCES unit_content(id),
  portions_per_package integer CHECK (portions_per_package IS NULL OR portions_per_package > 0)
);
--> statement-breakpoint
CREATE TABLE product_package_total_aligned (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  product_id text NOT NULL REFERENCES product(id),
  unit_content_id integer NOT NULL REFERENCES unit_content(id),
  package_type_id integer NOT NULL REFERENCES package_type(id),
  archived_at text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO product_package_total_aligned (id, product_id, unit_content_id, package_type_id, archived_at, created_at, updated_at)
SELECT pp.id, pp.product_id,
  CASE WHEN pp.units_per_package > 1 THEN (
    SELECT total.id
    FROM unit_content total
    INNER JOIN unit_content individual ON individual.id = pp.unit_content_id
    WHERE total.unit_type_id = individual.unit_type_id
      AND total.amount = rtrim(rtrim(printf('%.15f', CAST(individual.amount AS REAL) * pp.units_per_package), '0'), '.')
    LIMIT 1
  ) ELSE pp.unit_content_id END,
  pp.package_type_id, pp.archived_at, pp.created_at, pp.updated_at
FROM product_package pp;
--> statement-breakpoint
DROP TABLE product_package;
--> statement-breakpoint
ALTER TABLE product_package_total_aligned RENAME TO product_package;
--> statement-breakpoint
CREATE UNIQUE INDEX product_package_unique ON product_package (product_id, package_type_id, unit_content_id);
--> statement-breakpoint
CREATE INDEX product_package_product_idx ON product_package (product_id);
--> statement-breakpoint
INSERT INTO product_package_portion_aligned (product_package_id, name, unit_content_id, portions_per_package)
SELECT product_package_id, name, unit_content_id, portions_per_package
FROM product_package_portion_stage;
--> statement-breakpoint
DROP TABLE product_package_portion_stage;
--> statement-breakpoint
ALTER TABLE product_package_portion_aligned RENAME TO product_package_portion;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
