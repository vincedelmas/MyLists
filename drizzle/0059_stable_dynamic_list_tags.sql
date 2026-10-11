CREATE TABLE `media_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_media_tags_user_type_name` ON `media_tags` (`user_id`,`media_type`,`name`);
--> statement-breakpoint
INSERT INTO media_tags (user_id, media_type, name)
SELECT DISTINCT user_id, 'series', name FROM series_tags;
--> statement-breakpoint
CREATE TRIGGER series_tags_identity_insert AFTER INSERT ON series_tags
BEGIN
    INSERT INTO media_tags (user_id, media_type, name) VALUES (NEW.user_id, 'series', NEW.name)
    ON CONFLICT (user_id, media_type, name) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER series_tags_identity_rename AFTER UPDATE OF name ON series_tags
WHEN OLD.name != NEW.name
BEGIN
    UPDATE media_tags SET name = NEW.name
    WHERE user_id = OLD.user_id AND media_type = 'series' AND name = OLD.name;
END;
--> statement-breakpoint
CREATE TRIGGER series_tags_identity_delete AFTER DELETE ON series_tags
BEGIN
    DELETE FROM media_tags
    WHERE user_id = OLD.user_id AND media_type = 'series' AND name = OLD.name
        AND NOT EXISTS (SELECT 1 FROM series_tags WHERE user_id = OLD.user_id AND name = OLD.name);
END;
--> statement-breakpoint
INSERT INTO media_tags (user_id, media_type, name)
SELECT DISTINCT user_id, 'anime', name FROM anime_tags;
--> statement-breakpoint
CREATE TRIGGER anime_tags_identity_insert AFTER INSERT ON anime_tags
BEGIN
    INSERT INTO media_tags (user_id, media_type, name) VALUES (NEW.user_id, 'anime', NEW.name)
    ON CONFLICT (user_id, media_type, name) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER anime_tags_identity_rename AFTER UPDATE OF name ON anime_tags
WHEN OLD.name != NEW.name
BEGIN
    UPDATE media_tags SET name = NEW.name
    WHERE user_id = OLD.user_id AND media_type = 'anime' AND name = OLD.name;
END;
--> statement-breakpoint
CREATE TRIGGER anime_tags_identity_delete AFTER DELETE ON anime_tags
BEGIN
    DELETE FROM media_tags
    WHERE user_id = OLD.user_id AND media_type = 'anime' AND name = OLD.name
        AND NOT EXISTS (SELECT 1 FROM anime_tags WHERE user_id = OLD.user_id AND name = OLD.name);
END;
--> statement-breakpoint
INSERT INTO media_tags (user_id, media_type, name)
SELECT DISTINCT user_id, 'movies', name FROM movies_tags;
--> statement-breakpoint
CREATE TRIGGER movies_tags_identity_insert AFTER INSERT ON movies_tags
BEGIN
    INSERT INTO media_tags (user_id, media_type, name) VALUES (NEW.user_id, 'movies', NEW.name)
    ON CONFLICT (user_id, media_type, name) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER movies_tags_identity_rename AFTER UPDATE OF name ON movies_tags
WHEN OLD.name != NEW.name
BEGIN
    UPDATE media_tags SET name = NEW.name
    WHERE user_id = OLD.user_id AND media_type = 'movies' AND name = OLD.name;
END;
--> statement-breakpoint
CREATE TRIGGER movies_tags_identity_delete AFTER DELETE ON movies_tags
BEGIN
    DELETE FROM media_tags
    WHERE user_id = OLD.user_id AND media_type = 'movies' AND name = OLD.name
        AND NOT EXISTS (SELECT 1 FROM movies_tags WHERE user_id = OLD.user_id AND name = OLD.name);
END;
--> statement-breakpoint
INSERT INTO media_tags (user_id, media_type, name)
SELECT DISTINCT user_id, 'games', name FROM games_tags;
--> statement-breakpoint
CREATE TRIGGER games_tags_identity_insert AFTER INSERT ON games_tags
BEGIN
    INSERT INTO media_tags (user_id, media_type, name) VALUES (NEW.user_id, 'games', NEW.name)
    ON CONFLICT (user_id, media_type, name) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER games_tags_identity_rename AFTER UPDATE OF name ON games_tags
