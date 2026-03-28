CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_name_unique` ON `brands` (`name`);--> statement-breakpoint
CREATE TABLE `consumptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consumptions_name_unique` ON `consumptions` (`name`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`consumption_id` integer NOT NULL,
	`brand_id` integer NOT NULL,
	`serving_content` integer NOT NULL,
	`serving_content_id` integer NOT NULL,
	`content` integer NOT NULL,
	`unit_type_id` integer NOT NULL,
	FOREIGN KEY (`consumption_id`) REFERENCES `consumptions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`serving_content_id`) REFERENCES `contentType`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_type_id`) REFERENCES `contentType`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contentType` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contentType_type_unique` ON `contentType` (`type`);