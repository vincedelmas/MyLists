CREATE TABLE `book_work_candidates` (
	`first_work_id` integer NOT NULL,
	`second_work_id` integer NOT NULL,
	`score` integer NOT NULL,
	`evidence` text NOT NULL,
	`source` text DEFAULT 'scan' NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`first_work_id`, `second_work_id`),
	FOREIGN KEY (`first_work_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`second_work_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `book_editions` ADD `synopsis` text;
--> statement-breakpoint
-- Preserve the existing edition description before any catalogue merges.
UPDATE book_editions SET synopsis = (
    SELECT synopsis FROM books WHERE books.id = book_editions.media_id AND books.api_id = book_editions.api_id
) WHERE synopsis IS NULL;
--> statement-breakpoint
-- These two readers selected their covers through the old shared-book editor.
UPDATE books_list SET custom_cover = (
    SELECT image_cover FROM books WHERE books.id = books_list.media_id
) WHERE user_id IN (9, 166) AND custom_cover IS NULL
    AND EXISTS (SELECT 1 FROM books WHERE books.id = books_list.media_id AND image_cover <> 'default.jpg' AND image_cover <> '');
