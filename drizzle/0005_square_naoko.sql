CREATE TABLE `company_profiles` (
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
CREATE UNIQUE INDEX `company_profiles_slug_unique` ON `company_profiles` (`slug`);--> statement-breakpoint
CREATE INDEX `company_profiles_status_idx` ON `company_profiles` (`status`,`updated_at`);