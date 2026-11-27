PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `user_achievement`;--> statement-breakpoint
DROP TABLE `achievement_tier`;--> statement-breakpoint
DROP TABLE `achievement`;--> statement-breakpoint
CREATE TABLE `achievement` (
	`id` integer PRIMARY KEY,
	`code_name` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`media_type` text,
	`icon` text NOT NULL,
	`shape` text NOT NULL,
	`pattern` text NOT NULL,
	`secret` integer DEFAULT false NOT NULL,
	`target` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`rarity` real,
	CONSTRAINT "achievement_target_positive_check" CHECK("target" >= 1),
	CONSTRAINT "achievement_secret_check" CHECK("secret" IN (0, 1)),
	CONSTRAINT "achievement_rarity_range_check" CHECK("rarity" IS NULL OR ("rarity" >= 0 AND "rarity" <= 100))
);
--> statement-breakpoint
CREATE TABLE `user_achievement` (
	`id` integer PRIMARY KEY,
	`user_id` integer NOT NULL,
	`achievement_id` integer NOT NULL,
	`count` real DEFAULT 0 NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` text,
	`metadata` text,
	`last_calculated_at` text,
	CONSTRAINT `user_achievement_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_user_achievement_achievement_id_achievement_id_fk` FOREIGN KEY (`achievement_id`) REFERENCES `achievement`(`id`) ON DELETE CASCADE,
	CONSTRAINT "user_achievement_progress_range_check" CHECK("progress" >= 0 AND "progress" <= 100),
	CONSTRAINT "user_achievement_count_nonnegative_check" CHECK("count" >= 0),
	CONSTRAINT "user_achievement_completed_check" CHECK("completed" IN (0, 1)),
	CONSTRAINT "user_achievement_completed_at_check" CHECK("completed" = 0 OR "completed_at" IS NOT NULL),
	CONSTRAINT "user_achievement_metadata_json_check" CHECK("metadata" IS NULL OR json_valid("metadata"))
);
--> statement-breakpoint
CREATE INDEX `ix_achievement_category_sort` ON `achievement` (`category`,`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_achievement_media_type` ON `achievement` (`media_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_achievement_user_ach_unique_idx` ON `user_achievement` (`user_id`,`achievement_id`);--> statement-breakpoint
CREATE INDEX `ix_user_achievement_ach_user` ON `user_achievement` (`achievement_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `ix_user_achievement_user_completed_at` ON `user_achievement` (`user_id`,`completed_at`) WHERE "user_achievement"."completed" = 1;--> statement-breakpoint
CREATE INDEX `ix_user_achievement_completed_ach` ON `user_achievement` (`achievement_id`) WHERE "user_achievement"."completed" = 1;--> statement-breakpoint
PRAGMA foreign_keys=ON;
