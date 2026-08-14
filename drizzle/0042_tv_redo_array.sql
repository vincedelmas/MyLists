PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_series_list` (
	`current_season` integer NOT NULL,
	`current_episode` integer NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`redo` text DEFAULT '[]' NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`status` text NOT NULL,
	`favorite` integer,
	`comment` text,
	`rating` real,
	`custom_cover` text,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_updated` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "series_list_rating_check" CHECK("__new_series_list"."rating" IS NULL OR ("__new_series_list"."rating" >= 0 AND "__new_series_list"."rating" <= 10)),
	CONSTRAINT "series_list_redo_json_check" CHECK(json_valid("__new_series_list"."redo"))
);
--> statement-breakpoint
INSERT INTO `__new_series_list`("current_season", "current_episode", "total", "redo", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_season", "current_episode", "total", "redo2", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `series_list`;--> statement-breakpoint
DROP TABLE `series_list`;--> statement-breakpoint
ALTER TABLE `__new_series_list` RENAME TO `series_list`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_list_user_media` ON `series_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_series_list_media_id` ON `series_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_series_list_user_media_rated` ON `series_list` (`user_id`,`media_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_series_list_media_user_rated` ON `series_list` (`media_id`,`user_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_anime_list` (
	`current_season` integer NOT NULL,
	`current_episode` integer NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`redo` text DEFAULT '[]' NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`status` text NOT NULL,
	`favorite` integer,
	`comment` text,
	`rating` real,
	`custom_cover` text,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_updated` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "anime_list_rating_check" CHECK("__new_anime_list"."rating" IS NULL OR ("__new_anime_list"."rating" >= 0 AND "__new_anime_list"."rating" <= 10)),
	CONSTRAINT "anime_list_redo_json_check" CHECK(json_valid("__new_anime_list"."redo"))
);
--> statement-breakpoint
INSERT INTO `__new_anime_list`("current_season", "current_episode", "total", "redo", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_season", "current_episode", "total", "redo2", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `anime_list`;--> statement-breakpoint
DROP TABLE `anime_list`;--> statement-breakpoint
ALTER TABLE `__new_anime_list` RENAME TO `anime_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_list_user_media` ON `anime_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_id` ON `anime_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_list_user_media_rated` ON `anime_list` (`user_id`,`media_id`) WHERE "anime_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_user_rated` ON `anime_list` (`media_id`,`user_id`) WHERE "anime_list"."rating" IS NOT NULL;
