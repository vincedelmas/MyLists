-- Replace only the lock column so media references remain intact with foreign keys enabled.
ALTER TABLE `series` ADD COLUMN `new_lock_status` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `series` SET `new_lock_status` = COALESCE(`lock_status`, false);
--> statement-breakpoint
ALTER TABLE `series` DROP COLUMN `lock_status`;
--> statement-breakpoint
ALTER TABLE `series` RENAME COLUMN `new_lock_status` TO `lock_status`;
--> statement-breakpoint
ALTER TABLE `anime` ADD COLUMN `new_lock_status` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `anime` SET `new_lock_status` = COALESCE(`lock_status`, false);
--> statement-breakpoint
ALTER TABLE `anime` DROP COLUMN `lock_status`;
--> statement-breakpoint
ALTER TABLE `anime` RENAME COLUMN `new_lock_status` TO `lock_status`;
--> statement-breakpoint
ALTER TABLE `movies` ADD COLUMN `new_lock_status` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `movies` SET `new_lock_status` = COALESCE(`lock_status`, false);
--> statement-breakpoint
ALTER TABLE `movies` DROP COLUMN `lock_status`;
--> statement-breakpoint
ALTER TABLE `movies` RENAME COLUMN `new_lock_status` TO `lock_status`;
--> statement-breakpoint
ALTER TABLE `games` ADD COLUMN `new_lock_status` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `games` SET `new_lock_status` = COALESCE(`lock_status`, false);
--> statement-breakpoint
ALTER TABLE `games` DROP COLUMN `lock_status`;
--> statement-breakpoint
ALTER TABLE `games` RENAME COLUMN `new_lock_status` TO `lock_status`;
--> statement-breakpoint
ALTER TABLE `books` ADD COLUMN `new_lock_status` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `books` SET `new_lock_status` = COALESCE(`lock_status`, false);
--> statement-breakpoint
ALTER TABLE `books` DROP COLUMN `lock_status`;
--> statement-breakpoint
ALTER TABLE `books` RENAME COLUMN `new_lock_status` TO `lock_status`;
--> statement-breakpoint
ALTER TABLE `manga` ADD COLUMN `new_lock_status` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `manga` SET `new_lock_status` = COALESCE(`lock_status`, false);
--> statement-breakpoint
ALTER TABLE `manga` DROP COLUMN `lock_status`;
--> statement-breakpoint
ALTER TABLE `manga` RENAME COLUMN `new_lock_status` TO `lock_status`;
