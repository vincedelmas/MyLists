-- Schema after 0070_simplify_user_achievements. The journal timestamp lets databases at 0070 skip this migration.
CREATE TEMP TABLE __mylists_baseline_guard (
    existing_schema integer NOT NULL,
    CONSTRAINT "Upgrade the existing MyLists database through migration 0070 before applying the baseline" CHECK (existing_schema = 0)
);
--> statement-breakpoint
INSERT INTO __mylists_baseline_guard
SELECT EXISTS (
    SELECT 1 FROM main.sqlite_schema
    WHERE type IN ('table', 'view') AND name NOT GLOB 'sqlite_*' AND name != '__drizzle_migrations'
);
--> statement-breakpoint
DROP TABLE __mylists_baseline_guard;
--> statement-breakpoint
CREATE TABLE "account" (
	`id` integer PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "achievement" (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code_name` text NOT NULL,
	`description` text NOT NULL,
	`media_type` text NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE "achievement_tier" (
	`id` integer PRIMARY KEY NOT NULL,
	`achievement_id` integer NOT NULL,
	`difficulty` text NOT NULL,
	`criteria` text NOT NULL,
	`rarity` real,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievement`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "achievement_tier_criteria_json_check" CHECK(json_valid("achievement_tier"."criteria")),
	CONSTRAINT "achievement_tier_rarity_range_check" CHECK("achievement_tier"."rarity" IS NULL OR ("achievement_tier"."rarity" >= 0 AND "achievement_tier"."rarity" <= 100))
);
--> statement-breakpoint
CREATE TABLE "anime" (
	`original_name` text,
	`last_air_date` text,
	`homepage` text,
	`created_by` text,
	`duration` integer NOT NULL,
	`total_seasons` integer NOT NULL,
	`total_episodes` integer NOT NULL,
	`origin_country` text,
	`prod_status` text,
	`vote_average` real,
	`vote_count` real,
	`popularity` real,
	`api_id` integer NOT NULL,
	`season_to_air` integer,
	`episode_to_air` integer,
	`next_episode_to_air` text,
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`release_date` text,
	`synopsis` text,
	`image_cover` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_api_update` text
, "lock_status" integer DEFAULT false NOT NULL, `backdrop_path` text);
--> statement-breakpoint
CREATE TABLE "anime_actors" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "anime_episodes_per_season" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`season` integer NOT NULL,
	`episodes` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "anime_genre" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "anime_list" (
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
	CONSTRAINT "anime_list_rating_check" CHECK("anime_list"."rating" IS NULL OR ("anime_list"."rating" >= 0 AND "anime_list"."rating" <= 10)),
	CONSTRAINT "anime_list_favorite_check" CHECK("anime_list"."favorite" IN (0, 1)),
	CONSTRAINT "anime_list_redo_check" CHECK("anime_list"."redo" >= 0)
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
CREATE TABLE "anime_network" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "anime_tags" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "api_call_rollup" (
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
        "api_call_rollup"."total" >= 0 AND "api_call_rollup"."errors" >= 0 AND "api_call_rollup"."duration_ms_total" >= 0
        AND "api_call_rollup"."max_second_burst" >= 0
    ),
	CONSTRAINT "api_call_rollup_errors_not_above_total_check" CHECK("api_call_rollup"."errors" <= "api_call_rollup"."total"),
	CONSTRAINT "api_call_rollup_status_counts_json_check" CHECK(json_valid("api_call_rollup"."status_counts"))
);
--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` integer PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	`pages` integer NOT NULL,
	`language` text,
	`publishers` text,
	`api_id` text NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`release_date` text,
	`synopsis` text,
	`image_cover` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_api_update` text
, "lock_status" integer DEFAULT false NOT NULL);
--> statement-breakpoint
CREATE TABLE "books_authors" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "books_genre" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "books_list" (
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
	CONSTRAINT "books_list_rating_check" CHECK("books_list"."rating" IS NULL OR ("books_list"."rating" >= 0 AND "books_list"."rating" <= 10)),
	CONSTRAINT "books_list_favorite_check" CHECK("books_list"."favorite" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "books_tags" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`annotation` text,
	`media_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	`media_type` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "collection_items_order_nonnegative_check" CHECK("collection_items"."order_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE `collection_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "collections" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`copied_count` integer DEFAULT 0 NOT NULL,
	`ordered` integer DEFAULT false NOT NULL,
	`privacy` text DEFAULT 'private' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text, `profile_position` integer CONSTRAINT `collections_profile_position_check` CHECK (`profile_position` > 0),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "collections_counters_nonnegative_check" CHECK(
        "collections"."view_count" >= 0 AND "collections"."like_count" >= 0 AND "collections"."copied_count" >= 0
    ),
	CONSTRAINT "collections_ordered_check" CHECK("collections"."ordered" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "daily_mediadle" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_type` text NOT NULL,
	`media_id` integer NOT NULL,
	`date` text NOT NULL,
	`pixelation_levels` integer DEFAULT 5 NOT NULL,
	CONSTRAINT "daily_mediadle_pixelation_levels_positive_check" CHECK("daily_mediadle"."pixelation_levels" > 0)
);
--> statement-breakpoint
CREATE TABLE `feature_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'Under Consideration' NOT NULL,
	`admin_comment` text,
	`created_by` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `feature_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feature_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`feature_id`) REFERENCES `feature_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "followers" (
	`follower_id` integer NOT NULL,
	`followed_id` integer NOT NULL,
	`status` text DEFAULT 'accepted' NOT NULL,
	FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`followed_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "followers_not_self_check" CHECK("followers"."follower_id" <> "followers"."followed_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	`game_engine` text,
	`game_modes` text,
	`player_perspective` text,
	`vote_average` real,
	`vote_count` real,
	`igdb_url` text,
	`hltb_main_time` real,
	`hltb_main_and_extra_time` real,
	`hltb_total_complete_time` real,
	`api_id` integer NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`release_date` text,
	`synopsis` text,
	`image_cover` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_api_update` text
, `steam_api_id` text, `collection_id` integer, "lock_status" integer DEFAULT false NOT NULL, `hltb_last_checked_at` text, `backdrop_image_id` text);
--> statement-breakpoint
CREATE TABLE "games_companies" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	`publisher` integer DEFAULT false NOT NULL,
	`developer` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "games_genre" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "games_list" (
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
	CONSTRAINT "games_list_rating_check" CHECK("games_list"."rating" IS NULL OR ("games_list"."rating" >= 0 AND "games_list"."rating" <= 10)),
	CONSTRAINT "games_list_favorite_check" CHECK("games_list"."favorite" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "games_platforms" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "games_tags" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "import_items" (
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
	CONSTRAINT "import_items_row_positive_check" CHECK("import_items"."row_number" >= 1),
	CONSTRAINT "import_items_payload_json_check" CHECK(json_valid("import_items"."payload_json"))
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
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
	`finished_at` text, `next_attempt_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "import_jobs_counts_nonnegative_check" CHECK(
        "import_jobs"."total_count" >= 0 AND "import_jobs"."failed_count" >= 0 AND "import_jobs"."skipped_count" >= 0
        AND "import_jobs"."completed_count" >= 0 AND "import_jobs"."processed_count" >= 0
    )
);
--> statement-breakpoint
CREATE TABLE "inactive_account_deletion" (
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
	CONSTRAINT "inactive_account_deletion_retry_count_nonnegative_check" CHECK("inactive_account_deletion"."email_retry_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE `jwks` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`alg` text,
	`crv` text
);
--> statement-breakpoint
CREATE TABLE "manga" (
	`original_name` text,
	`chapters` integer,
	`prod_status` text,
	`site_url` text,
	`end_date` text,
	`volumes` integer,
	`vote_average` real,
	`vote_count` real,
	`popularity` real,
	`publishers` text,
	`api_id` integer NOT NULL,
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`release_date` text,
	`synopsis` text,
	`image_cover` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_api_update` text
, "lock_status" integer DEFAULT false NOT NULL);
--> statement-breakpoint
CREATE TABLE "manga_authors" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "manga_genre" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "manga_list" (
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
	CONSTRAINT "manga_list_rating_check" CHECK("manga_list"."rating" IS NULL OR ("manga_list"."rating" >= 0 AND "manga_list"."rating" <= 10)),
	CONSTRAINT "manga_list_favorite_check" CHECK("manga_list"."favorite" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "manga_tags" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mcp_revocation` (
	`user_id` integer NOT NULL,
	`client_id` text NOT NULL,
	`revoked_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `client_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "media_notifications" (
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
	CONSTRAINT "media_notifications_season_finale_check" CHECK("media_notifications"."is_season_finale" IS NULL OR "media_notifications"."is_season_finale" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE `media_refresh_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`api_id` text NOT NULL,
	`refreshed_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `media_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "mediadle_stats" (
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
        ("mediadle_stats"."total_played" IS NULL OR "mediadle_stats"."total_played" >= 0)
        AND ("mediadle_stats"."total_won" IS NULL OR "mediadle_stats"."total_won" >= 0)
        AND ("mediadle_stats"."average_attempts" IS NULL OR "mediadle_stats"."average_attempts" >= 0)
        AND ("mediadle_stats"."streak" IS NULL OR "mediadle_stats"."streak" >= 0)
        AND ("mediadle_stats"."best_streak" IS NULL OR "mediadle_stats"."best_streak" >= 0)
    ),
	CONSTRAINT "mediadle_stats_wins_not_above_played_check" CHECK(
        "mediadle_stats"."total_won" IS NULL OR "mediadle_stats"."total_played" IS NULL OR "mediadle_stats"."total_won" <= "mediadle_stats"."total_played"
    )
);
--> statement-breakpoint
CREATE TABLE "movies" (
	`original_name` text,
	`homepage` text,
	`duration` integer NOT NULL,
	`original_language` text,
	`vote_average` real,
	`vote_count` real,
	`popularity` real,
	`budget` real,
	`revenue` real,
	`tagline` text,
	`api_id` integer NOT NULL,
	`collection_id` integer,
	`director_name` text,
	`compositor_name` text,
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`release_date` text,
	`synopsis` text,
	`image_cover` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_api_update` text
, "lock_status" integer DEFAULT false NOT NULL, `backdrop_path` text);
--> statement-breakpoint
CREATE TABLE "movies_actors" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "movies_genre" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "movies_list" (
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
	CONSTRAINT "movies_list_rating_check" CHECK("movies_list"."rating" IS NULL OR ("movies_list"."rating" >= 0 AND "movies_list"."rating" <= 10)),
	CONSTRAINT "movies_list_favorite_check" CHECK("movies_list"."favorite" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "movies_tags" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_access_token` (
	`id` integer PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`client_id` text NOT NULL,
	`session_id` integer,
	`user_id` integer,
	`reference_id` text,
	`authorization_code_id` text,
	`resources` text,
	`requested_user_info_claims` text,
	`refresh_id` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`revoked` integer,
	`confirmation` text,
	`scopes` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`refresh_id`) REFERENCES `oauth_refresh_token`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_client` (
	`id` integer PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text,
	`client_discovery_id` text,
	`disabled` integer DEFAULT false,
	`skip_consent` integer,
	`enable_end_session` integer,
	`subject_type` text,
	`scopes` text,
	`client_credentials_scopes` text DEFAULT '[]',
	`user_id` integer,
	`created_at` integer,
	`updated_at` integer,
	`name` text,
	`uri` text,
	`icon` text,
	`contacts` text,
	`tos` text,
	`policy` text,
	`software_id` text,
	`software_version` text,
	`software_statement` text,
	`redirect_uris` text NOT NULL,
	`post_logout_redirect_uris` text,
	`backchannel_logout_uri` text,
	`backchannel_logout_session_required` integer,
	`token_endpoint_auth_method` text,
	`application_type` text,
	`jwks` text,
	`jwks_uri` text,
	`grant_types` text,
	`response_types` text,
	`require_pkce` integer,
	`dpop_bound_access_tokens` integer DEFAULT false,
	`reference_id` text,
	`metadata` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_client_assertion` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_client_resource` (
	`id` integer PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`metadata` text,
	`created_at` integer,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `oauth_resource`(`identifier`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_consent` (
	`id` integer PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` integer,
	`reference_id` text,
	`resources` text,
	`requested_user_info_claims` text,
	`scopes` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_refresh_token` (
	`id` integer PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`client_id` text NOT NULL,
	`session_id` integer,
	`user_id` integer NOT NULL,
	`reference_id` text,
	`authorization_code_id` text,
	`resources` text,
	`requested_user_info_claims` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`revoked` integer,
	`rotated_at` integer,
	`rotation_replay_response` text,
	`rotation_replay_expires_at` integer,
	`auth_time` integer,
	`confirmation` text,
	`scopes` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_resource` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`name` text NOT NULL,
	`access_token_ttl` integer,
	`refresh_token_ttl` integer,
	`signing_algorithm` text,
	`signing_key_id` text,
	`allowed_scopes` text,
	`custom_claims` text,
	`dpop_bound_access_tokens_required` integer DEFAULT false,
	`disabled` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer,
	`policy_version` integer DEFAULT 1,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE "profile_custom" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "profile_custom_value_json_check" CHECK(json_valid("profile_custom"."value"))
);
--> statement-breakpoint
CREATE TABLE "series" (
	`original_name` text,
	`last_air_date` text,
	`homepage` text,
	`created_by` text,
	`duration` integer NOT NULL,
	`total_seasons` integer NOT NULL,
	`total_episodes` integer NOT NULL,
	`origin_country` text,
	`prod_status` text,
	`vote_average` real,
	`vote_count` real,
	`popularity` real,
	`api_id` integer NOT NULL,
	`episode_to_air` integer,
	`season_to_air` integer,
	`next_episode_to_air` text,
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`release_date` text,
	`synopsis` text,
	`image_cover` text NOT NULL,
	`added_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_api_update` text
, "lock_status" integer DEFAULT false NOT NULL, `backdrop_path` text);
--> statement-breakpoint
CREATE TABLE "series_actors" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "series_episodes_per_season" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`season` integer NOT NULL,
	`episodes` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "series_genre" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "series_list" (
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
	CONSTRAINT "series_list_rating_check" CHECK("series_list"."rating" IS NULL OR ("series_list"."rating" >= 0 AND "series_list"."rating" <= 10)),
	CONSTRAINT "series_list_favorite_check" CHECK("series_list"."favorite" IN (0, 1)),
	CONSTRAINT "series_list_redo_check" CHECK("series_list"."redo" >= 0)
);
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
CREATE TABLE "series_network" (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "series_tags" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "session" (
	`id` integer PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "smart_views" (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`spec` text NOT NULL,
	`profile_position` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "smart_views_spec_json_check" CHECK(json_valid("smart_views"."spec")),
	CONSTRAINT "smart_views_profile_position_check" CHECK("smart_views"."profile_position" > 0)
);
--> statement-breakpoint
CREATE TABLE `social_notifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`actor_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL, `feature_request_id` integer REFERENCES `feature_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "task_history" (
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
	CONSTRAINT "task_history_logs_json_check" CHECK(json_valid("task_history"."logs"))
);
--> statement-breakpoint
CREATE TABLE "user" (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`image` text,
	`profile_views` integer DEFAULT 0 NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`email_verified` integer NOT NULL,
	`privacy` text DEFAULT 'restricted' NOT NULL,
	`grid_list_view` integer DEFAULT true NOT NULL,
	`show_update_modal` integer DEFAULT true NOT NULL,
	`rating_system` text DEFAULT 'score' NOT NULL,
	`search_selector` text DEFAULT 'tmdb' NOT NULL,
	`background_image` text DEFAULT 'default.jpg' NOT NULL
, `show_onboarding` integer DEFAULT true NOT NULL, `auto_move_completed_tv_to_on_hold` integer DEFAULT true NOT NULL, `hide_aggregate_ratings` integer DEFAULT false NOT NULL);
--> statement-breakpoint
CREATE TABLE "user_achievement" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`tier_id` integer NOT NULL,
	`progress` real,
	`count` real,
	`completed` integer,
	`completed_at` text,
	`last_calculated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tier_id`) REFERENCES `achievement_tier`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_achievement_progress_range_check" CHECK("user_achievement"."progress" IS NULL OR ("user_achievement"."progress" >= 0 AND "user_achievement"."progress" <= 100)),
	CONSTRAINT "user_achievement_count_nonnegative_check" CHECK("user_achievement"."count" IS NULL OR "user_achievement"."count" >= 0),
	CONSTRAINT "user_achievement_completed_check" CHECK("user_achievement"."completed" IS NULL OR "user_achievement"."completed" IN (0, 1)),
	CONSTRAINT "user_achievement_completed_at_check" CHECK("user_achievement"."completed" IS NULL OR "user_achievement"."completed" = 0 OR "user_achievement"."completed_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "user_media_monthly_activity" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`progress_gained` real NOT NULL,
	`had_completion` integer DEFAULT false NOT NULL,
	`redo_gained` integer DEFAULT 0 NOT NULL,
	`month_bucket` text NOT NULL,
	`last_activity_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_media_monthly_activity_progress_nonnegative_check" CHECK("user_media_monthly_activity"."progress_gained" >= 0),
	CONSTRAINT "user_media_monthly_activity_redo_nonnegative_check" CHECK("user_media_monthly_activity"."redo_gained" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_media_settings" (
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
	`release_notifications_enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_media_settings_counters_nonnegative_check" CHECK(
        "user_media_settings"."time_spent" >= 0 AND "user_media_settings"."views" >= 0 AND "user_media_settings"."total_entries" >= 0
        AND "user_media_settings"."total_redo" >= 0 AND "user_media_settings"."entries_rated" >= 0
        AND "user_media_settings"."sum_entries_rated" >= 0 AND "user_media_settings"."entries_commented" >= 0
        AND "user_media_settings"."entries_favorites" >= 0 AND "user_media_settings"."total_specific" >= 0
    ),
	CONSTRAINT "user_media_settings_status_counts_json_check" CHECK(json_valid("user_media_settings"."status_counts"))
);
--> statement-breakpoint
CREATE TABLE "user_media_stats_history" (
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
	`timestamp` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`media_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_media_stats_history_status_counts_json_check" CHECK(json_valid("user_media_stats_history"."status_counts"))
);
--> statement-breakpoint
CREATE TABLE "user_media_update" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`media_name` text NOT NULL,
	`media_type` text NOT NULL,
	`update_type` text NOT NULL,
	`payload` text,
	`timestamp` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE "user_mediadle_progress" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`daily_mediadle_id` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`succeeded` integer DEFAULT false NOT NULL,
	`completion_time` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`daily_mediadle_id`) REFERENCES `daily_mediadle`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_mediadle_progress_attempts_nonnegative_check" CHECK("user_mediadle_progress"."attempts" >= 0),
	CONSTRAINT "user_mediadle_progress_success_completed_check" CHECK("user_mediadle_progress"."succeeded" <= "user_mediadle_progress"."completed")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `which_came_first_media` (
	`media_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`release_date` text NOT NULL,
	PRIMARY KEY(`media_type`, `media_id`)
);
--> statement-breakpoint
CREATE TABLE "which_came_first_rounds" (
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
	CONSTRAINT "wcf_round_number_positive_check" CHECK("which_came_first_rounds"."round_number" >= 1),
	CONSTRAINT "wcf_round_selected_side_check" CHECK("which_came_first_rounds"."selected_side" IS NULL OR "which_came_first_rounds"."selected_side" IN ('left', 'right')),
	CONSTRAINT "wcf_round_answer_consistency_check" CHECK(
        ("which_came_first_rounds"."answered_at" IS NULL AND "which_came_first_rounds"."selected_side" IS NULL AND "which_came_first_rounds"."correct" IS NULL)
        OR ("which_came_first_rounds"."answered_at" IS NOT NULL AND "which_came_first_rounds"."selected_side" IS NOT NULL AND "which_came_first_rounds"."correct" IS NOT NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "which_came_first_runs" (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`completed_at` text,
	`score` integer DEFAULT 0 NOT NULL,
	`started_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`selected_media_types` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "wcf_runs_score_nonnegative_check" CHECK("which_came_first_runs"."score" >= 0),
	CONSTRAINT "wcf_runs_selected_media_types_json_check" CHECK(json_valid("which_came_first_runs"."selected_media_types"))
);
--> statement-breakpoint
CREATE TABLE `year_recap_release` (
	`year` integer PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'automatic' NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "year_recap_release_mode_check" CHECK("year_recap_release"."mode" IN ('automatic', 'enabled', 'disabled'))
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievement_codeName_unique` ON `achievement` (`code_name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievement_difficulty_unique_idx` ON `achievement_tier` (`achievement_id`,`difficulty`);
--> statement-breakpoint
CREATE UNIQUE INDEX `anime_apiId_unique` ON `anime` (`api_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_provider_unique` ON `api_tokens` (`provider`);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_apiId_unique` ON `books` (`api_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_apiId_unique` ON `games` (`api_id`);
--> statement-breakpoint
CREATE INDEX `ix_anime_actors_name_media` ON `anime_actors` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_anime_genre_name_media` ON `anime_genre` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_id` ON `anime_list` (`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_user_rated` ON `anime_list` (`media_id`,`user_id`) WHERE "anime_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_anime_list_user_media_rated` ON `anime_list` (`user_id`,`media_id`) WHERE "anime_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_anime_network_name_media` ON `anime_network` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_anime_tags_user_tag_media` ON `anime_tags` (`user_id`,`tag_id`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_api_call_rollup_bucket_start` ON `api_call_rollup` (`bucket_start`);
--> statement-breakpoint
CREATE INDEX `ix_api_call_rollup_provider` ON `api_call_rollup` (`provider`);
--> statement-breakpoint
CREATE INDEX `ix_books_authors_name_media` ON `books_authors` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_books_genre_name_media` ON `books_genre` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_books_list_media_id` ON `books_list` (`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_books_list_media_user_rated` ON `books_list` (`media_id`,`user_id`) WHERE "books_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_books_list_user_media_rated` ON `books_list` (`user_id`,`media_id`) WHERE "books_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_books_tags_user_tag_media` ON `books_tags` (`user_id`,`tag_id`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_collection_items_media_type_media_collection` ON `collection_items` (`media_type`,`media_id`,`collection_id`);
--> statement-breakpoint
CREATE INDEX `ix_collection_likes_user_id` ON `collection_likes` (`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_collections_owner_id` ON `collections` (`owner_id`);
--> statement-breakpoint
CREATE INDEX `ix_collections_privacy` ON `collections` (`privacy`);
--> statement-breakpoint
CREATE INDEX `ix_feature_requests_created_at` ON `feature_requests` (`created_at`);
--> statement-breakpoint
CREATE INDEX `ix_feature_requests_status` ON `feature_requests` (`status`);
--> statement-breakpoint
CREATE INDEX `ix_feature_votes_user_id` ON `feature_votes` (`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_followers_followed_status_follower` ON `followers` (`followed_id`,`status`,`follower_id`);
--> statement-breakpoint
CREATE INDEX `ix_games_companies_name_media` ON `games_companies` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_games_genre_name_media` ON `games_genre` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_games_list_media_id` ON `games_list` (`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_games_list_media_user_rated` ON `games_list` (`media_id`,`user_id`) WHERE "games_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_games_list_user_media_rated` ON `games_list` (`user_id`,`media_id`) WHERE "games_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_games_platforms_name_media` ON `games_platforms` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_games_tags_user_tag_media` ON `games_tags` (`user_id`,`tag_id`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_import_items_job_status_media_type` ON `import_items` (`job_id`,`status`,`media_type`);
--> statement-breakpoint
CREATE INDEX `ix_import_jobs_status_created_at` ON `import_jobs` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ix_import_jobs_status_next_attempt_at` ON `import_jobs` (`status`,`next_attempt_at`);
--> statement-breakpoint
CREATE INDEX `ix_import_jobs_user_created_at` ON `import_jobs` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_deletion_scheduled_at` ON `inactive_account_deletion` (`deletion_scheduled_at`);
--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_status` ON `inactive_account_deletion` (`status`);
--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_user_id` ON `inactive_account_deletion` (`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_manga_authors_name_media` ON `manga_authors` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_manga_genre_name_media` ON `manga_genre` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_manga_list_media_id` ON `manga_list` (`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_manga_list_media_user_rated` ON `manga_list` (`media_id`,`user_id`) WHERE "manga_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_manga_list_user_media_rated` ON `manga_list` (`user_id`,`media_id`) WHERE "manga_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_manga_tags_user_tag_media` ON `manga_tags` (`user_id`,`tag_id`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_media_notifications_media_user_created_at` ON `media_notifications` (`media_type`,`media_id`,`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ix_media_notifications_user_created_at` ON `media_notifications` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ix_media_notifications_user_unread` ON `media_notifications` (`user_id`) WHERE "media_notifications"."read" = 0;
--> statement-breakpoint
CREATE INDEX `ix_media_refresh_log_media_type` ON `media_refresh_log` (`media_type`);
--> statement-breakpoint
CREATE INDEX `ix_media_refresh_log_refreshed_at` ON `media_refresh_log` (`refreshed_at`);
--> statement-breakpoint
CREATE INDEX `ix_media_refresh_log_user_id` ON `media_refresh_log` (`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_movies_actors_name_media` ON `movies_actors` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_movies_genre_name_media` ON `movies_genre` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_movies_list_media_id` ON `movies_list` (`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_movies_list_media_user_rated` ON `movies_list` (`media_id`,`user_id`) WHERE "movies_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_movies_list_user_media_rated` ON `movies_list` (`user_id`,`media_id`) WHERE "movies_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_movies_tags_user_tag_media` ON `movies_tags` (`user_id`,`tag_id`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_series_actors_name_media` ON `series_actors` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_series_genre_name_media` ON `series_genre` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_series_list_media_id` ON `series_list` (`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_series_list_media_user_rated` ON `series_list` (`media_id`,`user_id`) WHERE "series_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_series_list_user_media_rated` ON `series_list` (`user_id`,`media_id`) WHERE "series_list"."rating" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `ix_series_network_name_media` ON `series_network` (`name`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_series_tags_user_tag_media` ON `series_tags` (`user_id`,`tag_id`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_smart_views_user_id` ON `smart_views` (`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_social_notifications_user_created_at` ON `social_notifications` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ix_social_notifications_user_unread` ON `social_notifications` (`user_id`) WHERE "social_notifications"."read" = 0;
--> statement-breakpoint
CREATE INDEX `ix_task_history_status` ON `task_history` (`status`);
--> statement-breakpoint
CREATE INDEX `ix_task_history_task_id` ON `task_history` (`task_id`);
--> statement-breakpoint
CREATE INDEX `ix_task_history_user_id` ON `task_history` (`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_user_achievement_completed_tier` ON `user_achievement` (`tier_id`) WHERE "user_achievement"."completed" = 1;
--> statement-breakpoint
CREATE INDEX `ix_user_achievement_tier_user` ON `user_achievement` (`tier_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_user_achievement_user_completed_at` ON `user_achievement` (`user_id`,`completed_at`) WHERE "user_achievement"."completed" = 1;
--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_media_id` ON `user_media_monthly_activity` (`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_media_type` ON `user_media_monthly_activity` (`media_type`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_month_bucket` ON `user_media_monthly_activity` (`month_bucket`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_user_last_activity` ON `user_media_monthly_activity` (`user_id`,`last_activity_at`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_user_month_type_activity` ON `user_media_monthly_activity` (`user_id`,`month_bucket`,`media_type`,`last_activity_at`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_settings_media_type` ON `user_media_settings` (`media_type`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_stats_history_media_type` ON `user_media_stats_history` (`media_type`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_stats_history_timestamp` ON `user_media_stats_history` (`timestamp`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_stats_history_user_id` ON `user_media_stats_history` (`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_update_media_type_media_id` ON `user_media_update` (`media_type`,`media_id`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_update_timestamp` ON `user_media_update` (`timestamp`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_update_user_media_kind_timestamp` ON `user_media_update` (`user_id`,`media_type`,`media_id`,`update_type`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `ix_user_media_update_user_timestamp` ON `user_media_update` (`user_id`,`timestamp`);
--> statement-breakpoint
CREATE INDEX `ix_wcf_media_type_release_date` ON `which_came_first_media` (`media_type`,`release_date`);
--> statement-breakpoint
CREATE INDEX `ix_wcf_round_run_answered` ON `which_came_first_rounds` (`run_id`,`answered_at`);
--> statement-breakpoint
CREATE INDEX `ix_wcf_runs_user_completed` ON `which_came_first_runs` (`user_id`,`completed_at`);
--> statement-breakpoint
CREATE INDEX `ix_wcf_runs_user_status` ON `which_came_first_runs` (`user_id`,`status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `manga_apiId_unique` ON `manga` (`api_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `movies_apiId_unique` ON `movies` (`api_id`);
--> statement-breakpoint
CREATE INDEX `oauthAccessToken_authorizationCodeId_idx` ON `oauth_access_token` (`authorization_code_id`);
--> statement-breakpoint
CREATE INDEX `oauthAccessToken_clientId_idx` ON `oauth_access_token` (`client_id`);
--> statement-breakpoint
CREATE INDEX `oauthAccessToken_refreshId_idx` ON `oauth_access_token` (`refresh_id`);
--> statement-breakpoint
CREATE INDEX `oauthAccessToken_sessionId_idx` ON `oauth_access_token` (`session_id`);
--> statement-breakpoint
CREATE INDEX `oauthAccessToken_userId_idx` ON `oauth_access_token` (`user_id`);
--> statement-breakpoint
CREATE INDEX `oauthClientResource_clientId_idx` ON `oauth_client_resource` (`client_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauthClientResource_clientId_resourceId_uidx` ON `oauth_client_resource` (`client_id`,`resource_id`);
--> statement-breakpoint
CREATE INDEX `oauthClientResource_resourceId_idx` ON `oauth_client_resource` (`resource_id`);
--> statement-breakpoint
CREATE INDEX `oauthClient_userId_idx` ON `oauth_client` (`user_id`);
--> statement-breakpoint
CREATE INDEX `oauthConsent_clientId_idx` ON `oauth_consent` (`client_id`);
--> statement-breakpoint
CREATE INDEX `oauthConsent_userId_idx` ON `oauth_consent` (`user_id`);
--> statement-breakpoint
CREATE INDEX `oauthRefreshToken_authorizationCodeId_idx` ON `oauth_refresh_token` (`authorization_code_id`);
--> statement-breakpoint
CREATE INDEX `oauthRefreshToken_clientId_idx` ON `oauth_refresh_token` (`client_id`);
--> statement-breakpoint
CREATE INDEX `oauthRefreshToken_sessionId_idx` ON `oauth_refresh_token` (`session_id`);
--> statement-breakpoint
CREATE INDEX `oauthRefreshToken_userId_idx` ON `oauth_refresh_token` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_access_token_token_unique` ON `oauth_access_token` (`token`);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_client_client_id_unique` ON `oauth_client` (`client_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_refresh_token_token_unique` ON `oauth_refresh_token` (`token`);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_resource_identifier_unique` ON `oauth_resource` (`identifier`);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_apiId_unique` ON `series` (`api_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_feature_notif_unique` ON `social_notifications` (`user_id`,`actor_id`,`type`,`feature_request_id`) WHERE `feature_request_id` IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `social_notif_unique` ON `social_notifications` (`user_id`,`actor_id`,`type`) WHERE `feature_request_id` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_wcf_round_run_number` ON `which_came_first_rounds` (`run_id`,`round_number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_achievement_user_tier_unique_idx` ON `user_achievement` (`user_id`,`tier_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_actors_media_name` ON `anime_actors` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_episodes_per_season_media_season` ON `anime_episodes_per_season` (`media_id`,`season`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_genre_media_name` ON `anime_genre` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_list_user_media` ON `anime_list` (`user_id`,`media_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_network_media_name` ON `anime_network` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_tags_user_media_tag` ON `anime_tags` (`user_id`,`media_id`,`tag_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_api_call_rollup_bucket_provider` ON `api_call_rollup` (`bucket_start_ms`,`provider`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_authors_media_name` ON `books_authors` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_genre_media_name` ON `books_genre` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_list_user_media` ON `books_list` (`user_id`,`media_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_tags_user_media_tag` ON `books_tags` (`user_id`,`media_id`,`tag_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collection_items_collection_media` ON `collection_items` (`collection_id`,`media_type`,`media_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collection_items_collection_order` ON `collection_items` (`collection_id`,`order_index`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collection_likes_collection_user` ON `collection_likes` (`collection_id`,`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collections_owner_profile_position` ON `collections` (`owner_id`,`profile_position`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_daily_mediadle_type_date` ON `daily_mediadle` (`media_type`,`date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_feature_votes_feature_user` ON `feature_votes` (`feature_id`,`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_followers_follower_followed` ON `followers` (`follower_id`,`followed_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_companies_media_name_roles` ON `games_companies` (`media_id`,`name`,`publisher`,`developer`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_genre_media_name` ON `games_genre` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_list_user_media` ON `games_list` (`user_id`,`media_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_platforms_media_name` ON `games_platforms` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_tags_user_media_tag` ON `games_tags` (`user_id`,`media_id`,`tag_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_import_items_job_row` ON `import_items` (`job_id`,`row_number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_import_jobs_user_active` ON `import_jobs` (`user_id`) WHERE "import_jobs"."status" IN ('parsing', 'queued', 'processing');
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_inactive_account_deletion_warning_token_hash` ON `inactive_account_deletion` (`warning_token_hash`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_authors_media_name` ON `manga_authors` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_genre_media_name` ON `manga_genre` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_list_user_media` ON `manga_list` (`user_id`,`media_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_tags_user_media_tag` ON `manga_tags` (`user_id`,`media_id`,`tag_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_media_tags_user_type_name` ON `media_tags` (`user_id`,`media_type`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_mediadle_stats_user_type` ON `mediadle_stats` (`user_id`,`media_type`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_actors_media_name` ON `movies_actors` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_genre_media_name` ON `movies_genre` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_list_user_media` ON `movies_list` (`user_id`,`media_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_tags_user_media_tag` ON `movies_tags` (`user_id`,`media_id`,`tag_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_profile_custom_user_id_key` ON `profile_custom` (`user_id`,`key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_actors_media_name` ON `series_actors` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_episodes_per_season_media_season` ON `series_episodes_per_season` (`media_id`,`season`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_genre_media_name` ON `series_genre` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_list_user_media` ON `series_list` (`user_id`,`media_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_network_media_name` ON `series_network` (`media_id`,`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_tags_user_media_tag` ON `series_tags` (`user_id`,`media_id`,`tag_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_smart_views_user_profile_position` ON `smart_views` (`user_id`,`profile_position`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_id_media_type` ON `user_media_settings` (`user_id`,`media_type`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_media_monthly_activity_bucket` ON `user_media_monthly_activity` (`user_id`,`media_id`,`media_type`,`month_bucket`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_mediadle_progress_user_daily` ON `user_mediadle_progress` (`user_id`,`daily_mediadle_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_wcf_round_run_unanswered` ON `which_came_first_rounds` (`run_id`) WHERE "which_came_first_rounds"."answered_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_wcf_runs_user_active` ON `which_came_first_runs` (`user_id`) WHERE "which_came_first_runs"."status" = 'active';
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);
