-- invalid-legacy-tags-cleanup-start
-- Empty tag names were possible through the legacy API but cannot be represented
-- by the normalized library_tag invariant. The regular UI already rejects them.
DELETE FROM `series_tags` WHERE length(trim(`name`)) = 0;--> statement-breakpoint
DELETE FROM `anime_tags` WHERE length(trim(`name`)) = 0;--> statement-breakpoint
DELETE FROM `movies_tags` WHERE length(trim(`name`)) = 0;--> statement-breakpoint
DELETE FROM `books_tags` WHERE length(trim(`name`)) = 0;--> statement-breakpoint
DELETE FROM `games_tags` WHERE length(trim(`name`)) = 0;--> statement-breakpoint
DELETE FROM `manga_tags` WHERE length(trim(`name`)) = 0;
