PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_series_tags` (
	`list_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	CONSTRAINT `series_tags_pk` PRIMARY KEY(`list_id`, `tag_id`),
	CONSTRAINT `fk_series_tags_list_id_series_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `series_list`(`id`) ON DELETE CASCADE,
	CONSTRAINT `series_tags_tag_id_media_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_series_tags`(`list_id`, `tag_id`)
SELECT l.`id`, t.`tag_id`
FROM `series_tags` t
INNER JOIN `series_list` l ON l.`user_id` = t.`user_id` AND l.`media_id` = t.`media_id`;--> statement-breakpoint
DROP TABLE `series_tags`;--> statement-breakpoint
ALTER TABLE `__new_series_tags` RENAME TO `series_tags`;--> statement-breakpoint
CREATE TABLE `__new_anime_tags` (
	`list_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	CONSTRAINT `anime_tags_pk` PRIMARY KEY(`list_id`, `tag_id`),
	CONSTRAINT `fk_anime_tags_list_id_anime_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `anime_list`(`id`) ON DELETE CASCADE,
	CONSTRAINT `anime_tags_tag_id_media_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_anime_tags`(`list_id`, `tag_id`)
SELECT l.`id`, t.`tag_id`
FROM `anime_tags` t
INNER JOIN `anime_list` l ON l.`user_id` = t.`user_id` AND l.`media_id` = t.`media_id`;--> statement-breakpoint
DROP TABLE `anime_tags`;--> statement-breakpoint
ALTER TABLE `__new_anime_tags` RENAME TO `anime_tags`;--> statement-breakpoint
CREATE TABLE `__new_movies_tags` (
	`list_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	CONSTRAINT `movies_tags_pk` PRIMARY KEY(`list_id`, `tag_id`),
	CONSTRAINT `fk_movies_tags_list_id_movies_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `movies_list`(`id`) ON DELETE CASCADE,
	CONSTRAINT `movies_tags_tag_id_media_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_movies_tags`(`list_id`, `tag_id`)
SELECT l.`id`, t.`tag_id`
FROM `movies_tags` t
INNER JOIN `movies_list` l ON l.`user_id` = t.`user_id` AND l.`media_id` = t.`media_id`;--> statement-breakpoint
DROP TABLE `movies_tags`;--> statement-breakpoint
ALTER TABLE `__new_movies_tags` RENAME TO `movies_tags`;--> statement-breakpoint
CREATE TABLE `__new_games_tags` (
	`list_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	CONSTRAINT `games_tags_pk` PRIMARY KEY(`list_id`, `tag_id`),
	CONSTRAINT `fk_games_tags_list_id_games_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `games_list`(`id`) ON DELETE CASCADE,
	CONSTRAINT `games_tags_tag_id_media_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_games_tags`(`list_id`, `tag_id`)
SELECT l.`id`, t.`tag_id`
FROM `games_tags` t
INNER JOIN `games_list` l ON l.`user_id` = t.`user_id` AND l.`media_id` = t.`media_id`;--> statement-breakpoint
DROP TABLE `games_tags`;--> statement-breakpoint
ALTER TABLE `__new_games_tags` RENAME TO `games_tags`;--> statement-breakpoint
CREATE TABLE `__new_books_tags` (
	`list_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	CONSTRAINT `books_tags_pk` PRIMARY KEY(`list_id`, `tag_id`),
	CONSTRAINT `fk_books_tags_list_id_books_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `books_list`(`id`) ON DELETE CASCADE,
	CONSTRAINT `books_tags_tag_id_media_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_books_tags`(`list_id`, `tag_id`)
SELECT l.`id`, t.`tag_id`
FROM `books_tags` t
INNER JOIN `books_list` l ON l.`user_id` = t.`user_id` AND l.`media_id` = t.`media_id`;--> statement-breakpoint
DROP TABLE `books_tags`;--> statement-breakpoint
ALTER TABLE `__new_books_tags` RENAME TO `books_tags`;--> statement-breakpoint
CREATE TABLE `__new_manga_tags` (
	`list_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	CONSTRAINT `manga_tags_pk` PRIMARY KEY(`list_id`, `tag_id`),
	CONSTRAINT `fk_manga_tags_list_id_manga_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `manga_list`(`id`) ON DELETE CASCADE,
	CONSTRAINT `manga_tags_tag_id_media_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_manga_tags`(`list_id`, `tag_id`)
SELECT l.`id`, t.`tag_id`
FROM `manga_tags` t
INNER JOIN `manga_list` l ON l.`user_id` = t.`user_id` AND l.`media_id` = t.`media_id`;--> statement-breakpoint
DROP TABLE `manga_tags`;--> statement-breakpoint
ALTER TABLE `__new_manga_tags` RENAME TO `manga_tags`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ix_series_tags_tag_list` ON `series_tags` (`tag_id`,`list_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_tags_tag_list` ON `anime_tags` (`tag_id`,`list_id`);--> statement-breakpoint
CREATE INDEX `ix_movies_tags_tag_list` ON `movies_tags` (`tag_id`,`list_id`);--> statement-breakpoint
CREATE INDEX `ix_games_tags_tag_list` ON `games_tags` (`tag_id`,`list_id`);--> statement-breakpoint
CREATE INDEX `ix_books_tags_tag_list` ON `books_tags` (`tag_id`,`list_id`);--> statement-breakpoint
CREATE INDEX `ix_manga_tags_tag_list` ON `manga_tags` (`tag_id`,`list_id`);
