ALTER TABLE `collections` ADD `profile_position` integer CONSTRAINT `collections_profile_position_check` CHECK (`profile_position` > 0);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collections_owner_profile_position` ON `collections` (`owner_id`,`profile_position`);
