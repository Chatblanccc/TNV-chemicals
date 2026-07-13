ALTER TABLE `downloads` ADD `product_slug` text;--> statement-breakpoint
ALTER TABLE `downloads` ADD `locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
UPDATE `downloads` SET `product_slug` = NULLIF(json_extract(`data_json`, '$.productSlug'), ''), `locale` = COALESCE(NULLIF(json_extract(`data_json`, '$.locale'), ''), 'en');--> statement-breakpoint
CREATE UNIQUE INDEX `downloads_current_product_document_unique` ON `downloads` (`type`,`product_slug`,`locale`) WHERE "downloads"."status" = 'published' and "downloads"."verification_status" = 'verified' and "downloads"."type" in ('sds', 'tds', 'coa');
