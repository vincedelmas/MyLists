-- Remove ratings copied to seasons the user has not reached, preserving recorded rewatches.
UPDATE `series_list_seasons` AS s SET rating = NULL
WHERE s.rating IS NOT NULL AND s.redo = 0
  AND EXISTS (
    SELECT 1 FROM `series_list` l
    WHERE l.id = s.list_id
      AND (s.season > l.current_season OR (s.season = l.current_season AND l.current_episode = 0))
  );
--> statement-breakpoint
UPDATE `anime_list_seasons` AS s SET rating = NULL
WHERE s.rating IS NOT NULL AND s.redo = 0
  AND EXISTS (
    SELECT 1 FROM `anime_list` l
    WHERE l.id = s.list_id
      AND (s.season > l.current_season OR (s.season = l.current_season AND l.current_episode = 0))
  );
--> statement-breakpoint
-- Ignore unrated and unavailable seasons, then match the application's Math.round(average * 10) / 10.
UPDATE `series_list` SET rating = (
    SELECT ROUND(AVG(s.rating) * 10) / 10.0
    FROM `series_list_seasons` s
    JOIN `series_episodes_per_season` e ON e.media_id = `series_list`.media_id AND e.season = s.season
    WHERE s.list_id = `series_list`.id
);
--> statement-breakpoint
UPDATE `anime_list` SET rating = (
    SELECT ROUND(AVG(s.rating) * 10) / 10.0
    FROM `anime_list_seasons` s
    JOIN `anime_episodes_per_season` e ON e.media_id = `anime_list`.media_id AND e.season = s.season
    WHERE s.list_id = `anime_list`.id
);
--> statement-breakpoint
UPDATE user_media_settings SET
    entries_rated = (SELECT COUNT(rating) FROM series_list WHERE user_id = user_media_settings.user_id),
    sum_entries_rated = COALESCE((SELECT ROUND(SUM(rating), 10) FROM series_list WHERE user_id = user_media_settings.user_id), 0),
    average_rating = (SELECT AVG(rating) FROM series_list WHERE user_id = user_media_settings.user_id)
WHERE media_type = 'series';
--> statement-breakpoint
UPDATE user_media_settings SET
    entries_rated = (SELECT COUNT(rating) FROM anime_list WHERE user_id = user_media_settings.user_id),
    sum_entries_rated = COALESCE((SELECT ROUND(SUM(rating), 10) FROM anime_list WHERE user_id = user_media_settings.user_id), 0),
    average_rating = (SELECT AVG(rating) FROM anime_list WHERE user_id = user_media_settings.user_id)
WHERE media_type = 'anime';
