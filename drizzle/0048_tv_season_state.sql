-- Preserve seasonal data before rebuilding the parent table. Legacy indexes follow season order.
CREATE TEMP TABLE `series_season_migration` (
    list_id integer NOT NULL, season integer NOT NULL, redo integer NOT NULL, rating real,
    PRIMARY KEY (list_id, season)
);
--> statement-breakpoint
INSERT INTO `series_season_migration`
SELECT l.id, s.season, COALESCE(json_extract(l.redo, '$[' || s.position || ']'), 0), l.rating
FROM `series_list` l
JOIN (SELECT media_id, season, ROW_NUMBER() OVER (PARTITION BY media_id ORDER BY season) - 1 AS position
      FROM `series_episodes_per_season`) s ON s.media_id = l.media_id;
--> statement-breakpoint
-- Preserve nonzero legacy entries beyond known metadata as unavailable seasons.
-- A conflicting mapping fails the migration rather than silently assigning user data to another season.
INSERT INTO `series_season_migration`
SELECT l.id, CAST(j.key AS integer) + 1, j.value, NULL
FROM `series_list` l, json_each(l.redo) j
WHERE j.key >= (SELECT COUNT(*) FROM `series_episodes_per_season` s WHERE s.media_id = l.media_id)
  AND j.value > 0;
--> statement-breakpoint
-- Preserve seasonal data before rebuilding the parent table. Legacy indexes follow season order.
CREATE TEMP TABLE `anime_season_migration` (
    list_id integer NOT NULL, season integer NOT NULL, redo integer NOT NULL, rating real,
    PRIMARY KEY (list_id, season)
);
--> statement-breakpoint
INSERT INTO `anime_season_migration`
SELECT l.id, s.season, COALESCE(json_extract(l.redo, '$[' || s.position || ']'), 0), l.rating
FROM `anime_list` l
JOIN (SELECT media_id, season, ROW_NUMBER() OVER (PARTITION BY media_id ORDER BY season) - 1 AS position
      FROM `anime_episodes_per_season`) s ON s.media_id = l.media_id;
--> statement-breakpoint
-- Preserve nonzero legacy entries beyond known metadata as unavailable seasons.
-- A conflicting mapping fails the migration rather than silently assigning user data to another season.
INSERT INTO `anime_season_migration`
SELECT l.id, CAST(j.key AS integer) + 1, j.value, NULL
FROM `anime_list` l, json_each(l.redo) j
WHERE j.key >= (SELECT COUNT(*) FROM `anime_episodes_per_season` s WHERE s.media_id = l.media_id)
  AND j.value > 0;
