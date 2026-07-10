CREATE UNIQUE INDEX `ux_import_jobs_user_active` ON `import_jobs` (`user_id`) WHERE status IN ('parsing', 'queued', 'processing');
