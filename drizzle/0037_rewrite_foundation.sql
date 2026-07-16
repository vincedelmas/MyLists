CREATE TABLE `catalog_genre` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_catalog_genre_name` ON `catalog_genre` (`name`);--> statement-breakpoint
CREATE TABLE `catalog_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`primary_provider` text NOT NULL,
	`primary_external_id` text NOT NULL,
	`name` text NOT NULL,
	`release_date` text,
	`synopsis` text,
	`image_cover` text NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`last_provider_update` text,
	CONSTRAINT "catalog_item_kind_check" CHECK("catalog_item"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "catalog_item_external_id_check" CHECK(length(trim("catalog_item"."primary_external_id")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_catalog_item_primary_source` ON `catalog_item` (`kind`,`primary_provider`,`primary_external_id`);--> statement-breakpoint
CREATE INDEX `ix_catalog_item_kind_name` ON `catalog_item` (`kind`,`name`);--> statement-breakpoint
CREATE INDEX `ix_catalog_item_kind_release_date` ON `catalog_item` (`kind`,`release_date`);--> statement-breakpoint
CREATE TABLE `catalog_item_genre` (
	`catalog_item_id` integer NOT NULL,
	`genre_id` integer NOT NULL,
	PRIMARY KEY(`catalog_item_id`, `genre_id`),
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`genre_id`) REFERENCES `catalog_genre`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_catalog_item_genre_genre` ON `catalog_item_genre` (`genre_id`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `catalog_source` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_source_kind_check" CHECK("catalog_source"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "catalog_source_external_id_check" CHECK(length(trim("catalog_source"."external_id")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_catalog_source_provider_external` ON `catalog_source` (`kind`,`provider`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_catalog_source_item_provider` ON `catalog_source` (`catalog_item_id`,`provider`);--> statement-breakpoint
CREATE INDEX `ix_catalog_source_catalog_item` ON `catalog_source` (`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `tv_actor` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_tv_actor_item_name` ON `tv_actor` (`catalog_item_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_tv_actor_name_item` ON `tv_actor` (`name`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `tv_details` (
	`catalog_item_id` integer PRIMARY KEY NOT NULL,
	`original_name` text,
	`last_air_date` text,
	`homepage` text,
	`created_by` text,
	`episode_duration_minutes` integer DEFAULT 0 NOT NULL,
	`total_seasons` integer DEFAULT 0 NOT NULL,
	`total_episodes` integer DEFAULT 0 NOT NULL,
	`origin_country` text,
	`production_status` text,
	`vote_average` real,
	`vote_count` real,
	`popularity` real,
	`next_episode_season` integer,
	`next_episode_number` integer,
	`next_episode_air_date` text,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tv_details_duration_check" CHECK("tv_details"."episode_duration_minutes" >= 0),
	CONSTRAINT "tv_details_seasons_check" CHECK("tv_details"."total_seasons" >= 0),
	CONSTRAINT "tv_details_episodes_check" CHECK("tv_details"."total_episodes" >= 0)
);
--> statement-breakpoint
CREATE TABLE `tv_network` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_tv_network_item_name` ON `tv_network` (`catalog_item_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_tv_network_name_item` ON `tv_network` (`name`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `tv_season` (
	`catalog_item_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`episode_count` integer NOT NULL,
	PRIMARY KEY(`catalog_item_id`, `season_number`),
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tv_season_number_check" CHECK("tv_season"."season_number" > 0),
	CONSTRAINT "tv_season_episode_count_check" CHECK("tv_season"."episode_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE `library_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`library_entry_id` integer NOT NULL,
	`units_gained` real NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`redo` integer DEFAULT false NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`month_bucket` text NOT NULL,
	`last_updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "library_activity_month_check" CHECK("library_activity"."month_bucket" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_activity_entry_month` ON `library_activity` (`library_entry_id`,`month_bucket`);--> statement-breakpoint
CREATE INDEX `ix_library_activity_month_updated` ON `library_activity` (`month_bucket`,`last_updated_at`);--> statement-breakpoint
CREATE TABLE `library_change` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`library_entry_id` integer NOT NULL,
	`update_type` text NOT NULL,
	`payload` text,
	`occurred_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_library_change_entry_occurred` ON `library_change` (`library_entry_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `ix_library_change_occurred` ON `library_change` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `library_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`status` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`comment` text,
	`rating` real,
	`custom_cover` text,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "library_entry_rating_check" CHECK("library_entry"."rating" IS NULL OR ("library_entry"."rating" >= 0 AND "library_entry"."rating" <= 10)),
	CONSTRAINT "library_entry_status_check" CHECK("library_entry"."status" IN ('Reading', 'Playing', 'Watching', 'Completed', 'Multiplayer', 'Endless', 'On Hold', 'Random', 'Dropped', 'Plan to Watch', 'Plan to Play', 'Plan to Read'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_entry_user_catalog_item` ON `library_entry` (`user_id`,`catalog_item_id`);--> statement-breakpoint
CREATE INDEX `ix_library_entry_catalog_user_rating` ON `library_entry` (`catalog_item_id`,`user_id`,`rating`);--> statement-breakpoint
CREATE INDEX `ix_library_entry_user_status` ON `library_entry` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `library_entry_tag` (
	`library_entry_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`library_entry_id`, `tag_id`),
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `library_tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_library_entry_tag_tag_entry` ON `library_entry_tag` (`tag_id`,`library_entry_id`);--> statement-breakpoint
CREATE TABLE `library_stats` (
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`time_spent_minutes` integer DEFAULT 0 NOT NULL,
	`total_entries` integer DEFAULT 0 NOT NULL,
	`total_redo` integer DEFAULT 0 NOT NULL,
	`entries_rated` integer DEFAULT 0 NOT NULL,
	`rating_sum` real DEFAULT 0 NOT NULL,
	`entries_commented` integer DEFAULT 0 NOT NULL,
	`entries_favorited` integer DEFAULT 0 NOT NULL,
	`total_specific` real DEFAULT 0 NOT NULL,
	`status_counts` text DEFAULT '{}' NOT NULL,
	`average_rating` real,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`user_id`, `kind`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "library_stats_kind_check" CHECK("library_stats"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "library_stats_nonnegative_check" CHECK("library_stats"."time_spent_minutes" >= 0 AND "library_stats"."total_entries" >= 0 AND "library_stats"."total_redo" >= 0 AND "library_stats"."entries_rated" >= 0 AND "library_stats"."entries_commented" >= 0 AND "library_stats"."entries_favorited" >= 0 AND "library_stats"."total_specific" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_library_stats_kind_time` ON `library_stats` (`kind`,`time_spent_minutes`);--> statement-breakpoint
CREATE TABLE `library_tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "library_tag_kind_check" CHECK("library_tag"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "library_tag_name_check" CHECK(length(trim("library_tag"."name")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_tag_user_kind_name` ON `library_tag` (`user_id`,`kind`,`name`);--> statement-breakpoint
CREATE INDEX `ix_library_tag_user_kind` ON `library_tag` (`user_id`,`kind`);--> statement-breakpoint
CREATE TABLE `profile_media_channel` (
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `kind`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "profile_media_channel_kind_check" CHECK("profile_media_channel"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "profile_media_channel_views_check" CHECK("profile_media_channel"."views" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_profile_media_channel_kind_enabled` ON `profile_media_channel` (`kind`,`enabled`);--> statement-breakpoint
CREATE TABLE `tv_progress` (
	`library_entry_id` integer PRIMARY KEY NOT NULL,
	`current_season` integer DEFAULT 1 NOT NULL,
	`current_episode` integer DEFAULT 0 NOT NULL,
	`watched_episodes` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tv_progress_season_check" CHECK("tv_progress"."current_season" > 0),
	CONSTRAINT "tv_progress_episode_check" CHECK("tv_progress"."current_episode" >= 0),
	CONSTRAINT "tv_progress_watched_check" CHECK("tv_progress"."watched_episodes" >= 0)
);
--> statement-breakpoint
CREATE TABLE `tv_season_rewatch` (
	`library_entry_id` integer NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`library_entry_id`, `season_number`),
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`,`season_number`) REFERENCES `tv_season`(`catalog_item_id`,`season_number`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tv_season_rewatch_count_check" CHECK("tv_season_rewatch"."count" > 0 AND "tv_season_rewatch"."count" <= 100)
);
--> statement-breakpoint
CREATE INDEX `ix_tv_season_rewatch_catalog_season` ON `tv_season_rewatch` (`catalog_item_id`,`season_number`);
--> statement-breakpoint

-- Seed the separated publication and statistics projections for every current
-- media family. Conflict-tolerant inserts allow the migration to coexist with
-- databases that already contain prepared projection rows.
-- rewrite-backfill-start
INSERT OR IGNORE INTO `profile_media_channel` (`user_id`, `kind`, `enabled`, `views`)
SELECT `user_id`, `media_type`, `active`, `views`
FROM `user_media_settings`;
--> statement-breakpoint
INSERT OR IGNORE INTO `library_stats` (
	`user_id`, `kind`, `time_spent_minutes`, `total_entries`, `total_redo`,
	`entries_rated`, `rating_sum`, `entries_commented`, `entries_favorited`,
	`total_specific`, `status_counts`, `average_rating`
)
SELECT
	`user_id`, `media_type`, `time_spent`, `total_entries`, `total_redo`,
	`entries_rated`, `sum_entries_rated`, `entries_commented`, `entries_favorites`,
	`total_specific`, `status_counts`, `average_rating`
FROM `user_media_settings`;
--> statement-breakpoint

-- TV is the first vertical slice. Series and anime retain distinct kinds while
-- sharing the metadata model that is already identical in v1.
INSERT OR IGNORE INTO `catalog_item` (
	`kind`, `primary_provider`, `primary_external_id`, `name`, `release_date`,
	`synopsis`, `image_cover`, `locked`, `added_at`, `last_provider_update`
)
SELECT
	'series', 'tmdb', CAST(`api_id` AS text), `name`, `release_date`, `synopsis`,
	`image_cover`, COALESCE(`lock_status`, 0), COALESCE(`added_at`, CURRENT_TIMESTAMP), `last_api_update`
FROM `series`;
--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_item` (
	`kind`, `primary_provider`, `primary_external_id`, `name`, `release_date`,
	`synopsis`, `image_cover`, `locked`, `added_at`, `last_provider_update`
)
SELECT
	'anime', 'tmdb', CAST(`api_id` AS text), `name`, `release_date`, `synopsis`,
	`image_cover`, COALESCE(`lock_status`, 0), COALESCE(`added_at`, CURRENT_TIMESTAMP), `last_api_update`
FROM `anime`;
--> statement-breakpoint

INSERT OR IGNORE INTO `tv_details` (
	`catalog_item_id`, `original_name`, `last_air_date`, `homepage`, `created_by`,
	`episode_duration_minutes`, `total_seasons`, `total_episodes`, `origin_country`,
	`production_status`, `vote_average`, `vote_count`, `popularity`,
	`next_episode_season`, `next_episode_number`, `next_episode_air_date`
)
SELECT
	ci.`id`, s.`original_name`, s.`last_air_date`, s.`homepage`, s.`created_by`,
	s.`duration`, s.`total_seasons`, s.`total_episodes`, s.`origin_country`,
	s.`prod_status`, s.`vote_average`, s.`vote_count`, s.`popularity`,
	s.`season_to_air`, s.`episode_to_air`, s.`next_episode_to_air`
FROM `series` s
JOIN `catalog_item` ci
	ON ci.`kind` = 'series'
	AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text);
--> statement-breakpoint
INSERT OR IGNORE INTO `tv_details` (
	`catalog_item_id`, `original_name`, `last_air_date`, `homepage`, `created_by`,
	`episode_duration_minutes`, `total_seasons`, `total_episodes`, `origin_country`,
	`production_status`, `vote_average`, `vote_count`, `popularity`,
	`next_episode_season`, `next_episode_number`, `next_episode_air_date`
)
SELECT
	ci.`id`, a.`original_name`, a.`last_air_date`, a.`homepage`, a.`created_by`,
	a.`duration`, a.`total_seasons`, a.`total_episodes`, a.`origin_country`,
	a.`prod_status`, a.`vote_average`, a.`vote_count`, a.`popularity`,
	a.`season_to_air`, a.`episode_to_air`, a.`next_episode_to_air`
FROM `anime` a
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime'
	AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text);
--> statement-breakpoint

INSERT OR IGNORE INTO `tv_season` (`catalog_item_id`, `season_number`, `episode_count`)
SELECT ci.`id`, eps.`season`, MAX(eps.`episodes`, 0)
FROM `series_episodes_per_season` eps
JOIN `series` s ON s.`id` = eps.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
WHERE eps.`season` > 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `tv_season` (`catalog_item_id`, `season_number`, `episode_count`)
SELECT ci.`id`, eps.`season`, MAX(eps.`episodes`, 0)
FROM `anime_episodes_per_season` eps
JOIN `anime` a ON a.`id` = eps.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
WHERE eps.`season` > 0;
--> statement-breakpoint

INSERT OR IGNORE INTO `tv_actor` (`catalog_item_id`, `name`)
SELECT ci.`id`, actors.`name`
FROM `series_actors` actors
JOIN `series` s ON s.`id` = actors.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
WHERE length(trim(actors.`name`)) > 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `tv_actor` (`catalog_item_id`, `name`)
SELECT ci.`id`, actors.`name`
FROM `anime_actors` actors
JOIN `anime` a ON a.`id` = actors.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
WHERE length(trim(actors.`name`)) > 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `tv_network` (`catalog_item_id`, `name`)
SELECT ci.`id`, networks.`name`
FROM `series_network` networks
JOIN `series` s ON s.`id` = networks.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
WHERE length(trim(networks.`name`)) > 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `tv_network` (`catalog_item_id`, `name`)
SELECT ci.`id`, networks.`name`
FROM `anime_network` networks
JOIN `anime` a ON a.`id` = networks.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
WHERE length(trim(networks.`name`)) > 0;
--> statement-breakpoint

INSERT OR IGNORE INTO `catalog_genre` (`name`)
SELECT `name` FROM `series_genre` WHERE length(trim(`name`)) > 0
UNION
SELECT `name` FROM `anime_genre` WHERE length(trim(`name`)) > 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_item_genre` (`catalog_item_id`, `genre_id`)
SELECT ci.`id`, cg.`id`
FROM `series_genre` genres
JOIN `series` s ON s.`id` = genres.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
JOIN `catalog_genre` cg ON cg.`name` = genres.`name`;
--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_item_genre` (`catalog_item_id`, `genre_id`)
SELECT ci.`id`, cg.`id`
FROM `anime_genre` genres
JOIN `anime` a ON a.`id` = genres.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
JOIN `catalog_genre` cg ON cg.`name` = genres.`name`;
--> statement-breakpoint

INSERT OR IGNORE INTO `library_entry` (
	`user_id`, `catalog_item_id`, `status`, `favorite`, `comment`, `rating`,
	`custom_cover`, `added_at`, `updated_at`
)
SELECT
	l.`user_id`, ci.`id`, l.`status`, COALESCE(l.`favorite`, 0), l.`comment`, l.`rating`,
	l.`custom_cover`, COALESCE(l.`added_at`, CURRENT_TIMESTAMP), l.`last_updated`
FROM `series_list` l
JOIN `series` s ON s.`id` = l.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text);
--> statement-breakpoint
INSERT OR IGNORE INTO `library_entry` (
	`user_id`, `catalog_item_id`, `status`, `favorite`, `comment`, `rating`,
	`custom_cover`, `added_at`, `updated_at`
)
SELECT
	l.`user_id`, ci.`id`, l.`status`, COALESCE(l.`favorite`, 0), l.`comment`, l.`rating`,
	l.`custom_cover`, COALESCE(l.`added_at`, CURRENT_TIMESTAMP), l.`last_updated`
FROM `anime_list` l
JOIN `anime` a ON a.`id` = l.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text);
--> statement-breakpoint

INSERT OR IGNORE INTO `tv_progress` (`library_entry_id`, `current_season`, `current_episode`, `watched_episodes`)
SELECT
	le.`id`, MAX(l.`current_season`, 1), MAX(l.`current_episode`, 0),
	MAX(l.`total` - COALESCE((
		SELECT SUM(CAST(j.`value` AS integer) * eps.`episodes`)
		FROM json_each(l.`redo2`) j
		LEFT JOIN `series_episodes_per_season` eps
			ON eps.`media_id` = l.`media_id` AND eps.`season` = CAST(j.`key` AS integer) + 1
	), 0), 0)
FROM `series_list` l
JOIN `series` s ON s.`id` = l.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = l.`user_id` AND le.`catalog_item_id` = ci.`id`;
--> statement-breakpoint
INSERT OR IGNORE INTO `tv_progress` (`library_entry_id`, `current_season`, `current_episode`, `watched_episodes`)
SELECT
	le.`id`, MAX(l.`current_season`, 1), MAX(l.`current_episode`, 0),
	MAX(l.`total` - COALESCE((
		SELECT SUM(CAST(j.`value` AS integer) * eps.`episodes`)
		FROM json_each(l.`redo2`) j
		LEFT JOIN `anime_episodes_per_season` eps
			ON eps.`media_id` = l.`media_id` AND eps.`season` = CAST(j.`key` AS integer) + 1
	), 0), 0)
FROM `anime_list` l
JOIN `anime` a ON a.`id` = l.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = l.`user_id` AND le.`catalog_item_id` = ci.`id`;
--> statement-breakpoint

INSERT OR IGNORE INTO `tv_season_rewatch` (`library_entry_id`, `catalog_item_id`, `season_number`, `count`)
SELECT le.`id`, ci.`id`, CAST(j.`key` AS integer) + 1, MIN(CAST(j.`value` AS integer), 100)
FROM `series_list` l, json_each(l.`redo2`) j
JOIN `series` s ON s.`id` = l.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = l.`user_id` AND le.`catalog_item_id` = ci.`id`
JOIN `tv_season` season
	ON season.`catalog_item_id` = ci.`id` AND season.`season_number` = CAST(j.`key` AS integer) + 1
WHERE CAST(j.`value` AS integer) > 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `tv_season_rewatch` (`library_entry_id`, `catalog_item_id`, `season_number`, `count`)
SELECT le.`id`, ci.`id`, CAST(j.`key` AS integer) + 1, MIN(CAST(j.`value` AS integer), 100)
FROM `anime_list` l, json_each(l.`redo2`) j
JOIN `anime` a ON a.`id` = l.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = l.`user_id` AND le.`catalog_item_id` = ci.`id`
JOIN `tv_season` season
	ON season.`catalog_item_id` = ci.`id` AND season.`season_number` = CAST(j.`key` AS integer) + 1
WHERE CAST(j.`value` AS integer) > 0;
--> statement-breakpoint

INSERT OR IGNORE INTO `library_tag` (`user_id`, `kind`, `name`)
SELECT `user_id`, 'series', `name` FROM `series_tags` WHERE length(trim(`name`)) > 0
UNION
SELECT `user_id`, 'anime', `name` FROM `anime_tags` WHERE length(trim(`name`)) > 0;
--> statement-breakpoint
INSERT OR IGNORE INTO `library_entry_tag` (`library_entry_id`, `tag_id`)
SELECT le.`id`, tag.`id`
FROM `series_tags` old_tag
JOIN `series` s ON s.`id` = old_tag.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = old_tag.`user_id` AND le.`catalog_item_id` = ci.`id`
JOIN `library_tag` tag
	ON tag.`user_id` = old_tag.`user_id` AND tag.`kind` = 'series' AND tag.`name` = old_tag.`name`
WHERE old_tag.`media_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `library_entry_tag` (`library_entry_id`, `tag_id`)
SELECT le.`id`, tag.`id`
FROM `anime_tags` old_tag
JOIN `anime` a ON a.`id` = old_tag.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = old_tag.`user_id` AND le.`catalog_item_id` = ci.`id`
JOIN `library_tag` tag
	ON tag.`user_id` = old_tag.`user_id` AND tag.`kind` = 'anime' AND tag.`name` = old_tag.`name`
WHERE old_tag.`media_id` IS NOT NULL;
--> statement-breakpoint

INSERT OR IGNORE INTO `library_change` (`library_entry_id`, `update_type`, `payload`, `occurred_at`)
SELECT
	le.`id`, updates.`update_type`,
	CASE WHEN updates.`payload` IS NULL THEN NULL ELSE json_object(
		'oldValue', json_extract(updates.`payload`, '$.old_value'),
		'newValue', json_extract(updates.`payload`, '$.new_value')
	) END,
	updates.`timestamp`
FROM `user_media_update` updates
JOIN `series` s ON updates.`media_type` = 'series' AND s.`id` = updates.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = updates.`user_id` AND le.`catalog_item_id` = ci.`id`
UNION ALL
SELECT
	le.`id`, updates.`update_type`,
	CASE WHEN updates.`payload` IS NULL THEN NULL ELSE json_object(
		'oldValue', json_extract(updates.`payload`, '$.old_value'),
		'newValue', json_extract(updates.`payload`, '$.new_value')
	) END,
	updates.`timestamp`
FROM `user_media_update` updates
JOIN `anime` a ON updates.`media_type` = 'anime' AND a.`id` = updates.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = updates.`user_id` AND le.`catalog_item_id` = ci.`id`;
--> statement-breakpoint

INSERT OR IGNORE INTO `library_activity` (
	`library_entry_id`, `units_gained`, `completed`, `redo`, `hidden`, `month_bucket`, `last_updated_at`
)
SELECT
	le.`id`, activity.`specific_gained`, activity.`is_completed`, activity.`is_redo`,
	activity.`hidden`, activity.`month_bucket`, activity.`last_update`
FROM `user_media_activity` activity
JOIN `series` s ON activity.`media_type` = 'series' AND s.`id` = activity.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'series' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(s.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = activity.`user_id` AND le.`catalog_item_id` = ci.`id`
UNION ALL
SELECT
	le.`id`, activity.`specific_gained`, activity.`is_completed`, activity.`is_redo`,
	activity.`hidden`, activity.`month_bucket`, activity.`last_update`
FROM `user_media_activity` activity
JOIN `anime` a ON activity.`media_type` = 'anime' AND a.`id` = activity.`media_id`
JOIN `catalog_item` ci
	ON ci.`kind` = 'anime' AND ci.`primary_provider` = 'tmdb'
	AND ci.`primary_external_id` = CAST(a.`api_id` AS text)
JOIN `library_entry` le ON le.`user_id` = activity.`user_id` AND le.`catalog_item_id` = ci.`id`;
