CREATE TABLE `watch_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_item_id` integer NOT NULL,
	`episode_id` integer,
	`watched_at` text NOT NULL,
	FOREIGN KEY (`media_item_id`) REFERENCES `media_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `watch_events_media_item_idx` ON `watch_events` (`media_item_id`);--> statement-breakpoint
CREATE INDEX `watch_events_episode_idx` ON `watch_events` (`episode_id`);