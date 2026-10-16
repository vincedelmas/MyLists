PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_smart_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`spec` text NOT NULL,
	`profile_position` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "smart_views_spec_json_check" CHECK(json_valid("__new_smart_views"."spec")),
	CONSTRAINT "smart_views_profile_position_check" CHECK("__new_smart_views"."profile_position" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_smart_views`("id", "user_id", "spec", "profile_position", "created_at", "updated_at") SELECT "id", "user_id", "spec", "profile_position", "created_at", "updated_at" FROM `smart_views`;--> statement-breakpoint
DROP TABLE `smart_views`;--> statement-breakpoint
ALTER TABLE `__new_smart_views` RENAME TO `smart_views`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ix_smart_views_user_id` ON `smart_views` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_smart_views_user_profile_position` ON `smart_views` (`user_id`,`profile_position`);