CREATE TABLE `libraries` (
	`user_id` text PRIMARY KEY NOT NULL,
	`object_key` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text NOT NULL,
	`size_bytes` integer NOT NULL
);
