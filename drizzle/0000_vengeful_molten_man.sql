-- Baseline schema expected by 0001_mute_satana.
-- These legacy tables are intentionally minimal; 0001 rebuilds them into the migrated schema.
CREATE TABLE `account` (
	`id` text,
	`account_id` text,
	`provider_id` text,
	`user_id` text,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` text,
	`refresh_token_expires_at` text,
	`scope` text,
	`password` text,
	`created_at` text,
	`updated_at` text
);--> statement-breakpoint
CREATE TABLE `achievement` (
	`id` text,
	`name` text,
	`code_name` text,
	`description` text,
	`media_type` text,
	`value` text
);--> statement-breakpoint
CREATE TABLE `achievement_tier` (
	`id` text,
	`achievement_id` text,
	`difficulty` text,
	`criteria` text,
	`rarity` text
);--> statement-breakpoint
CREATE TABLE `anime` (
	`original_name` text,
	`last_air_date` text,
	`homepage` text,
	`created_by` text,
	`duration` text,
	`total_seasons` text,
	`total_episodes` text,
	`origin_country` text,
	`prod_status` text,
	`vote_average` text,
	`vote_count` text,
	`popularity` text,
	`api_id` text,
	`season_to_air` text,
	`episode_to_air` text,
	`next_episode_to_air` text,
	`id` text,
	`name` text,
	`release_date` text,
	`synopsis` text,
	`image_cover` text,
	`lock_status` text,
	`added_at` text,
	`last_api_update` text
);--> statement-breakpoint
CREATE TABLE `anime_actors` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `anime_episodes_per_season` (
	`id` text,
	`media_id` text,
	`season` text,
	`episodes` text
);--> statement-breakpoint
CREATE TABLE `anime_genre` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `anime_labels` (
	`user_id` text,
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `anime_list` (
	`current_season` text,
	`current_episode` text,
	`redo` text,
	`total` text,
	`redo2` text,
	`id` text,
	`user_id` text,
	`media_id` text,
	`status` text,
	`favorite` text,
	`comment` text,
	`rating` text,
	`added_at` text,
	`last_updated` text
);--> statement-breakpoint
CREATE TABLE `anime_network` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `books` (
	`pages` text,
	`language` text,
	`publishers` text,
	`api_id` text,
	`id` text,
	`name` text,
	`release_date` text,
	`synopsis` text,
	`image_cover` text,
	`lock_status` text,
	`added_at` text,
	`last_api_update` text
);--> statement-breakpoint
CREATE TABLE `books_authors` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `books_genre` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `books_labels` (
	`user_id` text,
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `books_list` (
	`actual_page` text,
	`redo` text,
	`total` text,
	`id` text,
	`user_id` text,
	`media_id` text,
	`status` text,
	`favorite` text,
	`comment` text,
	`rating` text,
	`added_at` text,
	`last_updated` text
);--> statement-breakpoint
CREATE TABLE `daily_mediadle` (
	`id` text,
	`media_type` text,
	`media_id` text,
	`date` text,
	`pixelation_levels` text
);--> statement-breakpoint
CREATE TABLE `followers` (
	`follower_id` text,
	`followed_id` text
);--> statement-breakpoint
CREATE TABLE `games` (
	`game_engine` text,
	`game_modes` text,
	`player_perspective` text,
	`vote_average` text,
	`vote_count` text,
	`igdb_url` text,
	`hltb_main_time` text,
	`hltb_main_and_extra_time` text,
	`hltb_total_complete_time` text,
	`api_id` text,
	`id` text,
	`name` text,
	`release_date` text,
	`synopsis` text,
	`image_cover` text,
	`lock_status` text,
	`added_at` text,
	`last_api_update` text
);--> statement-breakpoint
CREATE TABLE `games_companies` (
	`id` text,
	`media_id` text,
	`name` text,
	`publisher` text,
	`developer` text
);--> statement-breakpoint
CREATE TABLE `games_genre` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `games_labels` (
	`user_id` text,
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `games_list` (
	`playtime` text,
	`platform` text,
	`id` text,
	`user_id` text,
	`media_id` text,
	`status` text,
	`favorite` text,
	`comment` text,
	`rating` text,
	`added_at` text,
	`last_updated` text
);--> statement-breakpoint
CREATE TABLE `games_platforms` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `manga` (
	`original_name` text,
	`chapters` text,
	`prod_status` text,
	`site_url` text,
	`end_date` text,
	`volumes` text,
	`vote_average` text,
	`vote_count` text,
	`popularity` text,
	`publishers` text,
	`api_id` text,
	`id` text,
	`name` text,
	`release_date` text,
	`synopsis` text,
	`image_cover` text,
	`lock_status` text,
	`added_at` text,
	`last_api_update` text
);--> statement-breakpoint
CREATE TABLE `manga_authors` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `manga_genre` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `manga_labels` (
	`user_id` text,
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `manga_list` (
	`current_chapter` text,
	`redo` text,
	`total` text,
	`id` text,
	`user_id` text,
	`media_id` text,
	`status` text,
	`favorite` text,
	`comment` text,
	`rating` text,
	`added_at` text,
	`last_updated` text
);--> statement-breakpoint
CREATE TABLE `mediadle_stats` (
	`id` text,
	`user_id` text,
	`media_type` text,
	`total_played` text,
	`total_won` text,
	`average_attempts` text,
	`streak` text,
	`best_streak` text
);--> statement-breakpoint
CREATE TABLE `movies` (
	`original_name` text,
	`homepage` text,
	`duration` text,
	`original_language` text,
	`vote_average` text,
	`vote_count` text,
	`popularity` text,
	`budget` text,
	`revenue` text,
	`tagline` text,
	`api_id` text,
	`collection_id` text,
	`director_name` text,
	`compositor_name` text,
	`id` text,
	`name` text,
	`release_date` text,
	`synopsis` text,
	`image_cover` text,
	`lock_status` text,
	`added_at` text,
	`last_api_update` text
);--> statement-breakpoint
CREATE TABLE `movies_actors` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `movies_genre` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `movies_labels` (
	`user_id` text,
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `movies_list` (
	`redo` text,
	`total` text,
	`id` text,
	`user_id` text,
	`media_id` text,
	`status` text,
	`favorite` text,
	`comment` text,
	`rating` text,
	`added_at` text,
	`last_updated` text
);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text,
	`user_id` text,
	`media_type` text,
	`media_id` text,
	`payload` text,
	`notification_type` text,
	`timestamp` text
);--> statement-breakpoint
CREATE TABLE `series` (
	`original_name` text,
	`last_air_date` text,
	`homepage` text,
	`created_by` text,
	`duration` text,
	`total_seasons` text,
	`total_episodes` text,
	`origin_country` text,
	`prod_status` text,
	`vote_average` text,
	`vote_count` text,
	`popularity` text,
	`api_id` text,
	`episode_to_air` text,
	`season_to_air` text,
	`next_episode_to_air` text,
	`id` text,
	`name` text,
	`release_date` text,
	`synopsis` text,
	`image_cover` text,
	`lock_status` text,
	`added_at` text,
	`last_api_update` text
);--> statement-breakpoint
CREATE TABLE `series_actors` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `series_episodes_per_season` (
	`id` text,
	`media_id` text,
	`season` text,
	`episodes` text
);--> statement-breakpoint
CREATE TABLE `series_genre` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `series_labels` (
	`user_id` text,
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `series_list` (
	`current_season` text,
	`current_episode` text,
	`redo` text,
	`total` text,
	`redo2` text,
	`id` text,
	`user_id` text,
	`media_id` text,
	`status` text,
	`favorite` text,
	`comment` text,
	`rating` text,
	`added_at` text,
	`last_updated` text
);--> statement-breakpoint
CREATE TABLE `series_network` (
	`id` text,
	`media_id` text,
	`name` text
);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text,
	`expires_at` text,
	`token` text,
	`created_at` text,
	`updated_at` text,
	`ip_address` text,
	`user_agent` text,
	`user_id` text
);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text,
	`name` text,
	`email` text,
	`created_at` text,
	`updated_at` text,
	`last_notif_read_time` text,
	`image` text,
	`profile_views` text,
	`role` text,
	`email_verified` text,
	`privacy` text,
	`grid_list_view` text,
	`show_update_modal` text,
	`rating_system` text,
	`search_selector` text,
	`background_image` text
);--> statement-breakpoint
CREATE TABLE `user_achievement` (
	`id` text,
	`user_id` text,
	`achievement_id` text,
	`tier_id` text,
	`progress` text,
	`count` text,
	`completed` text,
	`completed_at` text,
	`last_calculated_at` text
);--> statement-breakpoint
CREATE TABLE `user_media_settings` (
	`id` text,
	`user_id` text,
	`media_type` text,
	`time_spent` text,
	`views` text,
	`active` text,
	`total_entries` text,
	`total_redo` text,
	`entries_rated` text,
	`sum_entries_rated` text,
	`entries_commented` text,
	`entries_favorites` text,
	`total_specific` text,
	`status_counts` text,
	`average_rating` text
);--> statement-breakpoint
CREATE TABLE `user_media_update` (
	`id` text,
	`user_id` text,
	`media_id` text,
	`media_name` text,
	`media_type` text,
	`update_type` text,
	`payload` text,
	`timestamp` text
);--> statement-breakpoint
CREATE TABLE `user_mediadle_progress` (
	`id` text,
	`user_id` text,
	`daily_mediadle_id` text,
	`attempts` text,
	`completed` text,
	`succeeded` text,
	`completion_time` text
);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text,
	`identifier` text,
	`value` text,
	`expires_at` text,
	`created_at` text,
	`updated_at` text
);
