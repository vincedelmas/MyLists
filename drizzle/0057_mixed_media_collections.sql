DROP INDEX `ix_collections_media_type`;--> statement-breakpoint
ALTER TABLE `collections` DROP COLUMN `media_type`;--> statement-breakpoint
DROP INDEX `ux_collection_items_collection_media`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collection_items_collection_media` ON `collection_items` (`collection_id`,`media_type`,`media_id`);