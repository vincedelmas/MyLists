DELETE FROM `user_achievement`
WHERE `user_id` IS NULL
   OR `achievement_id` IS NULL
   OR `tier_id` IS NULL;--> statement-breakpoint
DELETE FROM `user_achievement`
WHERE `id` IN (
	SELECT `id`
	FROM (
		SELECT
			`id`,
			row_number() OVER (
				PARTITION BY `user_id`, `tier_id`
				ORDER BY `last_calculated_at` DESC NULLS LAST, `id` DESC
			) AS `duplicate_rank`
		FROM `user_achievement`
	)
	WHERE `duplicate_rank` > 1
);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_achievement` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`achievement_id` integer NOT NULL,
	`tier_id` integer NOT NULL,
	`progress` real,
	`count` real,
	`completed` integer,
	`completed_at` text,
	`last_calculated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievement`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tier_id`) REFERENCES `achievement_tier`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_achievement`("id", "user_id", "achievement_id", "tier_id", "progress", "count", "completed", "completed_at", "last_calculated_at") SELECT "id", "user_id", "achievement_id", "tier_id", "progress", "count", "completed", "completed_at", "last_calculated_at" FROM `user_achievement`;--> statement-breakpoint
DROP TABLE `user_achievement`;--> statement-breakpoint
ALTER TABLE `__new_user_achievement` RENAME TO `user_achievement`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_achievement_user_tier_unique_idx` ON `user_achievement` (`user_id`,`tier_id`);
