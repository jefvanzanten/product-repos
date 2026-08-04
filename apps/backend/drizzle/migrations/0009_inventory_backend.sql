ALTER TABLE `location` ADD `archived_at` text;
--> statement-breakpoint
ALTER TABLE `location` ADD `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE `location` ADD `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
DROP TABLE `storage_record`;
--> statement-breakpoint
CREATE TABLE `inventory_item` (
  `id` text PRIMARY KEY NOT NULL,
  `product_package_id` integer NOT NULL REFERENCES `product_package`(`id`),
  `location_id` integer NOT NULL REFERENCES `location`(`id`),
  `expiry_date` text,
  `quantity` integer NOT NULL,
  `version` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `inventory_item_quantity_non_negative` CHECK (`quantity` >= 0),
  CONSTRAINT `inventory_item_version_non_negative` CHECK (`version` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_item_package_location_expiry_unique`
  ON `inventory_item` (`product_package_id`, `location_id`, `expiry_date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_item_package_location_no_expiry_unique`
  ON `inventory_item` (`product_package_id`, `location_id`)
  WHERE `expiry_date` IS NULL;
--> statement-breakpoint
CREATE INDEX `inventory_item_package_idx` ON `inventory_item` (`product_package_id`);
--> statement-breakpoint
CREATE INDEX `inventory_item_location_idx` ON `inventory_item` (`location_id`);
--> statement-breakpoint
CREATE TABLE `inventory_mutation` (
  `id` text PRIMARY KEY NOT NULL,
  `inventory_item_id` text NOT NULL REFERENCES `inventory_item`(`id`),
  `kind` text NOT NULL,
  `quantity_delta` integer,
  `resulting_quantity` integer NOT NULL,
  `from_location_id` integer REFERENCES `location`(`id`),
  `to_location_id` integer REFERENCES `location`(`id`),
  `from_expiry_date` text,
  `to_expiry_date` text,
  `user_id` text NOT NULL REFERENCES `user`(`id`),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `inventory_mutation_resulting_non_negative` CHECK (`resulting_quantity` >= 0),
  CONSTRAINT `inventory_mutation_kind_valid` CHECK (`kind` IN ('ADD', 'REMOVE', 'SET', 'MOVE', 'DATE_CHANGE'))
);
--> statement-breakpoint
CREATE INDEX `inventory_mutation_item_idx` ON `inventory_mutation` (`inventory_item_id`);
