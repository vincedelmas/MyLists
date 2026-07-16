PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_library_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`legacy_activity_id` integer,
	`legacy_media_id` integer,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`catalog_item_id` integer,
	`library_entry_id` integer,
	`units_gained` real NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`redo` integer DEFAULT false NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`month_bucket` text NOT NULL,
	`last_updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "library_activity_kind_check" CHECK("__new_library_activity"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "library_activity_subject_check" CHECK("__new_library_activity"."catalog_item_id" IS NOT NULL OR "__new_library_activity"."legacy_media_id" IS NOT NULL),
	CONSTRAINT "library_activity_month_check" CHECK("__new_library_activity"."month_bucket" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
INSERT INTO `__new_library_activity`(
	"id", "legacy_activity_id", "legacy_media_id", "user_id", "kind", "catalog_item_id",
	"library_entry_id", "units_gained", "completed", "redo", "hidden", "month_bucket", "last_updated_at"
)
SELECT
	activity."id", activity."legacy_activity_id", mapping."legacy_media_id", entry."user_id", item."kind",
	entry."catalog_item_id", activity."library_entry_id", activity."units_gained", activity."completed",
	activity."redo", activity."hidden", activity."month_bucket", activity."last_updated_at"
FROM `library_activity` activity
JOIN `library_entry` entry ON entry."id" = activity."library_entry_id"
JOIN `catalog_item` item ON item."id" = entry."catalog_item_id"
LEFT JOIN `legacy_catalog_item_mapping` mapping
	ON mapping."catalog_item_id" = item."id" AND mapping."kind" = item."kind";--> statement-breakpoint
DROP TABLE `library_activity`;--> statement-breakpoint
ALTER TABLE `__new_library_activity` RENAME TO `library_activity`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_activity_legacy_activity` ON `library_activity` (`legacy_activity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_activity_user_catalog_month` ON `library_activity` (`user_id`,`catalog_item_id`,`month_bucket`);--> statement-breakpoint
CREATE INDEX `ix_library_activity_user_month` ON `library_activity` (`user_id`,`month_bucket`);--> statement-breakpoint
CREATE INDEX `ix_library_activity_month_updated` ON `library_activity` (`month_bucket`,`last_updated_at`);--> statement-breakpoint

-- activity-history-backfill-start
INSERT OR IGNORE INTO `library_activity` (
	`legacy_activity_id`, `legacy_media_id`, `user_id`, `kind`, `catalog_item_id`, `library_entry_id`,
	`units_gained`, `completed`, `redo`, `hidden`, `month_bucket`, `last_updated_at`
)
SELECT
	activity.`id`, activity.`media_id`, activity.`user_id`, activity.`media_type`, mapping.`catalog_item_id`, entry.`id`,
	activity.`specific_gained`, activity.`is_completed`, activity.`is_redo`, activity.`hidden`,
	activity.`month_bucket`, activity.`last_update`
FROM `user_media_activity` activity
LEFT JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = activity.`media_type` AND mapping.`legacy_media_id` = activity.`media_id`
LEFT JOIN `library_entry` entry
	ON entry.`user_id` = activity.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`
WHERE activity.`media_type` IN ('series', 'anime', 'movies', 'games');
