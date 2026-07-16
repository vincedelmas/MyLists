ALTER TABLE `library_change` ADD `media_name_snapshot` text;
--> statement-breakpoint
-- profile-update-snapshot-backfill-start
UPDATE `library_change`
SET `media_name_snapshot` = (
    SELECT `media_name`
    FROM `user_media_update`
    WHERE `user_media_update`.`id` = `library_change`.`legacy_update_id`
)
WHERE `legacy_update_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `library_change`
SET `media_name_snapshot` = (
    SELECT `catalog_item`.`name`
    FROM `library_entry`
    INNER JOIN `catalog_item` ON `catalog_item`.`id` = `library_entry`.`catalog_item_id`
    WHERE `library_entry`.`id` = `library_change`.`library_entry_id`
)
WHERE `media_name_snapshot` IS NULL;
