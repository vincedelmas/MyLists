CREATE TABLE `year_recap_release` (
	`year` integer PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'automatic' NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "year_recap_release_mode_check" CHECK("year_recap_release"."mode" IN ('automatic', 'enabled', 'disabled'))
);
