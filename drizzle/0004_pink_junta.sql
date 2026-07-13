CREATE TABLE `cms_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`data_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_categories_slug_unique` ON `cms_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `cms_categories_status_idx` ON `cms_categories` (`status`,`updated_at`);