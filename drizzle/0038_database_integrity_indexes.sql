PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Keep the oldest row for media metadata where historical imports inserted the same value more than once.
DELETE FROM `series_actors` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `series_actors` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `series_genre` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `series_genre` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `series_network` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `series_network` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `anime_actors` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `anime_actors` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `anime_genre` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `anime_genre` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `anime_network` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `anime_network` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `movies_actors` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `movies_actors` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `movies_genre` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `movies_genre` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `games_genre` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `games_genre` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `games_platforms` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `games_platforms` GROUP BY `media_id`, `name`);--> statement-breakpoint
UPDATE `games_companies` SET `publisher` = COALESCE(`publisher`, 0), `developer` = COALESCE(`developer`, 0);--> statement-breakpoint
DELETE FROM `games_companies` WHERE `id` NOT IN (
	SELECT MIN(`id`) FROM `games_companies` GROUP BY `media_id`, `name`, `publisher`, `developer`
);--> statement-breakpoint
DELETE FROM `books_authors` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `books_authors` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `books_genre` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `books_genre` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `manga_authors` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `manga_authors` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `manga_genre` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `manga_genre` GROUP BY `media_id`, `name`);--> statement-breakpoint
DELETE FROM `series_episodes_per_season` WHERE `id` NOT IN (
	SELECT MIN(`id`) FROM `series_episodes_per_season` GROUP BY `media_id`, `season`
);--> statement-breakpoint
DELETE FROM `anime_episodes_per_season` WHERE `id` NOT IN (
	SELECT MIN(`id`) FROM `anime_episodes_per_season` GROUP BY `media_id`, `season`
);--> statement-breakpoint
DELETE FROM `series_tags` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `series_tags` GROUP BY `user_id`, `media_id`, `name`);--> statement-breakpoint
DELETE FROM `anime_tags` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `anime_tags` GROUP BY `user_id`, `media_id`, `name`);--> statement-breakpoint
DELETE FROM `movies_tags` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `movies_tags` GROUP BY `user_id`, `media_id`, `name`);--> statement-breakpoint
DELETE FROM `games_tags` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `games_tags` GROUP BY `user_id`, `media_id`, `name`);--> statement-breakpoint
DELETE FROM `books_tags` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `books_tags` GROUP BY `user_id`, `media_id`, `name`);--> statement-breakpoint
DELETE FROM `manga_tags` WHERE `id` NOT IN (SELECT MIN(`id`) FROM `manga_tags` GROUP BY `user_id`, `media_id`, `name`);--> statement-breakpoint
CREATE TABLE `__new_profile_custom` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "profile_custom_value_json_check" CHECK(json_valid("__new_profile_custom"."value"))
);
--> statement-breakpoint
INSERT INTO `__new_profile_custom`("id", "user_id", "key", "value", "created_at", "updated_at") SELECT "id", "user_id", "key", "value", "created_at", "updated_at" FROM `profile_custom`;--> statement-breakpoint
DROP TABLE `profile_custom`;--> statement-breakpoint
ALTER TABLE `__new_profile_custom` RENAME TO `profile_custom`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_profile_custom_user_id_key` ON `profile_custom` (`user_id`,`key`);--> statement-breakpoint
CREATE TABLE `__new_user_media_activity` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`specific_gained` real NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`is_redo` integer DEFAULT false NOT NULL,
	`month_bucket` text NOT NULL,
	`last_update` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_media_activity_specific_nonnegative_check" CHECK("__new_user_media_activity"."specific_gained" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_user_media_activity`("id", "user_id", "media_id", "media_type", "specific_gained", "is_completed", "is_redo", "month_bucket", "last_update", "hidden") SELECT "id", "user_id", "media_id", "media_type", "specific_gained", "is_completed", "is_redo", "month_bucket", "last_update", "hidden" FROM `user_media_activity`;--> statement-breakpoint
