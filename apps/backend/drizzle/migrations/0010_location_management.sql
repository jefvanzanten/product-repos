CREATE TABLE IF NOT EXISTS `_location_normalization_backfill` (
  `location_id` integer PRIMARY KEY,
  `display_name` text NOT NULL,
  `normalized_name` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `location` ADD `normalized_name` text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE `location`
SET
  `name` = (
    SELECT `display_name`
    FROM `_location_normalization_backfill`
    WHERE `location_id` = `location`.`id`
  ),
  `normalized_name` = (
    SELECT `normalized_name`
    FROM `_location_normalization_backfill`
    WHERE `location_id` = `location`.`id`
  );
--> statement-breakpoint
DROP TABLE `_location_normalization_backfill`;
--> statement-breakpoint
DROP INDEX `location_parent_id_name_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `location_root_normalized_name_unique`
  ON `location` (`normalized_name`)
  WHERE `parent_id` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `location_sibling_normalized_name_unique`
  ON `location` (`parent_id`, `normalized_name`)
  WHERE `parent_id` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `location_constraints_insert`
BEFORE INSERT ON `location`
WHEN NEW.`normalized_name` IS NULL
  OR length(NEW.`name`) NOT BETWEEN 1 AND 100
  OR length(NEW.`normalized_name`) NOT BETWEEN 1 AND 100
  OR NEW.`parent_id` = NEW.`id`
BEGIN
  SELECT RAISE(ABORT, 'location constraint violation');
END;
--> statement-breakpoint
CREATE TRIGGER `location_constraints_update`
BEFORE UPDATE ON `location`
WHEN NEW.`normalized_name` IS NULL
  OR length(NEW.`name`) NOT BETWEEN 1 AND 100
  OR length(NEW.`normalized_name`) NOT BETWEEN 1 AND 100
  OR NEW.`parent_id` = NEW.`id`
BEGIN
  SELECT RAISE(ABORT, 'location constraint violation');
END;
--> statement-breakpoint
PRAGMA foreign_key_check;
