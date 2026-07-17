PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_entry_id_catalog_item` ON `library_entry` (`id`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `__new_tv_season_rewatch` (
	`library_entry_id` integer NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`library_entry_id`, `season_number`),
	FOREIGN KEY (`library_entry_id`,`catalog_item_id`) REFERENCES `library_entry`(`id`,`catalog_item_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`,`season_number`) REFERENCES `tv_season`(`catalog_item_id`,`season_number`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tv_season_rewatch_count_check" CHECK("__new_tv_season_rewatch"."count" > 0 AND "__new_tv_season_rewatch"."count" <= 100)
);
--> statement-breakpoint
INSERT INTO `__new_tv_season_rewatch`("library_entry_id", "catalog_item_id", "season_number", "count") SELECT "library_entry_id", "catalog_item_id", "season_number", "count" FROM `tv_season_rewatch`;--> statement-breakpoint
DROP TABLE `tv_season_rewatch`;--> statement-breakpoint
ALTER TABLE `__new_tv_season_rewatch` RENAME TO `tv_season_rewatch`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ix_tv_season_rewatch_catalog_season` ON `tv_season_rewatch` (`catalog_item_id`,`season_number`);
