PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_book_author` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "book_author_position_check" CHECK("__new_book_author"."position" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_book_author`("id", "catalog_item_id", "name", "position")
SELECT
	"id",
	"catalog_item_id",
	"name",
	ROW_NUMBER() OVER (PARTITION BY "catalog_item_id" ORDER BY "id")
FROM `book_author`;--> statement-breakpoint
DROP TABLE `book_author`;--> statement-breakpoint
ALTER TABLE `__new_book_author` RENAME TO `book_author`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_book_author_item_name` ON `book_author` (`catalog_item_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_book_author_item_position` ON `book_author` (`catalog_item_id`,`position`);--> statement-breakpoint
CREATE INDEX `ix_book_author_name_item` ON `book_author` (`name`,`catalog_item_id`);
