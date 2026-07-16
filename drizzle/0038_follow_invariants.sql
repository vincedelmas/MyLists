PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_followers` (
	`follower_id` integer NOT NULL,
	`followed_id` integer NOT NULL,
	`status` text DEFAULT 'accepted' NOT NULL,
	PRIMARY KEY(`follower_id`, `followed_id`),
	FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`followed_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "followers_no_self_check" CHECK("__new_followers"."follower_id" <> "__new_followers"."followed_id"),
	CONSTRAINT "followers_status_check" CHECK("__new_followers"."status" IN ('accepted', 'requested'))
);
--> statement-breakpoint
INSERT OR IGNORE INTO `__new_followers`("follower_id", "followed_id", "status")
SELECT "follower_id", "followed_id", "status"
FROM `followers`
WHERE "follower_id" <> "followed_id" AND "status" IN ('accepted', 'requested');--> statement-breakpoint
DROP TABLE `followers`;--> statement-breakpoint
ALTER TABLE `__new_followers` RENAME TO `followers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ix_followers_followed_status` ON `followers` (`followed_id`,`status`);--> statement-breakpoint
CREATE INDEX `ix_followers_follower_status` ON `followers` (`follower_id`,`status`);
