DROP VIEW IF EXISTS `wcf_media_catalog`;--> statement-breakpoint
DROP TABLE IF EXISTS `which_came_first_rounds`;--> statement-breakpoint
DROP TABLE IF EXISTS `which_came_first_runs`;--> statement-breakpoint
DROP TABLE IF EXISTS `which_came_first_media`;--> statement-breakpoint
CREATE TABLE `which_came_first_media` (
	`media_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`release_date` text NOT NULL,
	PRIMARY KEY(`media_type`, `media_id`)
);
--> statement-breakpoint
CREATE INDEX `ix_wcf_media_type_release_date` ON `which_came_first_media` (`media_type`,`release_date`);--> statement-breakpoint
CREATE TABLE `which_came_first_rounds` (
	`id` integer PRIMARY KEY NOT NULL,
	`run_id` integer NOT NULL,
	`round_number` integer NOT NULL,
	`left_media_id` integer NOT NULL,
	`left_release_date` text NOT NULL,
	`right_media_id` integer NOT NULL,
	`right_release_date` text NOT NULL,
	`correct` integer,
	`selected_side` text,
	`left_media_type` text NOT NULL,
	`right_media_type` text NOT NULL,
	`answered_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `which_came_first_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_wcf_round_run_answered` ON `which_came_first_rounds` (`run_id`,`answered_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_wcf_round_run_number` ON `which_came_first_rounds` (`run_id`,`round_number`);--> statement-breakpoint
CREATE TABLE `which_came_first_runs` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`completed_at` text,
	`score` integer DEFAULT 0 NOT NULL,
	`started_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`selected_media_types` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_wcf_runs_user_status` ON `which_came_first_runs` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `ix_wcf_runs_user_completed` ON `which_came_first_runs` (`user_id`,`completed_at`);
