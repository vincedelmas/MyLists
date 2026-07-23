ALTER TABLE `user_media_activity` RENAME TO `user_media_monthly_activity`;--> statement-breakpoint
ALTER TABLE `user_media_monthly_activity` RENAME COLUMN "specific_gained" TO "progress_gained";--> statement-breakpoint
ALTER TABLE `user_media_monthly_activity` RENAME COLUMN "is_completed" TO "had_completion";--> statement-breakpoint
ALTER TABLE `user_media_monthly_activity` RENAME COLUMN "is_redo" TO "redo_gained";--> statement-breakpoint
ALTER TABLE `user_media_monthly_activity` RENAME COLUMN "last_update" TO "last_activity_at";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_media_monthly_activity` (
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
	CONSTRAINT "user_media_monthly_activity_progress_nonnegative_check" CHECK("__new_user_media_monthly_activity"."progress_gained" >= 0),
	CONSTRAINT "user_media_monthly_activity_redo_nonnegative_check" CHECK("__new_user_media_monthly_activity"."redo_gained" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_user_media_monthly_activity`("id", "user_id", "media_id", "media_type", "progress_gained", "had_completion", "redo_gained", "month_bucket", "last_activity_at", "hidden") SELECT "id", "user_id", "media_id", "media_type", "progress_gained", "had_completion", "redo_gained", "month_bucket", "last_activity_at", "hidden" FROM `user_media_monthly_activity`;--> statement-breakpoint
DROP TABLE `user_media_monthly_activity`;--> statement-breakpoint
ALTER TABLE `__new_user_media_monthly_activity` RENAME TO `user_media_monthly_activity`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_media_id` ON `user_media_monthly_activity` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_media_type` ON `user_media_monthly_activity` (`media_type`);--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_month_bucket` ON `user_media_monthly_activity` (`month_bucket`);--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_user_last_activity` ON `user_media_monthly_activity` (`user_id`,`last_activity_at`);--> statement-breakpoint
CREATE INDEX `ix_user_media_monthly_activity_user_month_type_activity` ON `user_media_monthly_activity` (`user_id`,`month_bucket`,`media_type`,`last_activity_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_media_monthly_activity_bucket` ON `user_media_monthly_activity` (`user_id`,`media_id`,`media_type`,`month_bucket`);