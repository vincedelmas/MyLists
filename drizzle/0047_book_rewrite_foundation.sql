CREATE TABLE `book_author` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_book_author_item_name` ON `book_author` (`catalog_item_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_book_author_name_item` ON `book_author` (`name`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `book_details` (
	`catalog_item_id` integer PRIMARY KEY NOT NULL,
	`pages` integer DEFAULT 0 NOT NULL,
	`language` text,
	`publisher` text,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "book_details_pages_check" CHECK("book_details"."pages" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_book_details_language` ON `book_details` (`language`,`catalog_item_id`);--> statement-breakpoint
CREATE INDEX `ix_book_details_publisher` ON `book_details` (`publisher`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `book_progress` (
	`library_entry_id` integer PRIMARY KEY NOT NULL,
	`current_page` integer,
	`reread_count` integer DEFAULT 0 NOT NULL,
	`total_pages_read` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "book_progress_current_page_check" CHECK("book_progress"."current_page" IS NULL OR ("book_progress"."current_page" >= 0 AND "book_progress"."current_page" <= 10000000)),
	CONSTRAINT "book_progress_reread_check" CHECK("book_progress"."reread_count" >= 0 AND "book_progress"."reread_count" <= 100),
	CONSTRAINT "book_progress_total_pages_check" CHECK("book_progress"."total_pages_read" >= 0 AND "book_progress"."total_pages_read" <= 10000000)
);--> statement-breakpoint

-- book-rewrite-backfill-start
INSERT OR IGNORE INTO `catalog_item` (
	`kind`, `primary_provider`, `primary_external_id`, `name`, `release_date`,
	`synopsis`, `image_cover`, `locked`, `added_at`, `last_provider_update`
)
SELECT
	'books', 'google-books', `api_id`, `name`, `release_date`, `synopsis`, `image_cover`,
	COALESCE(`lock_status`, 0), `added_at`, `last_api_update`
FROM `books`;--> statement-breakpoint

INSERT OR IGNORE INTO `legacy_catalog_item_mapping` (`kind`, `legacy_media_id`, `catalog_item_id`)
SELECT 'books', legacy.`id`, item.`id`
FROM `books` legacy
JOIN `catalog_item` item
	ON item.`kind` = 'books'
	AND item.`primary_provider` = 'google-books'
	AND item.`primary_external_id` = legacy.`api_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `book_details` (`catalog_item_id`, `pages`, `language`, `publisher`)
SELECT mapping.`catalog_item_id`, legacy.`pages`, legacy.`language`, legacy.`publishers`
FROM `books` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'books' AND mapping.`legacy_media_id` = legacy.`id`;--> statement-breakpoint

INSERT OR IGNORE INTO `book_author` (`catalog_item_id`, `name`)
SELECT mapping.`catalog_item_id`, author.`name`
FROM `books_authors` author
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'books' AND mapping.`legacy_media_id` = author.`media_id`
WHERE length(trim(author.`name`)) > 0;--> statement-breakpoint

INSERT OR IGNORE INTO `catalog_genre` (`name`)
SELECT `name` FROM `books_genre` WHERE length(trim(`name`)) > 0;--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_item_genre` (`catalog_item_id`, `genre_id`)
SELECT mapping.`catalog_item_id`, genre.`id`
FROM `books_genre` legacy_genre
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'books' AND mapping.`legacy_media_id` = legacy_genre.`media_id`
JOIN `catalog_genre` genre ON genre.`name` = legacy_genre.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_entry` (
	`user_id`, `catalog_item_id`, `status`, `favorite`, `comment`, `rating`,
	`custom_cover`, `added_at`, `updated_at`
)
SELECT
	legacy.`user_id`, mapping.`catalog_item_id`, legacy.`status`, COALESCE(legacy.`favorite`, 0),
	legacy.`comment`, legacy.`rating`, legacy.`custom_cover`, legacy.`added_at`, legacy.`last_updated`
FROM `books_list` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'books' AND mapping.`legacy_media_id` = legacy.`media_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `book_progress` (`library_entry_id`, `current_page`, `reread_count`, `total_pages_read`)
SELECT entry.`id`, legacy.`actual_page`, legacy.`redo`, legacy.`total`
FROM `books_list` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'books' AND mapping.`legacy_media_id` = legacy.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = legacy.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_tag` (`user_id`, `kind`, `name`)
SELECT `user_id`, 'books', `name`
FROM `books_tags`
WHERE length(trim(`name`)) > 0;--> statement-breakpoint
INSERT OR IGNORE INTO `library_entry_tag` (`library_entry_id`, `tag_id`)
SELECT entry.`id`, tag.`id`
FROM `books_tags` legacy_tag
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'books' AND mapping.`legacy_media_id` = legacy_tag.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = legacy_tag.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`
JOIN `library_tag` tag
	ON tag.`user_id` = legacy_tag.`user_id` AND tag.`kind` = 'books' AND tag.`name` = legacy_tag.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_change` (
	`legacy_update_id`, `library_entry_id`, `update_type`, `payload`, `occurred_at`
)
SELECT update_row.`id`, entry.`id`, update_row.`update_type`, update_row.`payload`, update_row.`timestamp`
FROM `user_media_update` update_row
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'books'
	AND update_row.`media_type` = 'books'
	AND mapping.`legacy_media_id` = update_row.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = update_row.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_activity` (
	`legacy_activity_id`, `legacy_media_id`, `user_id`, `kind`, `catalog_item_id`, `library_entry_id`,
	`units_gained`, `completed`, `redo`, `hidden`, `month_bucket`, `last_updated_at`
)
SELECT
	activity.`id`, activity.`media_id`, activity.`user_id`, 'books', mapping.`catalog_item_id`, entry.`id`,
	activity.`specific_gained`, activity.`is_completed`, activity.`is_redo`, activity.`hidden`,
	activity.`month_bucket`, activity.`last_update`
FROM `user_media_activity` activity
LEFT JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'books' AND mapping.`legacy_media_id` = activity.`media_id`
LEFT JOIN `library_entry` entry
	ON entry.`user_id` = activity.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`
WHERE activity.`media_type` = 'books';
