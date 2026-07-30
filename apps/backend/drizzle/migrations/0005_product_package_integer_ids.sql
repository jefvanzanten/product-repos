PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE product_package_new (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  product_id text NOT NULL REFERENCES product(id),
  unit_content_id integer NOT NULL REFERENCES unit_content(id),
  package_type_id integer NOT NULL REFERENCES package_type(id),
  units_per_package integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
INSERT INTO product_package_new (product_id, unit_content_id, package_type_id, units_per_package)
SELECT product_id, unit_content_id, package_type_id, units_per_package
FROM product_package
ORDER BY rowid;
--> statement-breakpoint
DROP TABLE product_package;
--> statement-breakpoint
ALTER TABLE product_package_new RENAME TO product_package;
--> statement-breakpoint
CREATE UNIQUE INDEX product_package_unique ON product_package (product_id, package_type_id, unit_content_id, units_per_package);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
