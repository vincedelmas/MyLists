-- Rebuilding TV list tables must preserve season rows, including when foreign keys are enabled.
CREATE TEMP TABLE `series_list_seasons_favorite_migration` AS SELECT list_id, season, redo, rating FROM `series_list_seasons`;
--> statement-breakpoint
DELETE FROM `series_list_seasons`;
--> statement-breakpoint
CREATE TEMP TABLE `anime_list_seasons_favorite_migration` AS SELECT list_id, season, redo, rating FROM `anime_list_seasons`;
--> statement-breakpoint
DELETE FROM `anime_list_seasons`;
--> statement-breakpoint
CREATE TABLE `__new_series_list` (
	`current_season` integer NOT NULL,
	`current_episode` integer NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "series_list_rating_check" CHECK("__new_series_list"."rating" IS NULL OR ("__new_series_list"."rating" >= 0 AND "__new_series_list"."rating" <= 10)),
	CONSTRAINT "series_list_favorite_check" CHECK("__new_series_list"."favorite" IN (0, 1)),
	CONSTRAINT "series_list_redo_check" CHECK("__new_series_list"."redo" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_series_list`("current_season", "current_episode", "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_season", "current_episode", "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", COALESCE("favorite", 0), "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `series_list`;--> statement-breakpoint
DROP TABLE `series_list`;--> statement-breakpoint
ALTER TABLE `__new_series_list` RENAME TO `series_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_list_user_media` ON `series_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_series_list_media_id` ON `series_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_series_list_user_media_rated` ON `series_list` (`user_id`,`media_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_series_list_media_user_rated` ON `series_list` (`media_id`,`user_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_anime_list` (
	`current_season` integer NOT NULL,
	`current_episode` integer NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "anime_list_rating_check" CHECK("__new_anime_list"."rating" IS NULL OR ("__new_anime_list"."rating" >= 0 AND "__new_anime_list"."rating" <= 10)),
	CONSTRAINT "anime_list_favorite_check" CHECK("__new_anime_list"."favorite" IN (0, 1)),
	CONSTRAINT "anime_list_redo_check" CHECK("__new_anime_list"."redo" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_anime_list`("current_season", "current_episode", "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_season", "current_episode", "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", COALESCE("favorite", 0), "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `anime_list`;--> statement-breakpoint
DROP TABLE `anime_list`;--> statement-breakpoint
ALTER TABLE `__new_anime_list` RENAME TO `anime_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_list_user_media` ON `anime_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_id` ON `anime_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_list_user_media_rated` ON `anime_list` (`user_id`,`media_id`) WHERE "anime_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_user_rated` ON `anime_list` (`media_id`,`user_id`) WHERE "anime_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_movies_list` (
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movies_list_rating_check" CHECK("__new_movies_list"."rating" IS NULL OR ("__new_movies_list"."rating" >= 0 AND "__new_movies_list"."rating" <= 10)),
	CONSTRAINT "movies_list_favorite_check" CHECK("__new_movies_list"."favorite" IN (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_movies_list`("redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", COALESCE("favorite", 0), "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `movies_list`;--> statement-breakpoint
DROP TABLE `movies_list`;--> statement-breakpoint
ALTER TABLE `__new_movies_list` RENAME TO `movies_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_list_user_media` ON `movies_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_movies_list_media_id` ON `movies_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_movies_list_user_media_rated` ON `movies_list` (`user_id`,`media_id`) WHERE "movies_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_movies_list_media_user_rated` ON `movies_list` (`media_id`,`user_id`) WHERE "movies_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_games_list` (
	`playtime` integer DEFAULT 0,
	`platform` text,
	`id` integer PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "games_list_rating_check" CHECK("__new_games_list"."rating" IS NULL OR ("__new_games_list"."rating" >= 0 AND "__new_games_list"."rating" <= 10)),
	CONSTRAINT "games_list_favorite_check" CHECK("__new_games_list"."favorite" IN (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_games_list`("playtime", "platform", "id", "user_id", "media_id", "status", "release_notifications_enabled", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "playtime", "platform", "id", "user_id", "media_id", "status", "release_notifications_enabled", COALESCE("favorite", 0), "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `games_list`;--> statement-breakpoint
DROP TABLE `games_list`;--> statement-breakpoint
ALTER TABLE `__new_games_list` RENAME TO `games_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_list_user_media` ON `games_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_games_list_media_id` ON `games_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_games_list_user_media_rated` ON `games_list` (`user_id`,`media_id`) WHERE "games_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_games_list_media_user_rated` ON `games_list` (`media_id`,`user_id`) WHERE "games_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_books_list` (
	`actual_page` integer,
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "books_list_rating_check" CHECK("__new_books_list"."rating" IS NULL OR ("__new_books_list"."rating" >= 0 AND "__new_books_list"."rating" <= 10)),
	CONSTRAINT "books_list_favorite_check" CHECK("__new_books_list"."favorite" IN (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_books_list`("actual_page", "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "actual_page", "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", COALESCE("favorite", 0), "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `books_list`;--> statement-breakpoint
DROP TABLE `books_list`;--> statement-breakpoint
ALTER TABLE `__new_books_list` RENAME TO `books_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_list_user_media` ON `books_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_books_list_media_id` ON `books_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_books_list_user_media_rated` ON `books_list` (`user_id`,`media_id`) WHERE "books_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_books_list_media_user_rated` ON `books_list` (`media_id`,`user_id`) WHERE "books_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_manga_list` (
	`current_chapter` integer NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "manga_list_rating_check" CHECK("__new_manga_list"."rating" IS NULL OR ("__new_manga_list"."rating" >= 0 AND "__new_manga_list"."rating" <= 10)),
	CONSTRAINT "manga_list_favorite_check" CHECK("__new_manga_list"."favorite" IN (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_manga_list`("current_chapter", "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_chapter", "redo", "total", "id", "user_id", "media_id", "status", "release_notifications_enabled", COALESCE("favorite", 0), "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `manga_list`;--> statement-breakpoint
DROP TABLE `manga_list`;--> statement-breakpoint
ALTER TABLE `__new_manga_list` RENAME TO `manga_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_list_user_media` ON `manga_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_manga_list_media_id` ON `manga_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_manga_list_user_media_rated` ON `manga_list` (`user_id`,`media_id`) WHERE "manga_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_manga_list_media_user_rated` ON `manga_list` (`media_id`,`user_id`) WHERE "manga_list"."rating" IS NOT NULL;--> statement-breakpoint
ALTER TABLE `user_media_settings` DROP COLUMN `average_rating`;--> statement-breakpoint
ALTER TABLE `user_media_stats_history` DROP COLUMN `average_rating`;
--> statement-breakpoint
INSERT INTO `series_list_seasons` (list_id, season, redo, rating) SELECT list_id, season, redo, rating FROM `series_list_seasons_favorite_migration`;
--> statement-breakpoint
DROP TABLE `series_list_seasons_favorite_migration`;
--> statement-breakpoint
INSERT INTO `anime_list_seasons` (list_id, season, redo, rating) SELECT list_id, season, redo, rating FROM `anime_list_seasons_favorite_migration`;
--> statement-breakpoint
DROP TABLE `anime_list_seasons_favorite_migration`;
