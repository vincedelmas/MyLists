PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_achievement` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`achievement_id` integer NOT NULL,
	`tier_id` integer NOT NULL,
	`progress` real DEFAULT 0 NOT NULL,
	`count` real DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` text,
	`last_calculated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievement`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tier_id`) REFERENCES `achievement_tier`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_achievement_count_check" CHECK("__new_user_achievement"."count" >= 0),
	CONSTRAINT "user_achievement_progress_check" CHECK("__new_user_achievement"."progress" >= 0 AND "__new_user_achievement"."progress" <= 100)
);
--> statement-breakpoint
INSERT INTO `__new_user_achievement`("id", "user_id", "achievement_id", "tier_id", "progress", "count", "completed", "completed_at", "last_calculated_at") SELECT "id", "user_id", "achievement_id", "tier_id", "progress", "count", "completed", "completed_at", "last_calculated_at" FROM `user_achievement`;--> statement-breakpoint
DROP TABLE `user_achievement`;--> statement-breakpoint
ALTER TABLE `__new_user_achievement` RENAME TO `user_achievement`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_achievement_identity` ON `user_achievement` (`user_id`,`achievement_id`,`tier_id`);--> statement-breakpoint
CREATE INDEX `ix_user_achievement_user_completed` ON `user_achievement` (`user_id`,`completed`,`completed_at`);