ALTER TABLE `import_jobs` ADD `next_attempt_at` text;--> statement-breakpoint
CREATE INDEX `ix_import_jobs_status_next_attempt_at` ON `import_jobs` (`status`,`next_attempt_at`);