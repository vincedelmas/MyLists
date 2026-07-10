DELETE FROM `anime_list`
WHERE `id` IN (
	SELECT `id`
	FROM (
		SELECT
			`id`,
			row_number() OVER (
				PARTITION BY `user_id`, `media_id`
				ORDER BY `last_updated` DESC NULLS LAST, `added_at` DESC NULLS LAST, `id` DESC
			) AS `duplicate_rank`
		FROM `anime_list`
	)
	WHERE `duplicate_rank` > 1
);--> statement-breakpoint
DELETE FROM `books_list`
WHERE `id` IN (
	SELECT `id`
	FROM (
		SELECT
			`id`,
			row_number() OVER (
				PARTITION BY `user_id`, `media_id`
				ORDER BY `last_updated` DESC NULLS LAST, `added_at` DESC NULLS LAST, `id` DESC
			) AS `duplicate_rank`
		FROM `books_list`
	)
	WHERE `duplicate_rank` > 1
);--> statement-breakpoint
DELETE FROM `games_list`
WHERE `id` IN (
	SELECT `id`
	FROM (
		SELECT
			`id`,
			row_number() OVER (
				PARTITION BY `user_id`, `media_id`
				ORDER BY `last_updated` DESC NULLS LAST, `added_at` DESC NULLS LAST, `id` DESC
			) AS `duplicate_rank`
		FROM `games_list`
	)
	WHERE `duplicate_rank` > 1
);--> statement-breakpoint
DELETE FROM `manga_list`
WHERE `id` IN (
	SELECT `id`
	FROM (
		SELECT
			`id`,
			row_number() OVER (
				PARTITION BY `user_id`, `media_id`
				ORDER BY `last_updated` DESC NULLS LAST, `added_at` DESC NULLS LAST, `id` DESC
			) AS `duplicate_rank`
		FROM `manga_list`
	)
	WHERE `duplicate_rank` > 1
);--> statement-breakpoint
DELETE FROM `movies_list`
WHERE `id` IN (
	SELECT `id`
	FROM (
		SELECT
			`id`,
			row_number() OVER (
				PARTITION BY `user_id`, `media_id`
				ORDER BY `last_updated` DESC NULLS LAST, `added_at` DESC NULLS LAST, `id` DESC
			) AS `duplicate_rank`
		FROM `movies_list`
	)
	WHERE `duplicate_rank` > 1
);--> statement-breakpoint
DELETE FROM `series_list`
WHERE `id` IN (
	SELECT `id`
	FROM (
		SELECT
			`id`,
			row_number() OVER (
				PARTITION BY `user_id`, `media_id`
				ORDER BY `last_updated` DESC NULLS LAST, `added_at` DESC NULLS LAST, `id` DESC
			) AS `duplicate_rank`
		FROM `series_list`
	)
	WHERE `duplicate_rank` > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_list_user_media` ON `anime_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_list_user_media` ON `books_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_list_user_media` ON `games_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_list_user_media` ON `manga_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_list_user_media` ON `movies_list` (`user_id`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_list_user_media` ON `series_list` (`user_id`,`media_id`);
