ALTER TABLE `editorial_collection` RENAME TO `collection`;--> statement-breakpoint
ALTER TABLE `editorial_collection_item` RENAME TO `collection_item`;--> statement-breakpoint
ALTER TABLE `editorial_collection_like` RENAME TO `collection_like`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_collection` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`kind` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`ordered` integer DEFAULT false NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`copied_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "collection_kind_check" CHECK("__new_collection"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "collection_visibility_check" CHECK("__new_collection"."visibility" IN ('private', 'restricted', 'public')),
	CONSTRAINT "collection_title_check" CHECK(length(trim("__new_collection"."title")) > 0),
	CONSTRAINT "collection_view_count_check" CHECK("__new_collection"."view_count" >= 0),
	CONSTRAINT "collection_copied_count_check" CHECK("__new_collection"."copied_count" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_collection`("id", "owner_id", "title", "description", "kind", "visibility", "ordered", "view_count", "copied_count", "created_at", "updated_at") SELECT "id", "owner_id", "title", "description", "kind", "visibility", "ordered", "view_count", "copied_count", "created_at", "updated_at" FROM `collection`;--> statement-breakpoint
DROP TABLE `collection`;--> statement-breakpoint
ALTER TABLE `__new_collection` RENAME TO `collection`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ix_collection_owner` ON `collection` (`owner_id`,`kind`);--> statement-breakpoint
CREATE INDEX `ix_collection_discovery` ON `collection` (`visibility`,`kind`);--> statement-breakpoint
CREATE TABLE `__new_collection_item` (
	`collection_id` integer NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`position` integer NOT NULL,
	`annotation` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`collection_id`, `catalog_item_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "collection_item_position_check" CHECK("__new_collection_item"."position" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_collection_item`("collection_id", "catalog_item_id", "position", "annotation", "created_at") SELECT "collection_id", "catalog_item_id", "position", "annotation", "created_at" FROM `collection_item`;--> statement-breakpoint
DROP TABLE `collection_item`;--> statement-breakpoint
ALTER TABLE `__new_collection_item` RENAME TO `collection_item`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_collection_item_position` ON `collection_item` (`collection_id`,`position`);--> statement-breakpoint
CREATE INDEX `ix_collection_item_catalog` ON `collection_item` (`catalog_item_id`,`collection_id`);--> statement-breakpoint
CREATE TABLE `__new_collection_like` (
	`collection_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`collection_id`, `user_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_collection_like`("collection_id", "user_id", "created_at") SELECT "collection_id", "user_id", "created_at" FROM `collection_like`;--> statement-breakpoint
DROP TABLE `collection_like`;--> statement-breakpoint
ALTER TABLE `__new_collection_like` RENAME TO `collection_like`;--> statement-breakpoint
CREATE INDEX `ix_collection_like_user` ON `collection_like` (`user_id`,`collection_id`);--> statement-breakpoint
UPDATE `library_change`
SET `payload` = CASE
	WHEN json_type(`payload`, '$.oldValue') IS NULL
		THEN json_set(json_remove(`payload`, '$.old_value'), '$.oldValue', json_extract(`payload`, '$.old_value'))
	ELSE json_remove(`payload`, '$.old_value')
END
WHERE json_valid(`payload`) AND json_type(`payload`, '$.old_value') IS NOT NULL;--> statement-breakpoint
UPDATE `library_change`
SET `payload` = CASE
	WHEN json_type(`payload`, '$.newValue') IS NULL
		THEN json_set(json_remove(`payload`, '$.new_value'), '$.newValue', json_extract(`payload`, '$.new_value'))
	ELSE json_remove(`payload`, '$.new_value')
END
WHERE json_valid(`payload`) AND json_type(`payload`, '$.new_value') IS NOT NULL;
