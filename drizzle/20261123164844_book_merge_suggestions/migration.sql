CREATE TABLE `book_merge_review` (
	`book_id` integer PRIMARY KEY,
	`reviewed_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT `fk_book_merge_review_book_id_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `book_merge_suggestion` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`group_key` text NOT NULL,
	`target_book_id` integer NOT NULL,
	`confidence` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`reviewed_at` text,
	CONSTRAINT `fk_book_merge_suggestion_target_book_id_books_id_fk` FOREIGN KEY (`target_book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE,
	CONSTRAINT "book_merge_suggestion_confidence_check" CHECK("confidence" IN ('high', 'medium', 'low')),
	CONSTRAINT "book_merge_suggestion_status_check" CHECK("status" IN ('pending', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE `book_merge_suggestion_book` (
	`suggestion_id` integer NOT NULL,
	`book_id` integer NOT NULL,
	CONSTRAINT `book_merge_suggestion_book_pk` PRIMARY KEY(`suggestion_id`, `book_id`),
	CONSTRAINT `fk_book_merge_suggestion_book_suggestion_id_book_merge_suggestion_id_fk` FOREIGN KEY (`suggestion_id`) REFERENCES `book_merge_suggestion`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_book_merge_suggestion_book_book_id_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_book_merge_suggestion_group_key` ON `book_merge_suggestion` (`group_key`);--> statement-breakpoint
CREATE INDEX `ix_book_merge_suggestion_status_created_at` ON `book_merge_suggestion` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_book_merge_suggestion_book_book_id` ON `book_merge_suggestion_book` (`book_id`);