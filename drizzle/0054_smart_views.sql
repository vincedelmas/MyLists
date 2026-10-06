CREATE TABLE `smart_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`spec` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "smart_views_spec_json_check" CHECK(json_valid("smart_views"."spec"))
);
--> statement-breakpoint
CREATE INDEX `ix_smart_views_user_id` ON `smart_views` (`user_id`);