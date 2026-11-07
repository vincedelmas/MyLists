-- Each former status group now represents one status.
CREATE TEMP TABLE dynamic_list_status_names (group_name TEXT PRIMARY KEY, status_name TEXT NOT NULL);
--> statement-breakpoint
INSERT INTO dynamic_list_status_names VALUES
    ('planned', 'Planned'), ('in_progress', 'In Progress'), ('completed', 'Completed'),
    ('on_hold', 'On Hold'), ('dropped', 'Dropped');
--> statement-breakpoint
-- Preserve the intersection when a saved spec used both group and explicit statuses.
UPDATE smart_views
SET spec = json_remove(json_set(spec, '$.filters.statuses', json((
    SELECT json_group_array(status_name)
    FROM dynamic_list_status_names
    WHERE group_name = json_extract(smart_views.spec, '$.filters.statusGroup')
        AND (json_type(smart_views.spec, '$.filters.statuses') IS NULL
            OR status_name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.statuses')))
))), '$.filters.statusGroup')
WHERE json_extract(spec, '$.filters.statusGroup') IN (SELECT group_name FROM dynamic_list_status_names);
--> statement-breakpoint
DROP TABLE dynamic_list_status_names;