WHEN OLD.name != NEW.name
BEGIN
    UPDATE media_tags SET name = NEW.name
    WHERE user_id = OLD.user_id AND media_type = 'games' AND name = OLD.name;
END;
--> statement-breakpoint
CREATE TRIGGER games_tags_identity_delete AFTER DELETE ON games_tags
BEGIN
    DELETE FROM media_tags
    WHERE user_id = OLD.user_id AND media_type = 'games' AND name = OLD.name
        AND NOT EXISTS (SELECT 1 FROM games_tags WHERE user_id = OLD.user_id AND name = OLD.name);
END;
--> statement-breakpoint
INSERT INTO media_tags (user_id, media_type, name)
SELECT DISTINCT user_id, 'books', name FROM books_tags;
--> statement-breakpoint
CREATE TRIGGER books_tags_identity_insert AFTER INSERT ON books_tags
BEGIN
    INSERT INTO media_tags (user_id, media_type, name) VALUES (NEW.user_id, 'books', NEW.name)
    ON CONFLICT (user_id, media_type, name) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER books_tags_identity_rename AFTER UPDATE OF name ON books_tags
WHEN OLD.name != NEW.name
BEGIN
    UPDATE media_tags SET name = NEW.name
    WHERE user_id = OLD.user_id AND media_type = 'books' AND name = OLD.name;
END;
--> statement-breakpoint
CREATE TRIGGER books_tags_identity_delete AFTER DELETE ON books_tags
BEGIN
    DELETE FROM media_tags
    WHERE user_id = OLD.user_id AND media_type = 'books' AND name = OLD.name
        AND NOT EXISTS (SELECT 1 FROM books_tags WHERE user_id = OLD.user_id AND name = OLD.name);
END;
--> statement-breakpoint
INSERT INTO media_tags (user_id, media_type, name)
SELECT DISTINCT user_id, 'manga', name FROM manga_tags;
--> statement-breakpoint
CREATE TRIGGER manga_tags_identity_insert AFTER INSERT ON manga_tags
BEGIN
    INSERT INTO media_tags (user_id, media_type, name) VALUES (NEW.user_id, 'manga', NEW.name)
    ON CONFLICT (user_id, media_type, name) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER manga_tags_identity_rename AFTER UPDATE OF name ON manga_tags
WHEN OLD.name != NEW.name
BEGIN
    UPDATE media_tags SET name = NEW.name
    WHERE user_id = OLD.user_id AND media_type = 'manga' AND name = OLD.name;
END;
--> statement-breakpoint
CREATE TRIGGER manga_tags_identity_delete AFTER DELETE ON manga_tags
BEGIN
    DELETE FROM media_tags
    WHERE user_id = OLD.user_id AND media_type = 'manga' AND name = OLD.name
        AND NOT EXISTS (SELECT 1 FROM manga_tags WHERE user_id = OLD.user_id AND name = OLD.name);
