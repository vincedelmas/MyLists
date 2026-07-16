PRAGMA foreign_keys=OFF;--> statement-breakpoint
UPDATE `media_notifications`
SET `media_id` = (
	SELECT mapping.`catalog_item_id`
	FROM `legacy_catalog_item_mapping` mapping
	WHERE mapping.`kind` = `media_notifications`.`media_type`
		AND mapping.`legacy_media_id` = `media_notifications`.`media_id`
)
WHERE EXISTS (
	SELECT 1 FROM `legacy_catalog_item_mapping` mapping
	WHERE mapping.`kind` = `media_notifications`.`media_type`
		AND mapping.`legacy_media_id` = `media_notifications`.`media_id`
)
	AND NOT EXISTS (
		SELECT 1 FROM `catalog_item` item
		WHERE item.`id` = `media_notifications`.`media_id`
			AND item.`kind` = `media_notifications`.`media_type`
	);--> statement-breakpoint
UPDATE `daily_mediadle`
SET `media_id` = (
	SELECT mapping.`catalog_item_id`
	FROM `legacy_catalog_item_mapping` mapping
	WHERE mapping.`kind` = `daily_mediadle`.`media_type`
		AND mapping.`legacy_media_id` = `daily_mediadle`.`media_id`
)
WHERE EXISTS (
	SELECT 1 FROM `legacy_catalog_item_mapping` mapping
	WHERE mapping.`kind` = `daily_mediadle`.`media_type`
		AND mapping.`legacy_media_id` = `daily_mediadle`.`media_id`
)
	AND NOT EXISTS (
		SELECT 1 FROM `catalog_item` item
		WHERE item.`id` = `daily_mediadle`.`media_id`
			AND item.`kind` = `daily_mediadle`.`media_type`
	);--> statement-breakpoint
UPDATE `which_came_first_rounds`
SET `left_media_id` = CASE WHEN EXISTS (
		SELECT 1 FROM `catalog_item` item
		WHERE item.`id` = `which_came_first_rounds`.`left_media_id`
			AND item.`kind` = `which_came_first_rounds`.`left_media_type`
	) THEN `left_media_id` ELSE COALESCE((
		SELECT mapping.`catalog_item_id`
		FROM `legacy_catalog_item_mapping` mapping
		WHERE mapping.`kind` = `which_came_first_rounds`.`left_media_type`
			AND mapping.`legacy_media_id` = `which_came_first_rounds`.`left_media_id`
	), `left_media_id`) END,
	`right_media_id` = CASE WHEN EXISTS (
		SELECT 1 FROM `catalog_item` item
		WHERE item.`id` = `which_came_first_rounds`.`right_media_id`
			AND item.`kind` = `which_came_first_rounds`.`right_media_type`
	) THEN `right_media_id` ELSE COALESCE((
		SELECT mapping.`catalog_item_id`
		FROM `legacy_catalog_item_mapping` mapping
		WHERE mapping.`kind` = `which_came_first_rounds`.`right_media_type`
			AND mapping.`legacy_media_id` = `which_came_first_rounds`.`right_media_id`
	), `right_media_id`) END;--> statement-breakpoint
UPDATE `import_items`
SET `matched_media_id` = (
	SELECT mapping.`catalog_item_id`
	FROM `legacy_catalog_item_mapping` mapping
	WHERE mapping.`kind` = `import_items`.`media_type`
		AND mapping.`legacy_media_id` = `import_items`.`matched_media_id`
)
WHERE `matched_media_id` IS NOT NULL
	AND `media_type` IS NOT NULL
	AND EXISTS (
		SELECT 1 FROM `legacy_catalog_item_mapping` mapping
		WHERE mapping.`kind` = `import_items`.`media_type`
			AND mapping.`legacy_media_id` = `import_items`.`matched_media_id`
	)
	AND NOT EXISTS (
		SELECT 1 FROM `catalog_item` item
		WHERE item.`id` = `import_items`.`matched_media_id`
			AND item.`kind` = `import_items`.`media_type`
	);--> statement-breakpoint
