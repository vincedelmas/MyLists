CREATE TABLE `book_editions` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`api_id` text NOT NULL,
	`name` text NOT NULL,
	`pages` integer,
	`language` text,
	`publishers` text,
	`release_date` text,
	`image_cover` text NOT NULL,
	`authors` text DEFAULT '[]' NOT NULL,
	`isbns` text DEFAULT '[]' NOT NULL,
	`open_library_work_id` text,
	`match_locked` integer DEFAULT false NOT NULL,
	`last_api_update` text,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "book_editions_pages_check" CHECK("book_editions"."pages" IS NULL OR "book_editions"."pages" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `book_editions_apiId_unique` ON `book_editions` (`api_id`);--> statement-breakpoint
CREATE INDEX `ix_book_editions_work` ON `book_editions` (`media_id`);--> statement-breakpoint
CREATE INDEX `ix_book_editions_open_library_work` ON `book_editions` (`open_library_work_id`);--> statement-breakpoint
CREATE TABLE `book_work_audit` (
	`id` integer PRIMARY KEY NOT NULL,
	`actor_id` integer,
	`action` text NOT NULL,
	`source_work_id` integer NOT NULL,
	`target_work_id` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `book_work_exclusions` (
	`first_work_id` integer NOT NULL,
	`second_work_id` integer NOT NULL,
	PRIMARY KEY(`first_work_id`, `second_work_id`),
	FOREIGN KEY (`first_work_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`second_work_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `books_list` ADD `edition_id` integer REFERENCES book_editions(id);--> statement-breakpoint
ALTER TABLE `books_list` ADD `pages` integer;--> statement-breakpoint
ALTER TABLE `books_list` ADD `language` text;--> statement-breakpoint
ALTER TABLE `books_list` ADD `publishers` text;--> statement-breakpoint
ALTER TABLE `books_list` ADD `edition_name` text;--> statement-breakpoint
ALTER TABLE `books_list` ADD `reread_pages` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
-- Preserve each existing volume and each reader's edition before separating work metadata.
INSERT INTO book_editions (id, media_id, api_id, name, pages, language, publishers, release_date, image_cover, authors, last_api_update)
SELECT b.id, b.id, b.api_id, b.name, b.pages, b.language, b.publishers, b.release_date, b.image_cover,
       (SELECT COALESCE(json_group_array(a.name), '[]') FROM books_authors a WHERE a.media_id = b.id), b.last_api_update
FROM books b;
--> statement-breakpoint
UPDATE books_list SET
    edition_id = media_id,
    pages = (SELECT pages FROM book_editions WHERE id = books_list.media_id),
    language = (SELECT language FROM book_editions WHERE id = books_list.media_id),
    publishers = (SELECT publishers FROM book_editions WHERE id = books_list.media_id),
    edition_name = (SELECT name FROM book_editions WHERE id = books_list.media_id),
    reread_pages = (WITH RECURSIVE reads(n, page_count) AS (
        SELECT 1, pages FROM book_editions WHERE id = books_list.media_id AND books_list.redo > 0
        UNION ALL SELECT n + 1, page_count FROM reads WHERE n < books_list.redo
    ) SELECT json_group_array(page_count) FROM reads);
--> statement-breakpoint
-- A volume's publication date is not evidence of the work's first publication date.
UPDATE books SET release_date = NULL;
--> statement-breakpoint
DELETE FROM which_came_first_media WHERE media_type = 'books';
--> statement-breakpoint
ALTER TABLE `books` DROP COLUMN `pages`;--> statement-breakpoint
ALTER TABLE `books` DROP COLUMN `language`;--> statement-breakpoint
ALTER TABLE `books` DROP COLUMN `publishers`;
