CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`path` text NOT NULL,
	`locale` text NOT NULL,
	`country` text,
	`query` text,
	`product_code` text,
	`referrer_host` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_events_type_created_idx` ON `analytics_events` (`event_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_country_created_idx` ON `analytics_events` (`country`,`created_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_path_created_idx` ON `analytics_events` (`path`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_translations` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`locale` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`data_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_translations_entity_locale_unique` ON `content_translations` (`entity_type`,`entity_id`,`locale`);--> statement-breakpoint
CREATE INDEX `content_translations_public_idx` ON `content_translations` (`locale`,`status`,`verification_status`);