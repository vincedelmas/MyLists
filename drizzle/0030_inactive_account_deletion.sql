CREATE TABLE `inactive_account_deletion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`username` text NOT NULL,
	`status` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`warning_sent_at` text,
	`deletion_scheduled_at` text NOT NULL,
	`deleted_at` text,
	`resurrected_at` text,
	`email_retry_count` integer DEFAULT 0 NOT NULL,
	`last_email_attempt_at` text,
	`last_email_error` text,
	`warning_token_hash` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_user_id` ON `inactive_account_deletion` (`user_id`);
--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_status` ON `inactive_account_deletion` (`status`);
--> statement-breakpoint
CREATE INDEX `ix_inactive_account_deletion_deletion_scheduled_at` ON `inactive_account_deletion` (`deletion_scheduled_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_inactive_account_deletion_warning_token_hash` ON `inactive_account_deletion` (`warning_token_hash`);
