-- Unify media statuses without changing progress, dates, or user-authored text.
CREATE TEMP TABLE media_status_names (old_name TEXT PRIMARY KEY, new_name TEXT NOT NULL);
--> statement-breakpoint
INSERT INTO media_status_names VALUES
    ('Plan to Watch', 'Planned'), ('Plan to Play', 'Planned'), ('Plan to Read', 'Planned'),
    ('Watching', 'In Progress'), ('Reading', 'In Progress'), ('Playing', 'In Progress');
--> statement-breakpoint
UPDATE movies_list
SET status = (SELECT new_name FROM media_status_names WHERE old_name = status)
WHERE status IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE series_list
SET status = (SELECT new_name FROM media_status_names WHERE old_name = status)
WHERE status IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE anime_list
SET status = (SELECT new_name FROM media_status_names WHERE old_name = status)
WHERE status IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE books_list
SET status = (SELECT new_name FROM media_status_names WHERE old_name = status)
WHERE status IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE manga_list
SET status = (SELECT new_name FROM media_status_names WHERE old_name = status)
WHERE status IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE games_list
SET status = (SELECT new_name FROM media_status_names WHERE old_name = status)
WHERE status IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE user_media_settings
SET status_counts = (
    SELECT json_group_object(status_name, total) FROM (
        SELECT COALESCE(names.new_name, counts.key) AS status_name, SUM(counts.value) AS total
        FROM json_each(user_media_settings.status_counts) AS counts
        LEFT JOIN media_status_names AS names ON names.old_name = counts.key
        GROUP BY COALESCE(names.new_name, counts.key)
    )
)
WHERE EXISTS (SELECT 1 FROM json_each(user_media_settings.status_counts) WHERE key IN (SELECT old_name FROM media_status_names));
--> statement-breakpoint
UPDATE user_media_stats_history
SET status_counts = (
    SELECT json_group_object(status_name, total) FROM (
        SELECT COALESCE(names.new_name, counts.key) AS status_name, SUM(counts.value) AS total
        FROM json_each(user_media_stats_history.status_counts) AS counts
        LEFT JOIN media_status_names AS names ON names.old_name = counts.key
        GROUP BY COALESCE(names.new_name, counts.key)
    )
)
WHERE EXISTS (SELECT 1 FROM json_each(user_media_stats_history.status_counts) WHERE key IN (SELECT old_name FROM media_status_names));
--> statement-breakpoint
UPDATE user_media_update
SET payload = json_set(payload, '$.old_value', (SELECT new_name FROM media_status_names WHERE old_name = json_extract(payload, '$.old_value')))
WHERE update_type = 'status' AND json_extract(payload, '$.old_value') IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE user_media_update
SET payload = json_set(payload, '$.new_value', (SELECT new_name FROM media_status_names WHERE old_name = json_extract(payload, '$.new_value')))
WHERE update_type = 'status' AND json_extract(payload, '$.new_value') IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE import_items
SET payload_json = json_set(payload_json, '$.status', (SELECT new_name FROM media_status_names WHERE old_name = json_extract(payload_json, '$.status')))
WHERE json_extract(payload_json, '$.status') IN (SELECT old_name FROM media_status_names);
--> statement-breakpoint
UPDATE smart_views
SET spec = json_set(spec, '$.filters.statuses', json((
    SELECT json_group_array(status_name) FROM (
        SELECT DISTINCT COALESCE(names.new_name, statuses.value) AS status_name
        FROM json_each(smart_views.spec, '$.filters.statuses') AS statuses
        LEFT JOIN media_status_names AS names ON names.old_name = statuses.value
    )
)))
WHERE json_type(spec, '$.filters.statuses') = 'array';
--> statement-breakpoint
DROP TABLE media_status_names;
