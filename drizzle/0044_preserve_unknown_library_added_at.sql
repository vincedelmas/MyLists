PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_library_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`status` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`comment` text,
	`rating` real,
	`custom_cover` text,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "library_entry_rating_check" CHECK("__new_library_entry"."rating" IS NULL OR ("__new_library_entry"."rating" >= 0 AND "__new_library_entry"."rating" <= 10)),
	CONSTRAINT "library_entry_status_check" CHECK("__new_library_entry"."status" IN ('Reading', 'Playing', 'Watching', 'Completed', 'Multiplayer', 'Endless', 'On Hold', 'Random', 'Dropped', 'Plan to Watch', 'Plan to Play', 'Plan to Read'))
);
--> statement-breakpoint
INSERT INTO `__new_library_entry`("id", "user_id", "catalog_item_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "updated_at") SELECT "id", "user_id", "catalog_item_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "updated_at" FROM `library_entry`;--> statement-breakpoint
DROP TABLE `library_entry`;--> statement-breakpoint
ALTER TABLE `__new_library_entry` RENAME TO `library_entry`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_entry_user_catalog_item` ON `library_entry` (`user_id`,`catalog_item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_entry_id_catalog_item` ON `library_entry` (`id`,`catalog_item_id`);--> statement-breakpoint
CREATE INDEX `ix_library_entry_catalog_user_rating` ON `library_entry` (`catalog_item_id`,`user_id`,`rating`);--> statement-breakpoint
CREATE INDEX `ix_library_entry_user_status` ON `library_entry` (`user_id`,`status`);--> statement-breakpoint

-- library-added-at-backfill-start
UPDATE `library_entry`
SET `added_at` = (
	SELECT legacy.`added_at`
	FROM `legacy_catalog_item_mapping` mapping
	JOIN `series_list` legacy
		ON legacy.`media_id` = mapping.`legacy_media_id`
		AND legacy.`user_id` = `library_entry`.`user_id`
	WHERE mapping.`kind` = 'series' AND mapping.`catalog_item_id` = `library_entry`.`catalog_item_id`
)
WHERE EXISTS (
	SELECT 1 FROM `legacy_catalog_item_mapping` mapping
	JOIN `series_list` legacy
		ON legacy.`media_id` = mapping.`legacy_media_id`
		AND legacy.`user_id` = `library_entry`.`user_id`
	WHERE mapping.`kind` = 'series' AND mapping.`catalog_item_id` = `library_entry`.`catalog_item_id`
);--> statement-breakpoint
UPDATE `library_entry`
SET `added_at` = (
	SELECT legacy.`added_at`
	FROM `legacy_catalog_item_mapping` mapping
	JOIN `anime_list` legacy
		ON legacy.`media_id` = mapping.`legacy_media_id`
		AND legacy.`user_id` = `library_entry`.`user_id`
	WHERE mapping.`kind` = 'anime' AND mapping.`catalog_item_id` = `library_entry`.`catalog_item_id`
)
WHERE EXISTS (
	SELECT 1 FROM `legacy_catalog_item_mapping` mapping
	JOIN `anime_list` legacy
		ON legacy.`media_id` = mapping.`legacy_media_id`
		AND legacy.`user_id` = `library_entry`.`user_id`
	WHERE mapping.`kind` = 'anime' AND mapping.`catalog_item_id` = `library_entry`.`catalog_item_id`
);--> statement-breakpoint
UPDATE `library_entry`
SET `added_at` = (
	SELECT legacy.`added_at`
	FROM `legacy_catalog_item_mapping` mapping
	JOIN `movies_list` legacy
		ON legacy.`media_id` = mapping.`legacy_media_id`
		AND legacy.`user_id` = `library_entry`.`user_id`
	WHERE mapping.`kind` = 'movies' AND mapping.`catalog_item_id` = `library_entry`.`catalog_item_id`
)
WHERE EXISTS (
	SELECT 1 FROM `legacy_catalog_item_mapping` mapping
	JOIN `movies_list` legacy
		ON legacy.`media_id` = mapping.`legacy_media_id`
		AND legacy.`user_id` = `library_entry`.`user_id`
	WHERE mapping.`kind` = 'movies' AND mapping.`catalog_item_id` = `library_entry`.`catalog_item_id`
);
