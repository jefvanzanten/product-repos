CREATE TABLE `brand` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_name_unique` ON `brand` (`name`);--> statement-breakpoint
CREATE TABLE `location` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`name` text NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `location_parent_id_name_unique` ON `location` (`parent_id`,`name`);--> statement-breakpoint
CREATE TABLE `macro_nutrients` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`unit_content_id` integer NOT NULL,
	`total_fat` real,
	`unsaturated_fat` real,
	`saturated_fat` real,
	`total_carbs` real,
	`sugars` real,
	`fibre` real,
	`protein` real,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_content_id`) REFERENCES `unit_content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_type` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_type_name_unique` ON `product_type` (`name`);--> statement-breakpoint
CREATE TABLE `product_variant_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`product_variant_id` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_table_product_id_variant_id_unique` ON `product_variant_table` (`product_id`,`product_variant_id`);--> statement-breakpoint
CREATE TABLE `product_variant` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_name_unique` ON `product_variant` (`name`);--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`product_type_id` text NOT NULL,
	`brand_id` text,
	`unit_content_id` integer NOT NULL,
	`barcode` text,
	FOREIGN KEY (`product_type_id`) REFERENCES `product_type`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_content_id`) REFERENCES `unit_content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_barcode_unique` ON `product` (`barcode`);--> statement-breakpoint
CREATE TABLE `storage_record` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`location_id` integer NOT NULL,
	`remaining_amount` integer NOT NULL,
	`expiration_date` text,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `unit_content` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unit_type_id` integer NOT NULL,
	`amount` real NOT NULL,
	FOREIGN KEY (`unit_type_id`) REFERENCES `unit_type`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unit_content_unit_type_id_amount_unique` ON `unit_content` (`unit_type_id`,`amount`);--> statement-breakpoint
CREATE TABLE `unit_type` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unit_type_name_unique` ON `unit_type` (`name`);