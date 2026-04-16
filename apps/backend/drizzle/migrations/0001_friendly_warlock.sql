CREATE TABLE `consumption_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`timestamp` text NOT NULL,
	`amount` integer,
	`units_id` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`units_id`) REFERENCES `contentType`(`id`) ON UPDATE no action ON DELETE no action
);
