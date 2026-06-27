CREATE INDEX `ix_anime_list_user_media_rated` ON `anime_list` (`user_id`,`media_id`) WHERE "anime_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_anime_list_media_user_rated` ON `anime_list` (`media_id`,`user_id`) WHERE "anime_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_books_list_user_media_rated` ON `books_list` (`user_id`,`media_id`) WHERE "books_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_books_list_media_user_rated` ON `books_list` (`media_id`,`user_id`) WHERE "books_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_games_list_user_media_rated` ON `games_list` (`user_id`,`media_id`) WHERE "games_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_games_list_media_user_rated` ON `games_list` (`media_id`,`user_id`) WHERE "games_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_manga_list_user_media_rated` ON `manga_list` (`user_id`,`media_id`) WHERE "manga_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_manga_list_media_user_rated` ON `manga_list` (`media_id`,`user_id`) WHERE "manga_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_movies_list_user_media_rated` ON `movies_list` (`user_id`,`media_id`) WHERE "movies_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_movies_list_media_user_rated` ON `movies_list` (`media_id`,`user_id`) WHERE "movies_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_series_list_user_media_rated` ON `series_list` (`user_id`,`media_id`) WHERE "series_list"."rating" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_series_list_media_user_rated` ON `series_list` (`media_id`,`user_id`) WHERE "series_list"."rating" IS NOT NULL;
