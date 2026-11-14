DROP INDEX IF EXISTS `media_items_source_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `media_items_source_unique` ON `media_items` (`source`,`type`,`source_id`);