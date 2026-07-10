CREATE TABLE `import_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`row_number` integer NOT NULL,
	`media_type` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`name` text,
	`release_date` text,
	`external_api_source` text,
	`external_api_id` text,
	`matched_media_id` integer,
	`payload_json` text NOT NULL,
	`status_reason` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `import_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_import_items_job_status_media_type` ON `import_items` (`job_id`,`status`,`media_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_import_items_job_row` ON `import_items` (`job_id`,`row_number`);--> statement-breakpoint
CREATE TABLE `import_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'parsing' NOT NULL,
	`total_count` integer DEFAULT 0 NOT NULL,
	`processed_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`started_at` text,
	`finished_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_import_jobs_status_created_at` ON `import_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_import_jobs_user_created_at` ON `import_jobs` (`user_id`,`created_at`);