END;
--> statement-breakpoint
-- Preserve global and type-specific tag conditions as independent AND groups.
UPDATE smart_views SET spec = json_set(spec, '$.filters.mediaFilters.series', json_patch(
    json_remove(COALESCE(json_extract(spec, '$.filters.mediaFilters.series'), '{}'), '$.tags', '$.tagsMatch', '$.excludeTags'),
    json_object('tagRules', json((
        SELECT json_group_array(json(tag_rule)) FROM (
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'series'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'series'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.excludeTags'))))) AS tag_rule
            UNION ALL
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'series'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.series.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.mediaFilters.series.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'series'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.series.excludeTags'))))) AS tag_rule
        ) WHERE json_array_length(tag_rule, '$.tags') > 0 OR json_array_length(tag_rule, '$.excludeTags') > 0
    )))
)) WHERE json_extract(spec, '$.version') = 1 AND (
    json_array_length(spec, '$.filters.tags') > 0 OR json_array_length(spec, '$.filters.excludeTags') > 0
    OR json_type(spec, '$.filters.mediaFilters.series.tags') IS NOT NULL OR json_type(spec, '$.filters.mediaFilters.series.excludeTags') IS NOT NULL
);
--> statement-breakpoint
-- Preserve global and type-specific tag conditions as independent AND groups.
UPDATE smart_views SET spec = json_set(spec, '$.filters.mediaFilters.anime', json_patch(
    json_remove(COALESCE(json_extract(spec, '$.filters.mediaFilters.anime'), '{}'), '$.tags', '$.tagsMatch', '$.excludeTags'),
    json_object('tagRules', json((
        SELECT json_group_array(json(tag_rule)) FROM (
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'anime'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'anime'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.excludeTags'))))) AS tag_rule
            UNION ALL
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'anime'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.anime.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.mediaFilters.anime.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'anime'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.anime.excludeTags'))))) AS tag_rule
        ) WHERE json_array_length(tag_rule, '$.tags') > 0 OR json_array_length(tag_rule, '$.excludeTags') > 0
    )))
)) WHERE json_extract(spec, '$.version') = 1 AND (
    json_array_length(spec, '$.filters.tags') > 0 OR json_array_length(spec, '$.filters.excludeTags') > 0
    OR json_type(spec, '$.filters.mediaFilters.anime.tags') IS NOT NULL OR json_type(spec, '$.filters.mediaFilters.anime.excludeTags') IS NOT NULL
);
--> statement-breakpoint
-- Preserve global and type-specific tag conditions as independent AND groups.
UPDATE smart_views SET spec = json_set(spec, '$.filters.mediaFilters.movies', json_patch(
    json_remove(COALESCE(json_extract(spec, '$.filters.mediaFilters.movies'), '{}'), '$.tags', '$.tagsMatch', '$.excludeTags'),
    json_object('tagRules', json((
        SELECT json_group_array(json(tag_rule)) FROM (
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'movies'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'movies'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.excludeTags'))))) AS tag_rule
            UNION ALL
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'movies'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.movies.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.mediaFilters.movies.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'movies'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.movies.excludeTags'))))) AS tag_rule
        ) WHERE json_array_length(tag_rule, '$.tags') > 0 OR json_array_length(tag_rule, '$.excludeTags') > 0
    )))
)) WHERE json_extract(spec, '$.version') = 1 AND (
    json_array_length(spec, '$.filters.tags') > 0 OR json_array_length(spec, '$.filters.excludeTags') > 0
    OR json_type(spec, '$.filters.mediaFilters.movies.tags') IS NOT NULL OR json_type(spec, '$.filters.mediaFilters.movies.excludeTags') IS NOT NULL
);
--> statement-breakpoint
-- Preserve global and type-specific tag conditions as independent AND groups.
UPDATE smart_views SET spec = json_set(spec, '$.filters.mediaFilters.games', json_patch(
    json_remove(COALESCE(json_extract(spec, '$.filters.mediaFilters.games'), '{}'), '$.tags', '$.tagsMatch', '$.excludeTags'),
    json_object('tagRules', json((
        SELECT json_group_array(json(tag_rule)) FROM (
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'games'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'games'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.excludeTags'))))) AS tag_rule
            UNION ALL
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'games'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.games.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.mediaFilters.games.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'games'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.games.excludeTags'))))) AS tag_rule
        ) WHERE json_array_length(tag_rule, '$.tags') > 0 OR json_array_length(tag_rule, '$.excludeTags') > 0
    )))
)) WHERE json_extract(spec, '$.version') = 1 AND (
    json_array_length(spec, '$.filters.tags') > 0 OR json_array_length(spec, '$.filters.excludeTags') > 0
    OR json_type(spec, '$.filters.mediaFilters.games.tags') IS NOT NULL OR json_type(spec, '$.filters.mediaFilters.games.excludeTags') IS NOT NULL
);
--> statement-breakpoint
-- Preserve global and type-specific tag conditions as independent AND groups.
UPDATE smart_views SET spec = json_set(spec, '$.filters.mediaFilters.books', json_patch(
    json_remove(COALESCE(json_extract(spec, '$.filters.mediaFilters.books'), '{}'), '$.tags', '$.tagsMatch', '$.excludeTags'),
    json_object('tagRules', json((
        SELECT json_group_array(json(tag_rule)) FROM (
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'books'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'books'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.excludeTags'))))) AS tag_rule
            UNION ALL
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'books'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.books.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.mediaFilters.books.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'books'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.books.excludeTags'))))) AS tag_rule
        ) WHERE json_array_length(tag_rule, '$.tags') > 0 OR json_array_length(tag_rule, '$.excludeTags') > 0
    )))
)) WHERE json_extract(spec, '$.version') = 1 AND (
    json_array_length(spec, '$.filters.tags') > 0 OR json_array_length(spec, '$.filters.excludeTags') > 0
    OR json_type(spec, '$.filters.mediaFilters.books.tags') IS NOT NULL OR json_type(spec, '$.filters.mediaFilters.books.excludeTags') IS NOT NULL
);
--> statement-breakpoint
-- Preserve global and type-specific tag conditions as independent AND groups.
UPDATE smart_views SET spec = json_set(spec, '$.filters.mediaFilters.manga', json_patch(
    json_remove(COALESCE(json_extract(spec, '$.filters.mediaFilters.manga'), '{}'), '$.tags', '$.tagsMatch', '$.excludeTags'),
    json_object('tagRules', json((
        SELECT json_group_array(json(tag_rule)) FROM (
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'manga'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'manga'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.excludeTags'))))) AS tag_rule
            UNION ALL
            SELECT json_object('tags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'manga'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.manga.tags')))),
                'tagsMatch', COALESCE(json_extract(spec, '$.filters.mediaFilters.manga.tagsMatch'), 'any'),
                'excludeTags', json((SELECT json_group_array(id) FROM media_tags
                WHERE user_id = smart_views.user_id AND media_type = 'manga'
                    AND name IN (SELECT value FROM json_each(smart_views.spec, '$.filters.mediaFilters.manga.excludeTags'))))) AS tag_rule
        ) WHERE json_array_length(tag_rule, '$.tags') > 0 OR json_array_length(tag_rule, '$.excludeTags') > 0
    )))
)) WHERE json_extract(spec, '$.version') = 1 AND (
    json_array_length(spec, '$.filters.tags') > 0 OR json_array_length(spec, '$.filters.excludeTags') > 0
    OR json_type(spec, '$.filters.mediaFilters.manga.tags') IS NOT NULL OR json_type(spec, '$.filters.mediaFilters.manga.excludeTags') IS NOT NULL
);
--> statement-breakpoint
UPDATE smart_views SET spec = json_set(
    json_remove(spec, '$.filters.tags', '$.filters.tagsMatch', '$.filters.excludeTags'), '$.version', 2
) WHERE json_extract(spec, '$.version') = 1;
--> statement-breakpoint
-- Deleting the last assignment (or the empty tag) removes saved references as well.
CREATE TRIGGER media_tags_dynamic_rules_delete AFTER DELETE ON media_tags
BEGIN
    UPDATE smart_views SET spec = json_set(spec,
        '$.filters.mediaFilters.' || OLD.media_type || '.tagRules', json((
            SELECT json_group_array(json(tag_rule)) FROM (
                SELECT json_object(
                    'tags', json((SELECT json_group_array(value) FROM json_each(rule.value, '$.tags') WHERE value != OLD.id)),
                    'tagsMatch', COALESCE(json_extract(rule.value, '$.tagsMatch'), 'any'),
                    'excludeTags', json((SELECT json_group_array(value) FROM json_each(rule.value, '$.excludeTags') WHERE value != OLD.id))
                ) AS tag_rule
                FROM json_each(smart_views.spec, '$.filters.mediaFilters.' || OLD.media_type || '.tagRules') AS rule
            ) WHERE json_array_length(tag_rule, '$.tags') > 0 OR json_array_length(tag_rule, '$.excludeTags') > 0
        ))), updated_at = CURRENT_TIMESTAMP
    WHERE user_id = OLD.user_id AND EXISTS (
        SELECT 1 FROM json_each(spec, '$.filters.mediaFilters.' || OLD.media_type || '.tagRules') AS rule,
            json_each(rule.value, '$.tags') AS tag WHERE tag.value = OLD.id
        UNION ALL
        SELECT 1 FROM json_each(spec, '$.filters.mediaFilters.' || OLD.media_type || '.tagRules') AS rule,
            json_each(rule.value, '$.excludeTags') AS tag WHERE tag.value = OLD.id
    );
END;
