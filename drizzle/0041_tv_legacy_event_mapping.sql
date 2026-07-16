ALTER TABLE `library_activity` ADD `legacy_activity_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_activity_legacy_activity` ON `library_activity` (`legacy_activity_id`);--> statement-breakpoint
ALTER TABLE `library_change` ADD `legacy_update_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_library_change_legacy_update` ON `library_change` (`legacy_update_id`);--> statement-breakpoint

-- tv-legacy-event-backfill-start
UPDATE `library_change`
SET `legacy_update_id` = (
	SELECT updates.`id`
	FROM `library_entry` entry
	JOIN `legacy_catalog_item_mapping` mapping
		ON mapping.`catalog_item_id` = entry.`catalog_item_id`
	JOIN `user_media_update` updates
		ON updates.`user_id` = entry.`user_id`
		AND updates.`media_type` = mapping.`kind`
		AND updates.`media_id` = mapping.`legacy_media_id`
		AND updates.`update_type` = `library_change`.`update_type`
		AND updates.`timestamp` = `library_change`.`occurred_at`
	WHERE entry.`id` = `library_change`.`library_entry_id`
	LIMIT 1
)
WHERE `legacy_update_id` IS NULL
	AND `library_change`.`id` = (
		SELECT MAX(newest_change.`id`)
		FROM `library_change` newest_change
		WHERE newest_change.`library_entry_id` = `library_change`.`library_entry_id`
			AND newest_change.`update_type` = `library_change`.`update_type`
			AND newest_change.`occurred_at` = `library_change`.`occurred_at`
	);--> statement-breakpoint
UPDATE `library_activity`
SET `legacy_activity_id` = (
	SELECT activity.`id`
	FROM `library_entry` entry
	JOIN `legacy_catalog_item_mapping` mapping
		ON mapping.`catalog_item_id` = entry.`catalog_item_id`
	JOIN `user_media_activity` activity
		ON activity.`user_id` = entry.`user_id`
		AND activity.`media_type` = mapping.`kind`
		AND activity.`media_id` = mapping.`legacy_media_id`
		AND activity.`month_bucket` = `library_activity`.`month_bucket`
	WHERE entry.`id` = `library_activity`.`library_entry_id`
	LIMIT 1
)
WHERE `legacy_activity_id` IS NULL;