--> statement-breakpoint
CREATE TABLE `__new_series_list` (
	`current_season` integer NOT NULL,
	`current_episode` integer NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
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
	CONSTRAINT "series_list_redo_check" CHECK("__new_series_list"."redo" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_series_list`("current_season", "current_episode", "total", "redo", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_season", "current_episode", "total", COALESCE((SELECT SUM(m.redo) FROM `series_season_migration` m JOIN `series_episodes_per_season` s ON s.media_id = `series_list`.media_id AND s.season = m.season WHERE m.list_id = `series_list`.id), 0), "id", "user_id", "media_id", "status", "favorite", "comment", ROUND("rating", 1), "custom_cover", "added_at", "last_updated" FROM `series_list`;--> statement-breakpoint
DROP TABLE `series_list`;--> statement-breakpoint
ALTER TABLE `__new_series_list` RENAME TO `series_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_list_user_media` ON `series_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_series_list_media_id` ON `series_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_series_list_user_media_rated` ON `series_list` (`user_id`,`media_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_series_list_media_user_rated` ON `series_list` (`media_id`,`user_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_anime_list` (
	`current_season` integer NOT NULL,
	`current_episode` integer NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
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
	CONSTRAINT "anime_list_redo_check" CHECK("__new_anime_list"."redo" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_anime_list`("current_season", "current_episode", "total", "redo", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_season", "current_episode", "total", COALESCE((SELECT SUM(m.redo) FROM `anime_season_migration` m JOIN `anime_episodes_per_season` s ON s.media_id = `anime_list`.media_id AND s.season = m.season WHERE m.list_id = `anime_list`.id), 0), "id", "user_id", "media_id", "status", "favorite", "comment", ROUND("rating", 1), "custom_cover", "added_at", "last_updated" FROM `anime_list`;--> statement-breakpoint
DROP TABLE `anime_list`;--> statement-breakpoint
ALTER TABLE `__new_anime_list` RENAME TO `anime_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_list_user_media` ON `anime_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_id` ON `anime_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_list_user_media_rated` ON `anime_list` (`user_id`,`media_id`) WHERE "anime_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_user_rated` ON `anime_list` (`media_id`,`user_id`) WHERE "anime_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `series_list_seasons` (
	`list_id` integer NOT NULL,
	`season` integer NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
	`rating` real,
	PRIMARY KEY(`list_id`, `season`),
	FOREIGN KEY (`list_id`) REFERENCES `series_list`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "series_list_seasons_season_check" CHECK("series_list_seasons"."season" >= 1),
	CONSTRAINT "series_list_seasons_redo_check" CHECK("series_list_seasons"."redo" >= 0 AND "series_list_seasons"."redo" <= 100),
	CONSTRAINT "series_list_seasons_rating_check" CHECK("series_list_seasons"."rating" IS NULL OR ("series_list_seasons"."rating" >= 0 AND "series_list_seasons"."rating" <= 10))
);
--> statement-breakpoint
CREATE TABLE `anime_list_seasons` (
	`list_id` integer NOT NULL,
	`season` integer NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
	`rating` real,
	PRIMARY KEY(`list_id`, `season`),
	FOREIGN KEY (`list_id`) REFERENCES `anime_list`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "anime_list_seasons_season_check" CHECK("anime_list_seasons"."season" >= 1),
	CONSTRAINT "anime_list_seasons_redo_check" CHECK("anime_list_seasons"."redo" >= 0 AND "anime_list_seasons"."redo" <= 100),
	CONSTRAINT "anime_list_seasons_rating_check" CHECK("anime_list_seasons"."rating" IS NULL OR ("anime_list_seasons"."rating" >= 0 AND "anime_list_seasons"."rating" <= 10))
);
--> statement-breakpoint
INSERT INTO `series_list_seasons` SELECT * FROM `series_season_migration`;
--> statement-breakpoint
DROP TABLE `series_season_migration`;
--> statement-breakpoint
INSERT INTO `anime_list_seasons` SELECT * FROM `anime_season_migration`;
--> statement-breakpoint
DROP TABLE `anime_season_migration`;
--> statement-breakpoint
UPDATE user_media_settings SET
    total_redo = COALESCE((SELECT SUM(redo) FROM series_list WHERE user_id = user_media_settings.user_id), 0),
    entries_rated = (SELECT COUNT(rating) FROM series_list WHERE user_id = user_media_settings.user_id),
    sum_entries_rated = COALESCE((SELECT ROUND(SUM(rating), 10) FROM series_list WHERE user_id = user_media_settings.user_id), 0),
    average_rating = (SELECT AVG(rating) FROM series_list WHERE user_id = user_media_settings.user_id)
WHERE media_type = 'series';
--> statement-breakpoint
UPDATE user_media_settings SET
    total_redo = COALESCE((SELECT SUM(redo) FROM anime_list WHERE user_id = user_media_settings.user_id), 0),
    entries_rated = (SELECT COUNT(rating) FROM anime_list WHERE user_id = user_media_settings.user_id),
    sum_entries_rated = COALESCE((SELECT ROUND(SUM(rating), 10) FROM anime_list WHERE user_id = user_media_settings.user_id), 0),
    average_rating = (SELECT AVG(rating) FROM anime_list WHERE user_id = user_media_settings.user_id)
WHERE media_type = 'anime';
