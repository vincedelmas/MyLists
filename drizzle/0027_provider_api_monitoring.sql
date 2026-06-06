CREATE TABLE `api_call_rollup` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`bucket_start_ms` integer NOT NULL,
	`bucket_start` text NOT NULL,
	`total` integer NOT NULL,
	`errors` integer NOT NULL,
	`duration_ms_total` integer NOT NULL,
	`max_second_burst` integer NOT NULL,
	`status_counts` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_api_call_rollup_provider` ON `api_call_rollup` (`provider`);--> statement-breakpoint
CREATE INDEX `ix_api_call_rollup_bucket_start_ms` ON `api_call_rollup` (`bucket_start_ms`);--> statement-breakpoint
CREATE INDEX `ix_api_call_rollup_bucket_start` ON `api_call_rollup` (`bucket_start`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_api_call_rollup_bucket_provider` ON `api_call_rollup` (`bucket_start_ms`,`provider`);
