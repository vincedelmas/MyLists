ALTER TABLE `books` ADD `release_date_source` text DEFAULT 'edition' NOT NULL;
--> statement-breakpoint
-- Retain work dates already supplied by a manager or a work provider.
UPDATE books SET release_date_source = 'manual' WHERE release_date IS NOT NULL;
--> statement-breakpoint
-- Give existing works a provisional date from their oldest known edition.
UPDATE books SET release_date = (
    SELECT MIN(release_date) FROM book_editions WHERE media_id = books.id
) WHERE release_date_source = 'edition';
--> statement-breakpoint
UPDATE which_came_first_media SET release_date = (
    SELECT release_date FROM books WHERE books.id = which_came_first_media.media_id
) WHERE media_type = 'books' AND EXISTS (
    SELECT 1 FROM books WHERE books.id = which_came_first_media.media_id AND release_date IS NOT NULL
);
