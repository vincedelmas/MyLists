CREATE TABLE `manga_author` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_author_item_name` ON `manga_author` (`catalog_item_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_manga_author_name_item` ON `manga_author` (`name`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `manga_details` (
	`catalog_item_id` integer PRIMARY KEY NOT NULL,
	`original_name` text,
	`chapters` integer,
	`production_status` text,
	`site_url` text,
	`end_date` text,
	`volumes` integer,
	`vote_average` real,
	`vote_count` real,
	`popularity` real,
	`publisher` text,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "manga_details_chapters_check" CHECK("manga_details"."chapters" IS NULL OR "manga_details"."chapters" >= 0),
	CONSTRAINT "manga_details_volumes_check" CHECK("manga_details"."volumes" IS NULL OR "manga_details"."volumes" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_manga_details_status` ON `manga_details` (`production_status`,`catalog_item_id`);--> statement-breakpoint
CREATE INDEX `ix_manga_details_publisher` ON `manga_details` (`publisher`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `manga_progress` (
	`library_entry_id` integer PRIMARY KEY NOT NULL,
	`current_chapter` integer DEFAULT 0 NOT NULL,
	`reread_count` integer DEFAULT 0 NOT NULL,
	`total_chapters_read` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "manga_progress_current_chapter_check" CHECK("manga_progress"."current_chapter" >= 0 AND "manga_progress"."current_chapter" <= 10000000),
	CONSTRAINT "manga_progress_reread_check" CHECK("manga_progress"."reread_count" >= 0 AND "manga_progress"."reread_count" <= 100),
	CONSTRAINT "manga_progress_total_chapters_check" CHECK("manga_progress"."total_chapters_read" >= 0 AND "manga_progress"."total_chapters_read" <= 10000000)
);--> statement-breakpoint

-- manga-rewrite-backfill-start
INSERT OR IGNORE INTO `catalog_item` (
	`kind`, `primary_provider`, `primary_external_id`, `name`, `release_date`,
	`synopsis`, `image_cover`, `locked`, `added_at`, `last_provider_update`
)
SELECT
	'manga', 'jikan', CAST(`api_id` AS text), `name`, `release_date`, `synopsis`, `image_cover`,
	COALESCE(`lock_status`, 0), `added_at`, `last_api_update`
FROM `manga`;--> statement-breakpoint

INSERT OR IGNORE INTO `legacy_catalog_item_mapping` (`kind`, `legacy_media_id`, `catalog_item_id`)
SELECT 'manga', legacy.`id`, item.`id`
FROM `manga` legacy
JOIN `catalog_item` item
	ON item.`kind` = 'manga'
	AND item.`primary_provider` = 'jikan'
	AND item.`primary_external_id` = CAST(legacy.`api_id` AS text);--> statement-breakpoint

INSERT OR IGNORE INTO `manga_details` (
	`catalog_item_id`, `original_name`, `chapters`, `production_status`, `site_url`,
	`end_date`, `volumes`, `vote_average`, `vote_count`, `popularity`, `publisher`
)
SELECT
	mapping.`catalog_item_id`, legacy.`original_name`, legacy.`chapters`, legacy.`prod_status`,
	legacy.`site_url`, legacy.`end_date`, legacy.`volumes`, legacy.`vote_average`,
	legacy.`vote_count`, legacy.`popularity`, legacy.`publishers`
FROM `manga` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'manga' AND mapping.`legacy_media_id` = legacy.`id`;--> statement-breakpoint

INSERT OR IGNORE INTO `manga_author` (`catalog_item_id`, `name`)
SELECT mapping.`catalog_item_id`, author.`name`
FROM `manga_authors` author
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'manga' AND mapping.`legacy_media_id` = author.`media_id`
WHERE length(trim(author.`name`)) > 0;--> statement-breakpoint

INSERT OR IGNORE INTO `catalog_genre` (`name`)
SELECT `name` FROM `manga_genre` WHERE length(trim(`name`)) > 0;--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_item_genre` (`catalog_item_id`, `genre_id`)
SELECT mapping.`catalog_item_id`, genre.`id`
FROM `manga_genre` legacy_genre
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'manga' AND mapping.`legacy_media_id` = legacy_genre.`media_id`
JOIN `catalog_genre` genre ON genre.`name` = legacy_genre.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_entry` (
	`user_id`, `catalog_item_id`, `status`, `favorite`, `comment`, `rating`,
	`custom_cover`, `added_at`, `updated_at`
)
SELECT
	legacy.`user_id`, mapping.`catalog_item_id`, legacy.`status`, COALESCE(legacy.`favorite`, 0),
	legacy.`comment`, legacy.`rating`, legacy.`custom_cover`, legacy.`added_at`, legacy.`last_updated`
FROM `manga_list` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'manga' AND mapping.`legacy_media_id` = legacy.`media_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `manga_progress` (`library_entry_id`, `current_chapter`, `reread_count`, `total_chapters_read`)
SELECT entry.`id`, legacy.`current_chapter`, legacy.`redo`, legacy.`total`
FROM `manga_list` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'manga' AND mapping.`legacy_media_id` = legacy.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = legacy.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_tag` (`user_id`, `kind`, `name`)
SELECT `user_id`, 'manga', `name`
FROM `manga_tags`
WHERE length(trim(`name`)) > 0;--> statement-breakpoint
INSERT OR IGNORE INTO `library_entry_tag` (`library_entry_id`, `tag_id`)
SELECT entry.`id`, tag.`id`
FROM `manga_tags` legacy_tag
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'manga' AND mapping.`legacy_media_id` = legacy_tag.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = legacy_tag.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`
JOIN `library_tag` tag
	ON tag.`user_id` = legacy_tag.`user_id` AND tag.`kind` = 'manga' AND tag.`name` = legacy_tag.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_change` (
	`legacy_update_id`, `library_entry_id`, `update_type`, `payload`, `occurred_at`
)
SELECT update_row.`id`, entry.`id`, update_row.`update_type`, update_row.`payload`, update_row.`timestamp`
FROM `user_media_update` update_row
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'manga'
	AND update_row.`media_type` = 'manga'
	AND mapping.`legacy_media_id` = update_row.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = update_row.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_activity` (
	`legacy_activity_id`, `legacy_media_id`, `user_id`, `kind`, `catalog_item_id`, `library_entry_id`,
	`units_gained`, `completed`, `redo`, `hidden`, `month_bucket`, `last_updated_at`
)
SELECT
	activity.`id`, activity.`media_id`, activity.`user_id`, 'manga', mapping.`catalog_item_id`, entry.`id`,
	activity.`specific_gained`, activity.`is_completed`, activity.`is_redo`, activity.`hidden`,
	activity.`month_bucket`, activity.`last_update`
FROM `user_media_activity` activity
LEFT JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'manga' AND mapping.`legacy_media_id` = activity.`media_id`
LEFT JOIN `library_entry` entry
	ON entry.`user_id` = activity.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`
WHERE activity.`media_type` = 'manga';
