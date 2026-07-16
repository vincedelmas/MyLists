CREATE TABLE `legacy_catalog_item_mapping` (
	`kind` text NOT NULL,
	`legacy_media_id` integer NOT NULL,
	`catalog_item_id` integer NOT NULL,
	PRIMARY KEY(`kind`, `legacy_media_id`),
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "legacy_catalog_item_mapping_kind_check" CHECK("legacy_catalog_item_mapping"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "legacy_catalog_item_mapping_id_check" CHECK("legacy_catalog_item_mapping"."legacy_media_id" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_legacy_catalog_item_mapping_catalog` ON `legacy_catalog_item_mapping` (`catalog_item_id`);--> statement-breakpoint

-- Existing URLs and collection rows use the v1 per-family IDs. Record their
-- relationship to the global catalog now; never infer it from matching IDs.
-- tv-legacy-mapping-backfill-start
INSERT OR IGNORE INTO `legacy_catalog_item_mapping` (`kind`, `legacy_media_id`, `catalog_item_id`)
SELECT 'series', s.`id`, ci.`id`
FROM `series` s
JOIN `catalog_item` ci
	ON ci.`kind` = 'series'
	AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text);--> statement-breakpoint
INSERT OR IGNORE INTO `legacy_catalog_item_mapping` (`kind`, `legacy_media_id`, `catalog_item_id`)
SELECT 'anime', a.`id`, ci.`id`
FROM `anime` a
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime'
	AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text);
