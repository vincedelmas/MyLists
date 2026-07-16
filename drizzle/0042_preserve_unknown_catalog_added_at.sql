PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_catalog_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`primary_provider` text NOT NULL,
	`primary_external_id` text NOT NULL,
	`name` text NOT NULL,
	`release_date` text,
	`synopsis` text,
	`image_cover` text NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_provider_update` text,
	CONSTRAINT "catalog_item_kind_check" CHECK("__new_catalog_item"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "catalog_item_external_id_check" CHECK(length(trim("__new_catalog_item"."primary_external_id")) > 0)
);
--> statement-breakpoint
INSERT INTO `__new_catalog_item`("id", "kind", "primary_provider", "primary_external_id", "name", "release_date", "synopsis", "image_cover", "locked", "added_at", "last_provider_update") SELECT "id", "kind", "primary_provider", "primary_external_id", "name", "release_date", "synopsis", "image_cover", "locked", "added_at", "last_provider_update" FROM `catalog_item`;--> statement-breakpoint
DROP TABLE `catalog_item`;--> statement-breakpoint
ALTER TABLE `__new_catalog_item` RENAME TO `catalog_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_catalog_item_primary_source` ON `catalog_item` (`kind`,`primary_provider`,`primary_external_id`);--> statement-breakpoint
CREATE INDEX `ix_catalog_item_kind_name` ON `catalog_item` (`kind`,`name`);--> statement-breakpoint
CREATE INDEX `ix_catalog_item_kind_release_date` ON `catalog_item` (`kind`,`release_date`);--> statement-breakpoint

-- Restore unknown legacy catalog timestamps that the foundation migration had
-- to coalesce while catalog_item.added_at was still non-nullable.
-- catalog-added-at-backfill-start
UPDATE `catalog_item`
SET `added_at` = (
	SELECT legacy.`added_at`
	FROM `legacy_catalog_item_mapping` mapping
	JOIN `series` legacy ON legacy.`id` = mapping.`legacy_media_id`
	WHERE mapping.`kind` = 'series' AND mapping.`catalog_item_id` = `catalog_item`.`id`
)
WHERE `kind` = 'series' AND EXISTS (
	SELECT 1 FROM `legacy_catalog_item_mapping` mapping
	WHERE mapping.`kind` = 'series' AND mapping.`catalog_item_id` = `catalog_item`.`id`
);--> statement-breakpoint
UPDATE `catalog_item`
SET `added_at` = (
	SELECT legacy.`added_at`
	FROM `legacy_catalog_item_mapping` mapping
	JOIN `anime` legacy ON legacy.`id` = mapping.`legacy_media_id`
	WHERE mapping.`kind` = 'anime' AND mapping.`catalog_item_id` = `catalog_item`.`id`
)
WHERE `kind` = 'anime' AND EXISTS (
	SELECT 1 FROM `legacy_catalog_item_mapping` mapping
	WHERE mapping.`kind` = 'anime' AND mapping.`catalog_item_id` = `catalog_item`.`id`
);
