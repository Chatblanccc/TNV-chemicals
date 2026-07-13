CREATE TABLE `cms_applications` (
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
CREATE UNIQUE INDEX `cms_applications_slug_unique` ON `cms_applications` (`slug`);--> statement-breakpoint
CREATE INDEX `cms_applications_status_idx` ON `cms_applications` (`status`,`updated_at`);