-- Preserve stable identities and assignment IDs while replacing duplicated names with foreign keys.
DROP TRIGGER series_tags_identity_insert;
--> statement-breakpoint
DROP TRIGGER series_tags_identity_rename;
--> statement-breakpoint
DROP TRIGGER series_tags_identity_delete;
--> statement-breakpoint
DROP TRIGGER anime_tags_identity_insert;
--> statement-breakpoint
DROP TRIGGER anime_tags_identity_rename;
--> statement-breakpoint
DROP TRIGGER anime_tags_identity_delete;
--> statement-breakpoint
DROP TRIGGER movies_tags_identity_insert;
--> statement-breakpoint
DROP TRIGGER movies_tags_identity_rename;
--> statement-breakpoint
DROP TRIGGER movies_tags_identity_delete;
--> statement-breakpoint
DROP TRIGGER games_tags_identity_insert;
--> statement-breakpoint
DROP TRIGGER games_tags_identity_rename;
--> statement-breakpoint
DROP TRIGGER games_tags_identity_delete;
--> statement-breakpoint
DROP TRIGGER books_tags_identity_insert;
--> statement-breakpoint
DROP TRIGGER books_tags_identity_rename;
--> statement-breakpoint
DROP TRIGGER books_tags_identity_delete;
--> statement-breakpoint
DROP TRIGGER manga_tags_identity_insert;
--> statement-breakpoint
DROP TRIGGER manga_tags_identity_rename;
--> statement-breakpoint
DROP TRIGGER manga_tags_identity_delete;
--> statement-breakpoint
DROP TRIGGER media_tags_dynamic_rules_delete;
--> statement-breakpoint
CREATE TABLE __new_series_tags (
    id integer PRIMARY KEY NOT NULL,
    user_id integer NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    media_id integer REFERENCES series(id),
    tag_id integer NOT NULL REFERENCES media_tags(id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO __new_series_tags (id, user_id, media_id, tag_id)
SELECT assignment.id, assignment.user_id, assignment.media_id,
    (SELECT tag.id FROM media_tags AS tag WHERE tag.user_id = assignment.user_id
        AND tag.media_type = 'series' AND tag.name = assignment.name)
FROM series_tags AS assignment;
--> statement-breakpoint
DROP TABLE series_tags;
--> statement-breakpoint
ALTER TABLE __new_series_tags RENAME TO series_tags;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_series_tags_user_media_tag ON series_tags (user_id, media_id, tag_id) WHERE media_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_series_tags_user_placeholder_tag ON series_tags (user_id, tag_id) WHERE media_id IS NULL;
--> statement-breakpoint
CREATE INDEX ix_series_tags_user_tag_media ON series_tags (user_id, tag_id, media_id);
--> statement-breakpoint
CREATE TABLE __new_anime_tags (
    id integer PRIMARY KEY NOT NULL,
    user_id integer NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    media_id integer REFERENCES anime(id),
    tag_id integer NOT NULL REFERENCES media_tags(id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO __new_anime_tags (id, user_id, media_id, tag_id)
SELECT assignment.id, assignment.user_id, assignment.media_id,
    (SELECT tag.id FROM media_tags AS tag WHERE tag.user_id = assignment.user_id
        AND tag.media_type = 'anime' AND tag.name = assignment.name)
FROM anime_tags AS assignment;
--> statement-breakpoint
DROP TABLE anime_tags;
--> statement-breakpoint
ALTER TABLE __new_anime_tags RENAME TO anime_tags;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_anime_tags_user_media_tag ON anime_tags (user_id, media_id, tag_id) WHERE media_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_anime_tags_user_placeholder_tag ON anime_tags (user_id, tag_id) WHERE media_id IS NULL;
--> statement-breakpoint
CREATE INDEX ix_anime_tags_user_tag_media ON anime_tags (user_id, tag_id, media_id);
--> statement-breakpoint
CREATE TABLE __new_movies_tags (
    id integer PRIMARY KEY NOT NULL,
    user_id integer NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    media_id integer REFERENCES movies(id),
    tag_id integer NOT NULL REFERENCES media_tags(id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO __new_movies_tags (id, user_id, media_id, tag_id)
SELECT assignment.id, assignment.user_id, assignment.media_id,
    (SELECT tag.id FROM media_tags AS tag WHERE tag.user_id = assignment.user_id
        AND tag.media_type = 'movies' AND tag.name = assignment.name)
FROM movies_tags AS assignment;
--> statement-breakpoint
DROP TABLE movies_tags;
--> statement-breakpoint
ALTER TABLE __new_movies_tags RENAME TO movies_tags;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_movies_tags_user_media_tag ON movies_tags (user_id, media_id, tag_id) WHERE media_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_movies_tags_user_placeholder_tag ON movies_tags (user_id, tag_id) WHERE media_id IS NULL;
--> statement-breakpoint
CREATE INDEX ix_movies_tags_user_tag_media ON movies_tags (user_id, tag_id, media_id);
--> statement-breakpoint
CREATE TABLE __new_games_tags (
    id integer PRIMARY KEY NOT NULL,
    user_id integer NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    media_id integer REFERENCES games(id),
    tag_id integer NOT NULL REFERENCES media_tags(id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO __new_games_tags (id, user_id, media_id, tag_id)
SELECT assignment.id, assignment.user_id, assignment.media_id,
    (SELECT tag.id FROM media_tags AS tag WHERE tag.user_id = assignment.user_id
        AND tag.media_type = 'games' AND tag.name = assignment.name)
FROM games_tags AS assignment;
--> statement-breakpoint
DROP TABLE games_tags;
--> statement-breakpoint
ALTER TABLE __new_games_tags RENAME TO games_tags;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_games_tags_user_media_tag ON games_tags (user_id, media_id, tag_id) WHERE media_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_games_tags_user_placeholder_tag ON games_tags (user_id, tag_id) WHERE media_id IS NULL;
--> statement-breakpoint
CREATE INDEX ix_games_tags_user_tag_media ON games_tags (user_id, tag_id, media_id);
--> statement-breakpoint
CREATE TABLE __new_books_tags (
    id integer PRIMARY KEY NOT NULL,
    user_id integer NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    media_id integer REFERENCES books(id),
    tag_id integer NOT NULL REFERENCES media_tags(id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO __new_books_tags (id, user_id, media_id, tag_id)
SELECT assignment.id, assignment.user_id, assignment.media_id,
    (SELECT tag.id FROM media_tags AS tag WHERE tag.user_id = assignment.user_id
        AND tag.media_type = 'books' AND tag.name = assignment.name)
FROM books_tags AS assignment;
--> statement-breakpoint
DROP TABLE books_tags;
--> statement-breakpoint
ALTER TABLE __new_books_tags RENAME TO books_tags;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_books_tags_user_media_tag ON books_tags (user_id, media_id, tag_id) WHERE media_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_books_tags_user_placeholder_tag ON books_tags (user_id, tag_id) WHERE media_id IS NULL;
--> statement-breakpoint
CREATE INDEX ix_books_tags_user_tag_media ON books_tags (user_id, tag_id, media_id);
--> statement-breakpoint
CREATE TABLE __new_manga_tags (
    id integer PRIMARY KEY NOT NULL,
    user_id integer NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    media_id integer REFERENCES manga(id),
    tag_id integer NOT NULL REFERENCES media_tags(id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO __new_manga_tags (id, user_id, media_id, tag_id)
SELECT assignment.id, assignment.user_id, assignment.media_id,
    (SELECT tag.id FROM media_tags AS tag WHERE tag.user_id = assignment.user_id
        AND tag.media_type = 'manga' AND tag.name = assignment.name)
FROM manga_tags AS assignment;
--> statement-breakpoint
DROP TABLE manga_tags;
--> statement-breakpoint
ALTER TABLE __new_manga_tags RENAME TO manga_tags;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_manga_tags_user_media_tag ON manga_tags (user_id, media_id, tag_id) WHERE media_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ux_manga_tags_user_placeholder_tag ON manga_tags (user_id, tag_id) WHERE media_id IS NULL;
--> statement-breakpoint
CREATE INDEX ix_manga_tags_user_tag_media ON manga_tags (user_id, tag_id, media_id);
