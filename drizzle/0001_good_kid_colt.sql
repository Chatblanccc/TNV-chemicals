CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`data_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_slug_unique` ON `certificates` (`slug`);--> statement-breakpoint
CREATE INDEX `certificates_status_idx` ON `certificates` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `cms_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`data_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_articles_slug_unique` ON `cms_articles` (`slug`);--> statement-breakpoint
CREATE INDEX `cms_articles_status_idx` ON `cms_articles` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `cms_products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`code` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`data_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_products_slug_unique` ON `cms_products` (`slug`);--> statement-breakpoint
CREATE INDEX `cms_products_status_idx` ON `cms_products` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `content_events` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_events_entity_idx` ON `content_events` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`data_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `downloads_slug_unique` ON `downloads` (`slug`);--> statement-breakpoint
CREATE INDEX `downloads_status_idx` ON `downloads` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `seo_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`locale` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`keywords_json` text DEFAULT '[]' NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seo_metadata_path_locale_unique` ON `seo_metadata` (`path`,`locale`);--> statement-breakpoint
CREATE INDEX `seo_metadata_status_idx` ON `seo_metadata` (`status`,`updated_at`);