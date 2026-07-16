CREATE TABLE `editorial_collection` (
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
	CONSTRAINT "editorial_collection_kind_check" CHECK("editorial_collection"."kind" IN ('series', 'anime', 'movies', 'books', 'games', 'manga')),
	CONSTRAINT "editorial_collection_visibility_check" CHECK("editorial_collection"."visibility" IN ('private', 'restricted', 'public')),
	CONSTRAINT "editorial_collection_title_check" CHECK(length(trim("editorial_collection"."title")) > 0),
	CONSTRAINT "editorial_collection_view_count_check" CHECK("editorial_collection"."view_count" >= 0),
	CONSTRAINT "editorial_collection_copied_count_check" CHECK("editorial_collection"."copied_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_editorial_collection_owner` ON `editorial_collection` (`owner_id`,`kind`);--> statement-breakpoint
CREATE INDEX `ix_editorial_collection_discovery` ON `editorial_collection` (`visibility`,`kind`);--> statement-breakpoint
CREATE TABLE `editorial_collection_item` (
	`collection_id` integer NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`position` integer NOT NULL,
	`annotation` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`collection_id`, `catalog_item_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `editorial_collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "editorial_collection_item_position_check" CHECK("editorial_collection_item"."position" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_editorial_collection_item_position` ON `editorial_collection_item` (`collection_id`,`position`);--> statement-breakpoint
CREATE INDEX `ix_editorial_collection_item_catalog` ON `editorial_collection_item` (`catalog_item_id`,`collection_id`);--> statement-breakpoint
CREATE TABLE `editorial_collection_like` (
	`collection_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`collection_id`, `user_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `editorial_collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_editorial_collection_like_user` ON `editorial_collection_like` (`user_id`,`collection_id`);
--> statement-breakpoint
-- collections-rewrite-backfill-start
INSERT INTO `editorial_collection` (
    `id`, `owner_id`, `title`, `description`, `kind`, `visibility`, `ordered`,
    `view_count`, `copied_count`, `created_at`, `updated_at`
)
SELECT
    `id`, `owner_id`, `title`, `description`, `media_type`, `privacy`, `ordered`,
    `view_count`, `copied_count`, `created_at`, `updated_at`
FROM `collections`;
--> statement-breakpoint
INSERT INTO `editorial_collection_item` (
    `collection_id`, `catalog_item_id`, `position`, `annotation`, `created_at`
)
SELECT
    ci.`collection_id`, mapping.`catalog_item_id`, ci.`order_index`, ci.`annotation`, ci.`created_at`
FROM `collection_items` ci
INNER JOIN `legacy_catalog_item_mapping` mapping
    ON mapping.`kind` = ci.`media_type`
    AND mapping.`legacy_media_id` = ci.`media_id`;
--> statement-breakpoint
INSERT INTO `editorial_collection_like` (`collection_id`, `user_id`, `created_at`)
SELECT `collection_id`, `user_id`, `created_at`
FROM `collection_likes`;
