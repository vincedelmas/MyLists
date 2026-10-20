ALTER TABLE `user_media_settings` ADD `release_notifications_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `series_list` ADD `release_notifications_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `anime_list` ADD `release_notifications_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `movies_list` ADD `release_notifications_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `games_list` ADD `release_notifications_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `books_list` ADD `release_notifications_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `manga_list` ADD `release_notifications_enabled` integer DEFAULT true NOT NULL;