WITH RECURSIVE
`highlight_targets` AS (
	SELECT
		profile.`id` AS `profile_id`,
		ROW_NUMBER() OVER (PARTITION BY profile.`id` ORDER BY node.`fullkey`) AS `sequence`,
		node.`fullkey` AS `json_path`,
		mapping.`catalog_item_id` AS `catalog_item_id`
	FROM `profile_custom` profile, json_tree(profile.`value`) node
	JOIN `legacy_catalog_item_mapping` mapping
		ON mapping.`kind` = json_extract(profile.`value`, node.`path` || '.mediaType')
		AND mapping.`legacy_media_id` = CAST(node.`value` AS INTEGER)
	WHERE profile.`key` = 'highlightedMedia' AND node.`key` = 'mediaId'
		AND NOT EXISTS (
			SELECT 1 FROM `catalog_item` item
			WHERE item.`id` = CAST(node.`value` AS INTEGER)
				AND item.`kind` = json_extract(profile.`value`, node.`path` || '.mediaType')
		)
),
`rewritten_highlights` (`profile_id`, `sequence`, `value`) AS (
	SELECT profile.`id`, 0, profile.`value`
	FROM `profile_custom` profile
	WHERE profile.`key` = 'highlightedMedia'
	UNION ALL
	SELECT rewritten.`profile_id`, rewritten.`sequence` + 1,
		json_set(rewritten.`value`, target.`json_path`, target.`catalog_item_id`)
	FROM `rewritten_highlights` rewritten
	JOIN `highlight_targets` target
		ON target.`profile_id` = rewritten.`profile_id`
		AND target.`sequence` = rewritten.`sequence` + 1
)
UPDATE `profile_custom` AS profile
SET `value` = (
	SELECT rewritten.`value`
	FROM `rewritten_highlights` rewritten
	WHERE rewritten.`profile_id` = profile.`id`
	ORDER BY rewritten.`sequence` DESC
	LIMIT 1
)
WHERE profile.`key` = 'highlightedMedia';--> statement-breakpoint
CREATE TABLE `__new_library_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`library_entry_id` integer,
	`units_gained` real NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`redo` integer DEFAULT false NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`month_bucket` text NOT NULL,
	`last_updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "library_activity_kind_check" CHECK("__new_library_activity"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "library_activity_month_check" CHECK("__new_library_activity"."month_bucket" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
INSERT INTO `__new_library_activity`("id", "user_id", "kind", "catalog_item_id", "library_entry_id", "units_gained", "completed", "redo", "hidden", "month_bucket", "last_updated_at")
SELECT activity."id", activity."user_id", activity."kind",
	COALESCE(activity."catalog_item_id", mapping."catalog_item_id"), activity."library_entry_id",
	activity."units_gained", activity."completed", activity."redo", activity."hidden",
	activity."month_bucket", activity."last_updated_at"
FROM `library_activity` activity
LEFT JOIN `legacy_catalog_item_mapping` mapping
	ON mapping."kind" = activity."kind" AND mapping."legacy_media_id" = activity."legacy_media_id"
WHERE COALESCE(activity."catalog_item_id", mapping."catalog_item_id") IS NOT NULL;--> statement-breakpoint
DROP TABLE `library_activity`;--> statement-breakpoint
ALTER TABLE `__new_library_activity` RENAME TO `library_activity`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_activity_user_catalog_month` ON `library_activity` (`user_id`,`catalog_item_id`,`month_bucket`);--> statement-breakpoint
CREATE INDEX `ix_library_activity_user_month` ON `library_activity` (`user_id`,`month_bucket`);--> statement-breakpoint
CREATE INDEX `ix_library_activity_month_updated` ON `library_activity` (`month_bucket`,`last_updated_at`);--> statement-breakpoint
DROP INDEX `ux_library_change_legacy_update`;--> statement-breakpoint
ALTER TABLE `library_change` DROP COLUMN `legacy_update_id`;--> statement-breakpoint
CREATE TABLE `__new_daily_mediadle` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_type` text NOT NULL,
	`media_id` integer NOT NULL,
	`date` text NOT NULL,
	`pixelation_levels` integer DEFAULT 5 NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_daily_mediadle`("id", "media_type", "media_id", "date", "pixelation_levels") SELECT "id", "media_type", "media_id", "date", "pixelation_levels" FROM `daily_mediadle`;--> statement-breakpoint
DROP TABLE `daily_mediadle`;--> statement-breakpoint
ALTER TABLE `__new_daily_mediadle` RENAME TO `daily_mediadle`;--> statement-breakpoint
CREATE TABLE `__new_which_came_first_media` (
	`media_id` integer NOT NULL,
	`release_date` text NOT NULL,
	`media_type` text NOT NULL,
	PRIMARY KEY(`media_type`, `media_id`),
	FOREIGN KEY (`media_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `__new_which_came_first_media`("media_id", "release_date", "media_type")
SELECT COALESCE(item.`id`, mapping.`catalog_item_id`), pool.`release_date`, pool.`media_type`
FROM `which_came_first_media` pool
LEFT JOIN `catalog_item` item
	ON item.`id` = pool.`media_id` AND item.`kind` = pool.`media_type`
LEFT JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = pool.`media_type` AND mapping.`legacy_media_id` = pool.`media_id`
WHERE COALESCE(item.`id`, mapping.`catalog_item_id`) IS NOT NULL
ORDER BY item.`id` IS NOT NULL DESC, pool.`media_id`;--> statement-breakpoint
DROP TABLE `which_came_first_media`;--> statement-breakpoint
ALTER TABLE `__new_which_came_first_media` RENAME TO `which_came_first_media`;--> statement-breakpoint
CREATE INDEX `ix_wcf_media_type_release_date` ON `which_came_first_media` (`media_type`,`release_date`);--> statement-breakpoint
CREATE TABLE `__new_which_came_first_rounds` (
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
	FOREIGN KEY (`run_id`) REFERENCES `which_came_first_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`left_media_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`right_media_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_which_came_first_rounds`("id", "run_id", "round_number", "left_media_id", "left_release_date", "right_media_id", "right_release_date", "correct", "selected_side", "left_media_type", "right_media_type", "answered_at", "created_at") SELECT "id", "run_id", "round_number", "left_media_id", "left_release_date", "right_media_id", "right_release_date", "correct", "selected_side", "left_media_type", "right_media_type", "answered_at", "created_at" FROM `which_came_first_rounds`;--> statement-breakpoint
DROP TABLE `which_came_first_rounds`;--> statement-breakpoint
ALTER TABLE `__new_which_came_first_rounds` RENAME TO `which_came_first_rounds`;--> statement-breakpoint
CREATE INDEX `ix_wcf_round_run_answered` ON `which_came_first_rounds` (`run_id`,`answered_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_wcf_round_run_number` ON `which_came_first_rounds` (`run_id`,`round_number`);--> statement-breakpoint
CREATE TABLE `__new_media_notifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`media_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`season` integer,
	`episode` integer,
	`is_season_finale` integer,
	`release_date` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_media_notifications`("id", "user_id", "name", "media_id", "media_type", "season", "episode", "is_season_finale", "release_date", "read", "created_at") SELECT "id", "user_id", "name", "media_id", "media_type", "season", "episode", "is_season_finale", "release_date", "read", "created_at" FROM `media_notifications`;--> statement-breakpoint
DROP TABLE `media_notifications`;--> statement-breakpoint
ALTER TABLE `__new_media_notifications` RENAME TO `media_notifications`;--> statement-breakpoint
CREATE TABLE `__new_import_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`name` text,
	`release_date` text,
	`status_reason` text,
	`external_api_id` text,
	`row_number` integer NOT NULL,
	`matched_media_id` integer,
	`media_type` text,
	`payload_json` text NOT NULL,
	`external_api_source` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `import_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matched_media_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_import_items`("id", "job_id", "name", "release_date", "status_reason", "external_api_id", "row_number", "matched_media_id", "media_type", "payload_json", "external_api_source", "status", "created_at", "updated_at") SELECT "id", "job_id", "name", "release_date", "status_reason", "external_api_id", "row_number", "matched_media_id", "media_type", "payload_json", "external_api_source", "status", "created_at", "updated_at" FROM `import_items`;--> statement-breakpoint
DROP TABLE `import_items`;--> statement-breakpoint
ALTER TABLE `__new_import_items` RENAME TO `import_items`;--> statement-breakpoint
CREATE INDEX `ix_import_items_job_status_media_type` ON `import_items` (`job_id`,`status`,`media_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_import_items_job_row` ON `import_items` (`job_id`,`row_number`);--> statement-breakpoint
DROP TABLE `legacy_catalog_item_mapping`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
