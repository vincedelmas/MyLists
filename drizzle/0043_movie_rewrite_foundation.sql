CREATE TABLE `movie_actor` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movie_actor_item_name` ON `movie_actor` (`catalog_item_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_movie_actor_name_item` ON `movie_actor` (`name`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `movie_details` (
	`catalog_item_id` integer PRIMARY KEY NOT NULL,
	`original_name` text,
	`homepage` text,
	`duration_minutes` integer DEFAULT 0 NOT NULL,
	`original_language` text,
	`vote_average` real,
	`vote_count` real,
	`popularity` real,
	`budget` real,
	`revenue` real,
	`tagline` text,
	`collection_external_id` integer,
	`director_name` text,
	`compositor_name` text,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "movie_details_duration_check" CHECK("movie_details"."duration_minutes" >= 0),
	CONSTRAINT "movie_details_budget_check" CHECK("movie_details"."budget" IS NULL OR "movie_details"."budget" >= 0),
	CONSTRAINT "movie_details_revenue_check" CHECK("movie_details"."revenue" IS NULL OR "movie_details"."revenue" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_movie_details_collection` ON `movie_details` (`collection_external_id`,`catalog_item_id`);--> statement-breakpoint
CREATE INDEX `ix_movie_details_director` ON `movie_details` (`director_name`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `movie_progress` (
	`library_entry_id` integer PRIMARY KEY NOT NULL,
	`watch_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "movie_progress_watch_count_check" CHECK("movie_progress"."watch_count" >= 0 AND "movie_progress"."watch_count" <= 101)
);
--> statement-breakpoint

-- movie-rewrite-backfill-start
INSERT OR IGNORE INTO `catalog_item` (
	`kind`, `primary_provider`, `primary_external_id`, `name`, `release_date`,
	`synopsis`, `image_cover`, `locked`, `added_at`, `last_provider_update`
)
SELECT
	'movies', 'tmdb', CAST(`api_id` AS text), `name`, `release_date`, `synopsis`,
	`image_cover`, COALESCE(`lock_status`, 0), `added_at`, `last_api_update`
FROM `movies`;--> statement-breakpoint

INSERT OR IGNORE INTO `legacy_catalog_item_mapping` (`kind`, `legacy_media_id`, `catalog_item_id`)
SELECT 'movies', legacy.`id`, item.`id`
FROM `movies` legacy
JOIN `catalog_item` item
	ON item.`kind` = 'movies'
	AND item.`primary_provider` = 'tmdb'
	AND item.`primary_external_id` = CAST(legacy.`api_id` AS text);--> statement-breakpoint

INSERT OR IGNORE INTO `movie_details` (
	`catalog_item_id`, `original_name`, `homepage`, `duration_minutes`,
	`original_language`, `vote_average`, `vote_count`, `popularity`, `budget`,
	`revenue`, `tagline`, `collection_external_id`, `director_name`, `compositor_name`
)
SELECT
	mapping.`catalog_item_id`, legacy.`original_name`, legacy.`homepage`, legacy.`duration`,
	legacy.`original_language`, legacy.`vote_average`, legacy.`vote_count`, legacy.`popularity`,
	legacy.`budget`, legacy.`revenue`, legacy.`tagline`, legacy.`collection_id`,
	legacy.`director_name`, legacy.`compositor_name`
FROM `movies` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'movies' AND mapping.`legacy_media_id` = legacy.`id`;--> statement-breakpoint

INSERT OR IGNORE INTO `movie_actor` (`catalog_item_id`, `name`)
SELECT mapping.`catalog_item_id`, actor.`name`
FROM `movies_actors` actor
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'movies' AND mapping.`legacy_media_id` = actor.`media_id`
WHERE length(trim(actor.`name`)) > 0;--> statement-breakpoint

INSERT OR IGNORE INTO `catalog_genre` (`name`)
SELECT `name` FROM `movies_genre` WHERE length(trim(`name`)) > 0;--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_item_genre` (`catalog_item_id`, `genre_id`)
SELECT mapping.`catalog_item_id`, genre.`id`
FROM `movies_genre` legacy_genre
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'movies' AND mapping.`legacy_media_id` = legacy_genre.`media_id`
JOIN `catalog_genre` genre ON genre.`name` = legacy_genre.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_entry` (
	`user_id`, `catalog_item_id`, `status`, `favorite`, `comment`, `rating`,
	`custom_cover`, `added_at`, `updated_at`
)
SELECT
	legacy.`user_id`, mapping.`catalog_item_id`, legacy.`status`, COALESCE(legacy.`favorite`, 0),
	legacy.`comment`, legacy.`rating`, legacy.`custom_cover`,
	COALESCE(legacy.`added_at`, CURRENT_TIMESTAMP), legacy.`last_updated`
FROM `movies_list` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'movies' AND mapping.`legacy_media_id` = legacy.`media_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `movie_progress` (`library_entry_id`, `watch_count`)
SELECT entry.`id`,
	CASE WHEN legacy.`status` = 'Completed' THEN MIN(MAX(legacy.`redo` + 1, 1), 101) ELSE 0 END
FROM `movies_list` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'movies' AND mapping.`legacy_media_id` = legacy.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = legacy.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_tag` (`user_id`, `kind`, `name`)
SELECT `user_id`, 'movies', `name`
FROM `movies_tags`
WHERE length(trim(`name`)) > 0;--> statement-breakpoint
INSERT OR IGNORE INTO `library_entry_tag` (`library_entry_id`, `tag_id`)
SELECT entry.`id`, tag.`id`
FROM `movies_tags` legacy_tag
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'movies' AND mapping.`legacy_media_id` = legacy_tag.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = legacy_tag.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`
JOIN `library_tag` tag
	ON tag.`user_id` = legacy_tag.`user_id` AND tag.`kind` = 'movies' AND tag.`name` = legacy_tag.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_change` (
	`legacy_update_id`, `library_entry_id`, `update_type`, `payload`, `occurred_at`
)
SELECT update_row.`id`, entry.`id`, update_row.`update_type`, update_row.`payload`, update_row.`timestamp`
FROM `user_media_update` update_row
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'movies'
	AND update_row.`media_type` = 'movies'
	AND mapping.`legacy_media_id` = update_row.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = update_row.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_activity` (
	`legacy_activity_id`, `library_entry_id`, `units_gained`, `completed`, `redo`,
	`hidden`, `month_bucket`, `last_updated_at`
)
SELECT
	activity.`id`, entry.`id`, activity.`specific_gained`, activity.`is_completed`,
	activity.`is_redo`, activity.`hidden`, activity.`month_bucket`, activity.`last_update`
FROM `user_media_activity` activity
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'movies'
	AND activity.`media_type` = 'movies'
	AND mapping.`legacy_media_id` = activity.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = activity.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;
