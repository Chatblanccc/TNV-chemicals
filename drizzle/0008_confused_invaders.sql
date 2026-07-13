CREATE TABLE `route_redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`source_path` text NOT NULL,
	`destination_path` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `route_redirects_source_path_unique` ON `route_redirects` (`source_path`);--> statement-breakpoint
CREATE INDEX `route_redirects_status_idx` ON `route_redirects` (`status`,`updated_at`);