DROP TABLE `user_media_activity`;--> statement-breakpoint
ALTER TABLE `__new_user_media_activity` RENAME TO `user_media_activity`;--> statement-breakpoint
CREATE INDEX `ix_user_media_activity_media_id` ON `user_media_activity` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_user_media_activity_media_type` ON `user_media_activity` (`media_type`);--> statement-breakpoint
CREATE INDEX `ix_user_media_activity_month_bucket` ON `user_media_activity` (`month_bucket`);--> statement-breakpoint
CREATE INDEX `ix_user_media_activity_user_last_update` ON `user_media_activity` (`user_id`,`last_update`);--> statement-breakpoint
CREATE INDEX `ix_user_media_activity_user_month_type_update` ON `user_media_activity` (`user_id`,`month_bucket`,`media_type`,`last_update`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_media_month_idx` ON `user_media_activity` (`user_id`,`media_id`,`media_type`,`month_bucket`);--> statement-breakpoint
DROP INDEX `ix_user_media_update_media_id`;--> statement-breakpoint
DROP INDEX `ix_user_media_update_media_type`;--> statement-breakpoint
DROP INDEX `ix_user_media_update_user_id`;--> statement-breakpoint
CREATE INDEX `ix_user_media_update_media_type_media_id` ON `user_media_update` (`media_type`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_user_media_update_user_timestamp` ON `user_media_update` (`user_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `ix_user_media_update_user_media_kind_timestamp` ON `user_media_update` (`user_id`,`media_type`,`media_id`,`update_type`,`timestamp`);--> statement-breakpoint
CREATE TABLE `__new_api_call_rollup` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`bucket_start_ms` integer NOT NULL,
	`bucket_start` text NOT NULL,
	`total` integer NOT NULL,
	`errors` integer NOT NULL,
	`duration_ms_total` integer NOT NULL,
	`max_second_burst` integer NOT NULL,
	`status_counts` text NOT NULL,
	CONSTRAINT "api_call_rollup_counts_nonnegative_check" CHECK(
        "__new_api_call_rollup"."total" >= 0 AND "__new_api_call_rollup"."errors" >= 0 AND "__new_api_call_rollup"."duration_ms_total" >= 0
        AND "__new_api_call_rollup"."max_second_burst" >= 0
    ),
	CONSTRAINT "api_call_rollup_errors_not_above_total_check" CHECK("__new_api_call_rollup"."errors" <= "__new_api_call_rollup"."total"),
	CONSTRAINT "api_call_rollup_status_counts_json_check" CHECK(json_valid("__new_api_call_rollup"."status_counts"))
);
--> statement-breakpoint
INSERT INTO `__new_api_call_rollup`("id", "provider", "bucket_start_ms", "bucket_start", "total", "errors", "duration_ms_total", "max_second_burst", "status_counts") SELECT "id", "provider", "bucket_start_ms", "bucket_start", "total", "errors", "duration_ms_total", "max_second_burst", "status_counts" FROM `api_call_rollup`;--> statement-breakpoint
DROP TABLE `api_call_rollup`;--> statement-breakpoint
ALTER TABLE `__new_api_call_rollup` RENAME TO `api_call_rollup`;--> statement-breakpoint
CREATE INDEX `ix_api_call_rollup_provider` ON `api_call_rollup` (`provider`);--> statement-breakpoint
CREATE INDEX `ix_api_call_rollup_bucket_start` ON `api_call_rollup` (`bucket_start`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_api_call_rollup_bucket_provider` ON `api_call_rollup` (`bucket_start_ms`,`provider`);--> statement-breakpoint
DROP INDEX `ix_feature_votes_feature_id`;--> statement-breakpoint
CREATE TABLE `__new_collection_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`annotation` text,
	`media_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	`media_type` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "collection_items_order_nonnegative_check" CHECK("__new_collection_items"."order_index" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_collection_items`("id", "collection_id", "annotation", "media_id", "order_index", "media_type", "created_at") SELECT "id", "collection_id", "annotation", "media_id", "order_index", "media_type", "created_at" FROM `collection_items`;--> statement-breakpoint
DROP TABLE `collection_items`;--> statement-breakpoint
ALTER TABLE `__new_collection_items` RENAME TO `collection_items`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collection_items_collection_media` ON `collection_items` (`collection_id`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collection_items_collection_order` ON `collection_items` (`collection_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `ix_collection_items_media_type_media_collection` ON `collection_items` (`media_type`,`media_id`,`collection_id`);--> statement-breakpoint
DROP INDEX `ix_collection_likes_collection_id`;--> statement-breakpoint
CREATE TABLE `__new_games_companies` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	`publisher` integer DEFAULT false NOT NULL,
	`developer` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_games_companies`("id", "media_id", "name", "publisher", "developer") SELECT "id", "media_id", "name", "publisher", "developer" FROM `games_companies`;--> statement-breakpoint
DROP TABLE `games_companies`;--> statement-breakpoint
ALTER TABLE `__new_games_companies` RENAME TO `games_companies`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_companies_media_name_roles` ON `games_companies` (`media_id`,`name`,`publisher`,`developer`);--> statement-breakpoint
CREATE INDEX `ix_games_companies_name_media` ON `games_companies` (`name`,`media_id`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `__new_followers` (
	`follower_id` integer NOT NULL,
	`followed_id` integer NOT NULL,
	`status` text DEFAULT 'accepted' NOT NULL,
	FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`followed_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "followers_not_self_check" CHECK("__new_followers"."follower_id" <> "__new_followers"."followed_id")
);
--> statement-breakpoint
INSERT INTO `__new_followers`("follower_id", "followed_id", "status") SELECT "follower_id", "followed_id", "status" FROM `followers`;--> statement-breakpoint
DROP TABLE `followers`;--> statement-breakpoint
ALTER TABLE `__new_followers` RENAME TO `followers`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_followers_follower_followed` ON `followers` (`follower_id`,`followed_id`);--> statement-breakpoint
CREATE INDEX `ix_followers_followed_status_follower` ON `followers` (`followed_id`,`status`,`follower_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_actors_media_name` ON `series_actors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_series_actors_name_media` ON `series_actors` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_episodes_per_season_media_season` ON `series_episodes_per_season` (`media_id`,`season`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_genre_media_name` ON `series_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_series_genre_name_media` ON `series_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_network_media_name` ON `series_network` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_series_network_name_media` ON `series_network` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_tags_user_media_name` ON `series_tags` (`user_id`,`media_id`,`name`) WHERE "series_tags"."media_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_tags_user_placeholder_name` ON `series_tags` (`user_id`,`name`) WHERE "series_tags"."media_id" IS NULL;--> statement-breakpoint
CREATE INDEX `ix_series_tags_user_name_media` ON `series_tags` (`user_id`,`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_actors_media_name` ON `anime_actors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_anime_actors_name_media` ON `anime_actors` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_episodes_per_season_media_season` ON `anime_episodes_per_season` (`media_id`,`season`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_genre_media_name` ON `anime_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_anime_genre_name_media` ON `anime_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_network_media_name` ON `anime_network` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_anime_network_name_media` ON `anime_network` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_tags_user_media_name` ON `anime_tags` (`user_id`,`media_id`,`name`) WHERE "anime_tags"."media_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_tags_user_placeholder_name` ON `anime_tags` (`user_id`,`name`) WHERE "anime_tags"."media_id" IS NULL;--> statement-breakpoint
CREATE INDEX `ix_anime_tags_user_name_media` ON `anime_tags` (`user_id`,`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_actors_media_name` ON `movies_actors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_movies_actors_name_media` ON `movies_actors` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_genre_media_name` ON `movies_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_movies_genre_name_media` ON `movies_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_tags_user_media_name` ON `movies_tags` (`user_id`,`media_id`,`name`) WHERE "movies_tags"."media_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_tags_user_placeholder_name` ON `movies_tags` (`user_id`,`name`) WHERE "movies_tags"."media_id" IS NULL;--> statement-breakpoint
CREATE INDEX `ix_movies_tags_user_name_media` ON `movies_tags` (`user_id`,`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_genre_media_name` ON `games_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_games_genre_name_media` ON `games_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_platforms_media_name` ON `games_platforms` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_games_platforms_name_media` ON `games_platforms` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_tags_user_media_name` ON `games_tags` (`user_id`,`media_id`,`name`) WHERE "games_tags"."media_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_tags_user_placeholder_name` ON `games_tags` (`user_id`,`name`) WHERE "games_tags"."media_id" IS NULL;--> statement-breakpoint
CREATE INDEX `ix_games_tags_user_name_media` ON `games_tags` (`user_id`,`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_authors_media_name` ON `books_authors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_books_authors_name_media` ON `books_authors` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_genre_media_name` ON `books_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_books_genre_name_media` ON `books_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_tags_user_media_name` ON `books_tags` (`user_id`,`media_id`,`name`) WHERE "books_tags"."media_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_tags_user_placeholder_name` ON `books_tags` (`user_id`,`name`) WHERE "books_tags"."media_id" IS NULL;--> statement-breakpoint
CREATE INDEX `ix_books_tags_user_name_media` ON `books_tags` (`user_id`,`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_authors_media_name` ON `manga_authors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_manga_authors_name_media` ON `manga_authors` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_genre_media_name` ON `manga_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_manga_genre_name_media` ON `manga_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_tags_user_media_name` ON `manga_tags` (`user_id`,`media_id`,`name`) WHERE "manga_tags"."media_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_tags_user_placeholder_name` ON `manga_tags` (`user_id`,`name`) WHERE "manga_tags"."media_id" IS NULL;--> statement-breakpoint
CREATE INDEX `ix_manga_tags_user_name_media` ON `manga_tags` (`user_id`,`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_daily_mediadle` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_type` text NOT NULL,
	`media_id` integer NOT NULL,
	`date` text NOT NULL,
	`pixelation_levels` integer DEFAULT 5 NOT NULL,
	CONSTRAINT "daily_mediadle_pixelation_levels_positive_check" CHECK("__new_daily_mediadle"."pixelation_levels" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_daily_mediadle`("id", "media_type", "media_id", "date", "pixelation_levels") SELECT "id", "media_type", "media_id", "date", "pixelation_levels" FROM `daily_mediadle`;--> statement-breakpoint
DROP TABLE `daily_mediadle`;--> statement-breakpoint
ALTER TABLE `__new_daily_mediadle` RENAME TO `daily_mediadle`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_daily_mediadle_type_date` ON `daily_mediadle` (`media_type`,`date`);--> statement-breakpoint
CREATE TABLE `__new_mediadle_stats` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`total_played` integer,
	`total_won` integer,
	`average_attempts` real,
	`streak` integer,
	`best_streak` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "mediadle_stats_nonnegative_check" CHECK(
        ("__new_mediadle_stats"."total_played" IS NULL OR "__new_mediadle_stats"."total_played" >= 0)
        AND ("__new_mediadle_stats"."total_won" IS NULL OR "__new_mediadle_stats"."total_won" >= 0)
        AND ("__new_mediadle_stats"."average_attempts" IS NULL OR "__new_mediadle_stats"."average_attempts" >= 0)
        AND ("__new_mediadle_stats"."streak" IS NULL OR "__new_mediadle_stats"."streak" >= 0)
        AND ("__new_mediadle_stats"."best_streak" IS NULL OR "__new_mediadle_stats"."best_streak" >= 0)
    ),
	CONSTRAINT "mediadle_stats_wins_not_above_played_check" CHECK(
        "__new_mediadle_stats"."total_won" IS NULL OR "__new_mediadle_stats"."total_played" IS NULL OR "__new_mediadle_stats"."total_won" <= "__new_mediadle_stats"."total_played"
    )
);
--> statement-breakpoint
INSERT INTO `__new_mediadle_stats`("id", "user_id", "media_type", "total_played", "total_won", "average_attempts", "streak", "best_streak") SELECT "id", "user_id", "media_type", "total_played", "total_won", "average_attempts", "streak", "best_streak" FROM `mediadle_stats`;--> statement-breakpoint
DROP TABLE `mediadle_stats`;--> statement-breakpoint
ALTER TABLE `__new_mediadle_stats` RENAME TO `mediadle_stats`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_mediadle_stats_user_type` ON `mediadle_stats` (`user_id`,`media_type`);--> statement-breakpoint
CREATE TABLE `__new_user_mediadle_progress` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`daily_mediadle_id` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`succeeded` integer DEFAULT false NOT NULL,
	`completion_time` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`daily_mediadle_id`) REFERENCES `daily_mediadle`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_mediadle_progress_attempts_nonnegative_check" CHECK("__new_user_mediadle_progress"."attempts" >= 0),
	CONSTRAINT "user_mediadle_progress_success_completed_check" CHECK("__new_user_mediadle_progress"."succeeded" <= "__new_user_mediadle_progress"."completed")
);
--> statement-breakpoint
INSERT INTO `__new_user_mediadle_progress`("id", "user_id", "daily_mediadle_id", "attempts", "completed", "succeeded", "completion_time") SELECT "id", "user_id", "daily_mediadle_id", "attempts", "completed", "succeeded", "completion_time" FROM `user_mediadle_progress`;--> statement-breakpoint
DROP TABLE `user_mediadle_progress`;--> statement-breakpoint
ALTER TABLE `__new_user_mediadle_progress` RENAME TO `user_mediadle_progress`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_mediadle_progress_user_daily` ON `user_mediadle_progress` (`user_id`,`daily_mediadle_id`);--> statement-breakpoint
CREATE TABLE `__new_which_came_first_rounds` (
	`id` integer PRIMARY KEY NOT NULL,
	`run_id` integer NOT NULL,
	`round_number` integer NOT NULL,
	`left_media_id` integer NOT NULL,
	`left_release_date` text NOT NULL,
	`right_media_id` integer NOT NULL,
	`right_release_date` text NOT NULL,
	`correct` integer,
	`selected_side` text,
	`left_media_type` text NOT NULL,
	`right_media_type` text NOT NULL,
	`answered_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `which_came_first_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "wcf_round_number_positive_check" CHECK("__new_which_came_first_rounds"."round_number" >= 1),
	CONSTRAINT "wcf_round_selected_side_check" CHECK("__new_which_came_first_rounds"."selected_side" IS NULL OR "__new_which_came_first_rounds"."selected_side" IN ('left', 'right')),
	CONSTRAINT "wcf_round_answer_consistency_check" CHECK(
        ("__new_which_came_first_rounds"."answered_at" IS NULL AND "__new_which_came_first_rounds"."selected_side" IS NULL AND "__new_which_came_first_rounds"."correct" IS NULL)
        OR ("__new_which_came_first_rounds"."answered_at" IS NOT NULL AND "__new_which_came_first_rounds"."selected_side" IS NOT NULL AND "__new_which_came_first_rounds"."correct" IS NOT NULL)
    )
);
--> statement-breakpoint
INSERT INTO `__new_which_came_first_rounds`("id", "run_id", "round_number", "left_media_id", "left_release_date", "right_media_id", "right_release_date", "correct", "selected_side", "left_media_type", "right_media_type", "answered_at", "created_at") SELECT "id", "run_id", "round_number", "left_media_id", "left_release_date", "right_media_id", "right_release_date", "correct", "selected_side", "left_media_type", "right_media_type", "answered_at", "created_at" FROM `which_came_first_rounds`;--> statement-breakpoint
DROP TABLE `which_came_first_rounds`;--> statement-breakpoint
ALTER TABLE `__new_which_came_first_rounds` RENAME TO `which_came_first_rounds`;--> statement-breakpoint
CREATE INDEX `ix_wcf_round_run_answered` ON `which_came_first_rounds` (`run_id`,`answered_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_wcf_round_run_number` ON `which_came_first_rounds` (`run_id`,`round_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_wcf_round_run_unanswered` ON `which_came_first_rounds` (`run_id`) WHERE "which_came_first_rounds"."answered_at" IS NULL;--> statement-breakpoint
CREATE TABLE `__new_which_came_first_runs` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`completed_at` text,
	`score` integer DEFAULT 0 NOT NULL,
	`started_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`selected_media_types` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "wcf_runs_score_nonnegative_check" CHECK("__new_which_came_first_runs"."score" >= 0),
	CONSTRAINT "wcf_runs_selected_media_types_json_check" CHECK(json_valid("__new_which_came_first_runs"."selected_media_types"))
);
--> statement-breakpoint
INSERT INTO `__new_which_came_first_runs`("id", "user_id", "completed_at", "score", "started_at", "selected_media_types", "status") SELECT "id", "user_id", "completed_at", "score", "started_at", "selected_media_types", "status" FROM `which_came_first_runs`;--> statement-breakpoint
DROP TABLE `which_came_first_runs`;--> statement-breakpoint
ALTER TABLE `__new_which_came_first_runs` RENAME TO `which_came_first_runs`;--> statement-breakpoint
CREATE INDEX `ix_wcf_runs_user_status` ON `which_came_first_runs` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `ix_wcf_runs_user_completed` ON `which_came_first_runs` (`user_id`,`completed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_wcf_runs_user_active` ON `which_came_first_runs` (`user_id`) WHERE "which_came_first_runs"."status" = 'active';--> statement-breakpoint
CREATE TABLE `__new_user_achievement` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`achievement_id` integer NOT NULL,
	`tier_id` integer NOT NULL,
	`progress` real,
	`count` real,
	`completed` integer,
	`completed_at` text,
	`last_calculated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievement`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tier_id`) REFERENCES `achievement_tier`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_achievement_progress_range_check" CHECK("__new_user_achievement"."progress" IS NULL OR ("__new_user_achievement"."progress" >= 0 AND "__new_user_achievement"."progress" <= 100)),
	CONSTRAINT "user_achievement_count_nonnegative_check" CHECK("__new_user_achievement"."count" IS NULL OR "__new_user_achievement"."count" >= 0),
	CONSTRAINT "user_achievement_completed_check" CHECK("__new_user_achievement"."completed" IS NULL OR "__new_user_achievement"."completed" IN (0, 1)),
	CONSTRAINT "user_achievement_completed_at_check" CHECK("__new_user_achievement"."completed" IS NULL OR "__new_user_achievement"."completed" = 0 OR "__new_user_achievement"."completed_at" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_user_achievement`("id", "user_id", "achievement_id", "tier_id", "progress", "count", "completed", "completed_at", "last_calculated_at") SELECT "id", "user_id", "achievement_id", "tier_id", "progress", "count", "completed", "completed_at", "last_calculated_at" FROM `user_achievement`;--> statement-breakpoint
DROP TABLE `user_achievement`;--> statement-breakpoint
ALTER TABLE `__new_user_achievement` RENAME TO `user_achievement`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_achievement_user_tier_unique_idx` ON `user_achievement` (`user_id`,`tier_id`);--> statement-breakpoint
CREATE INDEX `ix_user_achievement_achievement_user` ON `user_achievement` (`achievement_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `ix_user_achievement_user_completed_at` ON `user_achievement` (`user_id`,`completed_at`) WHERE "user_achievement"."completed" = 1;--> statement-breakpoint
CREATE INDEX `ix_user_achievement_completed_tier` ON `user_achievement` (`tier_id`) WHERE "user_achievement"."completed" = 1;--> statement-breakpoint
CREATE TABLE `__new_media_notifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`media_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`season` integer,
	`episode` integer,
	`is_season_finale` integer,
	`release_date` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "media_notifications_season_finale_check" CHECK("__new_media_notifications"."is_season_finale" IS NULL OR "__new_media_notifications"."is_season_finale" IN (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_media_notifications`("id", "user_id", "name", "media_id", "media_type", "season", "episode", "is_season_finale", "release_date", "read", "created_at") SELECT "id", "user_id", "name", "media_id", "media_type", "season", "episode", "is_season_finale", "release_date", "read", "created_at" FROM `media_notifications`;--> statement-breakpoint
DROP TABLE `media_notifications`;--> statement-breakpoint
ALTER TABLE `__new_media_notifications` RENAME TO `media_notifications`;--> statement-breakpoint
CREATE INDEX `ix_media_notifications_user_created_at` ON `media_notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_media_notifications_media_user_created_at` ON `media_notifications` (`media_type`,`media_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_media_notifications_user_unread` ON `media_notifications` (`user_id`) WHERE "media_notifications"."read" = 0;--> statement-breakpoint
CREATE INDEX `ix_social_notifications_user_created_at` ON `social_notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_social_notifications_user_unread` ON `social_notifications` (`user_id`) WHERE "social_notifications"."read" = 0;--> statement-breakpoint
CREATE TABLE `__new_user_media_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`time_spent` integer DEFAULT 0 NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`active` integer NOT NULL,
	`total_entries` integer DEFAULT 0 NOT NULL,
	`total_redo` integer DEFAULT 0 NOT NULL,
	`entries_rated` integer DEFAULT 0 NOT NULL,
	`sum_entries_rated` integer DEFAULT 0 NOT NULL,
	`entries_commented` integer DEFAULT 0 NOT NULL,
	`entries_favorites` integer DEFAULT 0 NOT NULL,
	`total_specific` integer DEFAULT 0 NOT NULL,
	`status_counts` text DEFAULT '{}' NOT NULL,
	`average_rating` real,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_media_settings_counters_nonnegative_check" CHECK(
        "__new_user_media_settings"."time_spent" >= 0 AND "__new_user_media_settings"."views" >= 0 AND "__new_user_media_settings"."total_entries" >= 0
        AND "__new_user_media_settings"."total_redo" >= 0 AND "__new_user_media_settings"."entries_rated" >= 0
        AND "__new_user_media_settings"."sum_entries_rated" >= 0 AND "__new_user_media_settings"."entries_commented" >= 0
        AND "__new_user_media_settings"."entries_favorites" >= 0 AND "__new_user_media_settings"."total_specific" >= 0
    ),
	CONSTRAINT "user_media_settings_status_counts_json_check" CHECK(json_valid("__new_user_media_settings"."status_counts"))
);
--> statement-breakpoint
INSERT INTO `__new_user_media_settings`("id", "user_id", "media_type", "time_spent", "views", "active", "total_entries", "total_redo", "entries_rated", "sum_entries_rated", "entries_commented", "entries_favorites", "total_specific", "status_counts", "average_rating") SELECT "id", "user_id", "media_type", "time_spent", "views", "active", "total_entries", "total_redo", "entries_rated", "sum_entries_rated", "entries_commented", "entries_favorites", "total_specific", "status_counts", "average_rating" FROM `user_media_settings`;--> statement-breakpoint
DROP TABLE `user_media_settings`;--> statement-breakpoint
ALTER TABLE `__new_user_media_settings` RENAME TO `user_media_settings`;--> statement-breakpoint
CREATE INDEX `ix_user_media_settings_media_type` ON `user_media_settings` (`media_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_id_media_type` ON `user_media_settings` (`user_id`,`media_type`);--> statement-breakpoint
CREATE TABLE `__new_user_media_stats_history` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`time_spent` integer DEFAULT 0 NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`active` integer NOT NULL,
	`total_entries` integer DEFAULT 0 NOT NULL,
	`total_redo` integer DEFAULT 0 NOT NULL,
	`entries_rated` integer DEFAULT 0 NOT NULL,
	`sum_entries_rated` integer DEFAULT 0 NOT NULL,
	`entries_commented` integer DEFAULT 0 NOT NULL,
	`entries_favorites` integer DEFAULT 0 NOT NULL,
	`total_specific` integer DEFAULT 0 NOT NULL,
	`status_counts` text DEFAULT '{}' NOT NULL,
	`average_rating` real,
	`timestamp` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`media_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_media_stats_history_status_counts_json_check" CHECK(json_valid("__new_user_media_stats_history"."status_counts"))
);
--> statement-breakpoint
INSERT INTO `__new_user_media_stats_history`("id", "user_id", "media_type", "time_spent", "views", "active", "total_entries", "total_redo", "entries_rated", "sum_entries_rated", "entries_commented", "entries_favorites", "total_specific", "status_counts", "average_rating", "timestamp", "media_id") SELECT "id", "user_id", "media_type", "time_spent", "views", "active", "total_entries", "total_redo", "entries_rated", "sum_entries_rated", "entries_commented", "entries_favorites", "total_specific", "status_counts", "average_rating", "timestamp", "media_id" FROM `user_media_stats_history`;--> statement-breakpoint
DROP TABLE `user_media_stats_history`;--> statement-breakpoint
ALTER TABLE `__new_user_media_stats_history` RENAME TO `user_media_stats_history`;--> statement-breakpoint
CREATE INDEX `ix_user_media_stats_history_user_id` ON `user_media_stats_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_user_media_stats_history_media_type` ON `user_media_stats_history` (`media_type`);--> statement-breakpoint
CREATE INDEX `ix_user_media_stats_history_timestamp` ON `user_media_stats_history` (`timestamp`);--> statement-breakpoint
CREATE TABLE `__new_series_list` (
	`current_season` integer NOT NULL,
	`current_episode` integer NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`redo2` text DEFAULT '[]' NOT NULL,
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
	CONSTRAINT "series_list_redo2_json_check" CHECK(json_valid("__new_series_list"."redo2"))
);
--> statement-breakpoint
INSERT INTO `__new_series_list`("current_season", "current_episode", "redo", "total", "redo2", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_season", "current_episode", "redo", "total", "redo2", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `series_list`;--> statement-breakpoint
DROP TABLE `series_list`;--> statement-breakpoint
ALTER TABLE `__new_series_list` RENAME TO `series_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_list_user_media` ON `series_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_series_list_user_media_rated` ON `series_list` (`user_id`,`media_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_series_list_media_user_rated` ON `series_list` (`media_id`,`user_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_anime_list` (
	`current_season` integer NOT NULL,
	`current_episode` integer NOT NULL,
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`redo2` text DEFAULT '[]' NOT NULL,
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
	CONSTRAINT "anime_list_redo2_json_check" CHECK(json_valid("__new_anime_list"."redo2"))
);
--> statement-breakpoint
INSERT INTO `__new_anime_list`("current_season", "current_episode", "redo", "total", "redo2", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_season", "current_episode", "redo", "total", "redo2", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `anime_list`;--> statement-breakpoint
DROP TABLE `anime_list`;--> statement-breakpoint
ALTER TABLE `__new_anime_list` RENAME TO `anime_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_list_user_media` ON `anime_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_list_user_media_rated` ON `anime_list` (`user_id`,`media_id`) WHERE "anime_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_user_rated` ON `anime_list` (`media_id`,`user_id`) WHERE "anime_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_movies_list` (
	`redo` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
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
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movies_list_rating_check" CHECK("__new_movies_list"."rating" IS NULL OR ("__new_movies_list"."rating" >= 0 AND "__new_movies_list"."rating" <= 10))
);
--> statement-breakpoint
INSERT INTO `__new_movies_list`("redo", "total", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "redo", "total", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `movies_list`;--> statement-breakpoint
DROP TABLE `movies_list`;--> statement-breakpoint
ALTER TABLE `__new_movies_list` RENAME TO `movies_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_list_user_media` ON `movies_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_movies_list_user_media_rated` ON `movies_list` (`user_id`,`media_id`) WHERE "movies_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_movies_list_media_user_rated` ON `movies_list` (`media_id`,`user_id`) WHERE "movies_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_games_list` (
	`playtime` integer DEFAULT 0,
	`platform` text,
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
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "games_list_rating_check" CHECK("__new_games_list"."rating" IS NULL OR ("__new_games_list"."rating" >= 0 AND "__new_games_list"."rating" <= 10))
);
--> statement-breakpoint
INSERT INTO `__new_games_list`("playtime", "platform", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "playtime", "platform", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `games_list`;--> statement-breakpoint
DROP TABLE `games_list`;--> statement-breakpoint
ALTER TABLE `__new_games_list` RENAME TO `games_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_list_user_media` ON `games_list` (`user_id`,`media_id`);--> statement-breakpoint
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
	`favorite` integer,
	`comment` text,
	`rating` real,
	`custom_cover` text,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_updated` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "books_list_rating_check" CHECK("__new_books_list"."rating" IS NULL OR ("__new_books_list"."rating" >= 0 AND "__new_books_list"."rating" <= 10))
);
--> statement-breakpoint
INSERT INTO `__new_books_list`("actual_page", "redo", "total", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "actual_page", "redo", "total", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `books_list`;--> statement-breakpoint
DROP TABLE `books_list`;--> statement-breakpoint
ALTER TABLE `__new_books_list` RENAME TO `books_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_list_user_media` ON `books_list` (`user_id`,`media_id`);--> statement-breakpoint
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
	`favorite` integer,
	`comment` text,
	`rating` real,
	`custom_cover` text,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_updated` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "manga_list_rating_check" CHECK("__new_manga_list"."rating" IS NULL OR ("__new_manga_list"."rating" >= 0 AND "__new_manga_list"."rating" <= 10))
);
--> statement-breakpoint
INSERT INTO `__new_manga_list`("current_chapter", "redo", "total", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated") SELECT "current_chapter", "redo", "total", "id", "user_id", "media_id", "status", "favorite", "comment", "rating", "custom_cover", "added_at", "last_updated" FROM `manga_list`;--> statement-breakpoint
DROP TABLE `manga_list`;--> statement-breakpoint
ALTER TABLE `__new_manga_list` RENAME TO `manga_list`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_list_user_media` ON `manga_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_manga_list_user_media_rated` ON `manga_list` (`user_id`,`media_id`) WHERE "manga_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_manga_list_media_user_rated` ON `manga_list` (`media_id`,`user_id`) WHERE "manga_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_achievement_tier` (
	`id` integer PRIMARY KEY NOT NULL,
	`achievement_id` integer NOT NULL,
	`difficulty` text NOT NULL,
	`criteria` text NOT NULL,
	`rarity` real,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievement`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "achievement_tier_criteria_json_check" CHECK(json_valid("__new_achievement_tier"."criteria")),
	CONSTRAINT "achievement_tier_rarity_range_check" CHECK("__new_achievement_tier"."rarity" IS NULL OR ("__new_achievement_tier"."rarity" >= 0 AND "__new_achievement_tier"."rarity" <= 100))
);
--> statement-breakpoint
INSERT INTO `__new_achievement_tier`("id", "achievement_id", "difficulty", "criteria", "rarity") SELECT "id", "achievement_id", "difficulty", "criteria", "rarity" FROM `achievement_tier`;--> statement-breakpoint
DROP TABLE `achievement_tier`;--> statement-breakpoint
ALTER TABLE `__new_achievement_tier` RENAME TO `achievement_tier`;--> statement-breakpoint
CREATE UNIQUE INDEX `achievement_difficulty_unique_idx` ON `achievement_tier` (`achievement_id`,`difficulty`);--> statement-breakpoint
CREATE TABLE `__new_inactive_account_deletion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deleted_at` text,
	`user_id` integer NOT NULL,
	`username` text NOT NULL,
	`resurrected_at` text,
	`warning_sent_at` text,
	`last_email_error` text,
	`last_seen_at` text NOT NULL,
	`warning_token_hash` text,
	`last_email_attempt_at` text,
	`deletion_scheduled_at` text NOT NULL,
	`status` text NOT NULL,
	`email_retry_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "inactive_account_deletion_retry_count_nonnegative_check" CHECK("__new_inactive_account_deletion"."email_retry_count" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_inactive_account_deletion`("id", "deleted_at", "user_id", "username", "resurrected_at", "warning_sent_at", "last_email_error", "last_seen_at", "warning_token_hash", "last_email_attempt_at", "deletion_scheduled_at", "status", "email_retry_count", "created_at", "updated_at") SELECT "id", "deleted_at", "user_id", "username", "resurrected_at", "warning_sent_at", "last_email_error", "last_seen_at", "warning_token_hash", "last_email_attempt_at", "deletion_scheduled_at", "status", "email_retry_count", "created_at", "updated_at" FROM `inactive_account_deletion`;--> statement-breakpoint
DROP TABLE `inactive_account_deletion`;--> statement-breakpoint
ALTER TABLE `__new_inactive_account_deletion` RENAME TO `inactive_account_deletion`;--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_user_id` ON `inactive_account_deletion` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_status` ON `inactive_account_deletion` (`status`);--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_deletion_scheduled_at` ON `inactive_account_deletion` (`deletion_scheduled_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_inactive_account_deletion_warning_token_hash` ON `inactive_account_deletion` (`warning_token_hash`);--> statement-breakpoint
CREATE TABLE `__new_task_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`user_id` integer,
	`status` text NOT NULL,
	`error_message` text,
	`task_name` text NOT NULL,
	`triggered_by` text NOT NULL,
	`logs` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "task_history_logs_json_check" CHECK(json_valid("__new_task_history"."logs"))
);
--> statement-breakpoint
INSERT INTO `__new_task_history`("id", "task_id", "user_id", "status", "error_message", "task_name", "triggered_by", "logs", "started_at", "finished_at") SELECT "id", "task_id", "user_id", "status", "error_message", "task_name", "triggered_by", "logs", "started_at", "finished_at" FROM `task_history`;--> statement-breakpoint
DROP TABLE `task_history`;--> statement-breakpoint
ALTER TABLE `__new_task_history` RENAME TO `task_history`;--> statement-breakpoint
CREATE INDEX `ix_task_history_task_id` ON `task_history` (`task_id`);--> statement-breakpoint
CREATE INDEX `ix_task_history_status` ON `task_history` (`status`);--> statement-breakpoint
CREATE INDEX `ix_task_history_user_id` ON `task_history` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`media_type` text NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`copied_count` integer DEFAULT 0 NOT NULL,
	`ordered` integer DEFAULT false NOT NULL,
	`privacy` text DEFAULT 'private' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "collections_counters_nonnegative_check" CHECK(
        "__new_collections"."view_count" >= 0 AND "__new_collections"."like_count" >= 0 AND "__new_collections"."copied_count" >= 0
    ),
	CONSTRAINT "collections_ordered_check" CHECK("__new_collections"."ordered" IN (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_collections`("id", "owner_id", "title", "description", "media_type", "view_count", "like_count", "copied_count", "ordered", "privacy", "created_at", "updated_at") SELECT "id", "owner_id", "title", "description", "media_type", "view_count", "like_count", "copied_count", "ordered", "privacy", "created_at", "updated_at" FROM `collections`;--> statement-breakpoint
DROP TABLE `collections`;--> statement-breakpoint
ALTER TABLE `__new_collections` RENAME TO `collections`;--> statement-breakpoint
CREATE INDEX `ix_collections_privacy` ON `collections` (`privacy`);--> statement-breakpoint
CREATE INDEX `ix_collections_owner_id` ON `collections` (`owner_id`);--> statement-breakpoint
CREATE INDEX `ix_collections_media_type` ON `collections` (`media_type`);--> statement-breakpoint
CREATE TABLE `__new_import_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`name` text,
	`release_date` text,
	`status_reason` text,
	`external_api_id` text,
	`row_number` integer NOT NULL,
	`matched_media_id` integer,
	`media_type` text,
	`payload_json` text NOT NULL,
	`external_api_source` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `import_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "import_items_row_positive_check" CHECK("__new_import_items"."row_number" >= 1),
	CONSTRAINT "import_items_payload_json_check" CHECK(json_valid("__new_import_items"."payload_json"))
);
--> statement-breakpoint
INSERT INTO `__new_import_items`("id", "job_id", "name", "release_date", "status_reason", "external_api_id", "row_number", "matched_media_id", "media_type", "payload_json", "external_api_source", "status", "created_at", "updated_at") SELECT "id", "job_id", "name", "release_date", "status_reason", "external_api_id", "row_number", "matched_media_id", "media_type", "payload_json", "external_api_source", "status", "created_at", "updated_at" FROM `import_items`;--> statement-breakpoint
DROP TABLE `import_items`;--> statement-breakpoint
ALTER TABLE `__new_import_items` RENAME TO `import_items`;--> statement-breakpoint
CREATE INDEX `ix_import_items_job_status_media_type` ON `import_items` (`job_id`,`status`,`media_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_import_items_job_row` ON `import_items` (`job_id`,`row_number`);--> statement-breakpoint
CREATE TABLE `__new_import_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`error` text,
	`source` text NOT NULL,
	`total_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`processed_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'parsing' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`started_at` text,
	`finished_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "import_jobs_counts_nonnegative_check" CHECK(
        "__new_import_jobs"."total_count" >= 0 AND "__new_import_jobs"."failed_count" >= 0 AND "__new_import_jobs"."skipped_count" >= 0
        AND "__new_import_jobs"."completed_count" >= 0 AND "__new_import_jobs"."processed_count" >= 0
    )
);
--> statement-breakpoint
INSERT INTO `__new_import_jobs`("id", "user_id", "error", "source", "total_count", "failed_count", "skipped_count", "completed_count", "processed_count", "status", "created_at", "updated_at", "started_at", "finished_at") SELECT "id", "user_id", "error", "source", "total_count", "failed_count", "skipped_count", "completed_count", "processed_count", "status", "created_at", "updated_at", "started_at", "finished_at" FROM `import_jobs`;--> statement-breakpoint
DROP TABLE `import_jobs`;--> statement-breakpoint
ALTER TABLE `__new_import_jobs` RENAME TO `import_jobs`;--> statement-breakpoint
CREATE INDEX `ix_import_jobs_user_created_at` ON `import_jobs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_import_jobs_status_created_at` ON `import_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_import_jobs_user_active` ON `import_jobs` (`user_id`) WHERE "import_jobs"."status" IN ('parsing', 'queued', 'processing');--> statement-breakpoint
PRAGMA foreign_keys=ON;
