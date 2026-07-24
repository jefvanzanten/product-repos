PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_product` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`product_type_id` text NOT NULL,
	`brand_id` text,
	FOREIGN KEY (`product_type_id`) REFERENCES `product_type`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_product`("id", "name", "product_type_id", "brand_id") SELECT "id", "name", "product_type_id", "brand_id" FROM `product`;--> statement-breakpoint
DROP TABLE `product`;--> statement-breakpoint
ALTER TABLE `__new_product` RENAME TO `product`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `product_product_type_id_brand_id_unnamed_unique` ON `product` (`product_type_id`,`brand_id`) WHERE "product"."name" is null;