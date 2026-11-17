CREATE TABLE `__new_user_achievement` (
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
	CONSTRAINT "user_achievement_progress_range_check" CHECK("__new_user_achievement"."progress" IS NULL OR ("__new_user_achievement"."progress" >= 0 AND "__new_user_achievement"."progress" <= 100)),
	CONSTRAINT "user_achievement_count_nonnegative_check" CHECK("__new_user_achievement"."count" IS NULL OR "__new_user_achievement"."count" >= 0),
	CONSTRAINT "user_achievement_completed_check" CHECK("__new_user_achievement"."completed" IS NULL OR "__new_user_achievement"."completed" IN (0, 1)),
	CONSTRAINT "user_achievement_completed_at_check" CHECK("__new_user_achievement"."completed" IS NULL OR "__new_user_achievement"."completed" = 0 OR "__new_user_achievement"."completed_at" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_user_achievement`("id", "user_id", "tier_id", "progress", "count", "completed", "completed_at", "last_calculated_at") SELECT "id", "user_id", "tier_id", "progress", "count", "completed", "completed_at", "last_calculated_at" FROM `user_achievement`;--> statement-breakpoint
DROP TABLE `user_achievement`;--> statement-breakpoint
ALTER TABLE `__new_user_achievement` RENAME TO `user_achievement`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_achievement_user_tier_unique_idx` ON `user_achievement` (`user_id`,`tier_id`);--> statement-breakpoint
CREATE INDEX `ix_user_achievement_tier_user` ON `user_achievement` (`tier_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `ix_user_achievement_user_completed_at` ON `user_achievement` (`user_id`,`completed_at`) WHERE "user_achievement"."completed" = 1;--> statement-breakpoint
CREATE INDEX `ix_user_achievement_completed_tier` ON `user_achievement` (`tier_id`) WHERE "user_achievement"."completed" = 1;
