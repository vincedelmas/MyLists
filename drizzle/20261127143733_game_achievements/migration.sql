PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_games_list` (
	`playtime` integer DEFAULT 0,
	`platform` text,
	`achievements_total` integer,
	`achievements_unlocked` integer,
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
	CONSTRAINT `games_list_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `games_list_media_id_games_id_fk` FOREIGN KEY (`media_id`) REFERENCES `games`(`id`),
	CONSTRAINT "games_list_rating_check" CHECK("rating" IS NULL OR ("rating" >= 0 AND "rating" <= 10)),
	CONSTRAINT "games_list_favorite_check" CHECK("favorite" IN (0, 1)),
	CONSTRAINT "games_list_achievements_check" CHECK(
        ("achievements_unlocked" IS NULL AND "achievements_total" IS NULL)
        OR ("achievements_unlocked" IS NOT NULL AND "achievements_total" IS NOT NULL
            AND "achievements_unlocked" >= 0
            AND "achievements_total" >= 1
            AND "achievements_unlocked" <= "achievements_total")
    )
);
--> statement-breakpoint
INSERT INTO `__new_games_list`(`playtime`, `platform`, `id`, `user_id`, `media_id`, `status`, `release_notifications_enabled`, `favorite`, `comment`, `rating`, `custom_cover`, `added_at`, `last_updated`) SELECT `playtime`, `platform`, `id`, `user_id`, `media_id`, `status`, `release_notifications_enabled`, `favorite`, `comment`, `rating`, `custom_cover`, `added_at`, `last_updated` FROM `games_list`;--> statement-breakpoint
DROP TABLE `games_list`;--> statement-breakpoint
ALTER TABLE `__new_games_list` RENAME TO `games_list`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_list_user_media` ON `games_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE INDEX `ix_games_list_media_id` ON `games_list` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_games_list_user_media_rated` ON `games_list` (`user_id`,`media_id`) WHERE "games_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_games_list_media_user_rated` ON `games_list` (`media_id`,`user_id`) WHERE "games_list"."rating" IS NOT NULL;