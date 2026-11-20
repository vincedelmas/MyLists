PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_books_list` (
	`actual_page` integer,
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`custom_title` text NOT NULL,
	`custom_pages` integer NOT NULL,
	`custom_publisher` text,
	`custom_release_date` text,
	`custom_language` text,
	`id` integer PRIMARY KEY,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`status` text NOT NULL,
	`release_notifications_enabled` integer DEFAULT true NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`comment` text,
	`rating` real,
	`custom_cover` text,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_updated` text,
	CONSTRAINT `books_list_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `books_list_media_id_books_id_fk` FOREIGN KEY (`media_id`) REFERENCES `books`(`id`),
	CONSTRAINT "books_list_rating_check" CHECK("rating" IS NULL OR ("rating" >= 0 AND "rating" <= 10)),
	CONSTRAINT "books_list_favorite_check" CHECK("favorite" IN (0, 1)),
	CONSTRAINT "books_list_custom_pages_check" CHECK("custom_pages" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_books_list`(
	`actual_page`,
	`redo`,
	`total`,
	`custom_title`,
	`custom_pages`,
	`custom_publisher`,
	`custom_release_date`,
	`custom_language`,
	`id`,
	`user_id`,
	`media_id`,
	`status`,
	`release_notifications_enabled`,
	`favorite`,
	`comment`,
	`rating`,
	`custom_cover`,
	`added_at`,
	`last_updated`
)
SELECT
	l.`actual_page`,
	l.`redo`,
	l.`total`,
	b.`name`,
	MAX(0, b.`pages`),
	b.`publishers`,
	b.`release_date`,
	b.`language`,
	l.`id`,
	l.`user_id`,
	l.`media_id`,
	l.`status`,
	l.`release_notifications_enabled`,
	l.`favorite`,
	l.`comment`,
	l.`rating`,
	l.`custom_cover`,
	l.`added_at`,
	l.`last_updated`
FROM `books_list` l
INNER JOIN `books` b ON b.`id` = l.`media_id`;--> statement-breakpoint
DROP TABLE `books_list`;--> statement-breakpoint
ALTER TABLE `__new_books_list` RENAME TO `books_list`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_list_user_media` ON `books_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_books_list_media_id` ON `books_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_books_list_user_media_rated` ON `books_list` (`user_id`,`media_id`) WHERE "books_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_books_list_media_user_rated` ON `books_list` (`media_id`,`user_id`) WHERE "books_list"."rating" IS NOT NULL;