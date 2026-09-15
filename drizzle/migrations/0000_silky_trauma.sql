CREATE TABLE `episode_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`episode_id` integer NOT NULL,
	`watched` integer DEFAULT false NOT NULL,
	`watched_at` text,
	`rating` real,
	`notes` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`title` text,
	`overview` text,
	`air_date` text,
	`runtime_minutes` integer,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `library_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_item_id` integer NOT NULL,
	`watch_status` text DEFAULT 'plan_to_watch' NOT NULL,
	`rating` real,
	`favorite` integer DEFAULT false NOT NULL,
	`notes` text,
	`rewatch_count` integer DEFAULT 0 NOT NULL,
	`added_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`media_item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `media_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`release_date` text,
	`airing_status` text,
	`runtime_minutes` integer,
	`genres` text,
	`source` text NOT NULL,
	`source_id` text,
	`external_ids` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_tags` (
	`media_item_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`media_item_id`, `tag_id`),
	FOREIGN KEY (`media_item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `season_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`rating` real,
	`notes` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_item_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`title` text,
	`overview` text,
	`poster_path` text,
	`air_date` text,
	FOREIGN KEY (`media_item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episode_progress_episode_unique` ON `episode_progress` (`episode_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_season_episode_unique` ON `episodes` (`season_id`,`episode_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `library_entries_media_item_unique` ON `library_entries` (`media_item_id`);--> statement-breakpoint
CREATE INDEX `library_entries_status_idx` ON `library_entries` (`watch_status`);--> statement-breakpoint
CREATE INDEX `library_entries_favorite_idx` ON `library_entries` (`favorite`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_items_source_unique` ON `media_items` (`source`,`source_id`);--> statement-breakpoint
CREATE INDEX `media_items_type_idx` ON `media_items` (`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `season_ratings_season_unique` ON `season_ratings` (`season_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_media_season_unique` ON `seasons` (`media_item_id`,`season_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);