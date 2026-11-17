-- Keep the existing rows and change the delete rules.
CREATE TABLE `__new_series_actors` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_series_actors`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `series_actors`;--> statement-breakpoint
DROP TABLE `series_actors`;--> statement-breakpoint
ALTER TABLE `__new_series_actors` RENAME TO `series_actors`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_actors_media_name` ON `series_actors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_series_actors_name_media` ON `series_actors` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_series_episodes_per_season` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`season` integer NOT NULL,
	`episodes` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_series_episodes_per_season`("id", "media_id", "season", "episodes") SELECT "id", "media_id", "season", "episodes" FROM `series_episodes_per_season`;--> statement-breakpoint
DROP TABLE `series_episodes_per_season`;--> statement-breakpoint
ALTER TABLE `__new_series_episodes_per_season` RENAME TO `series_episodes_per_season`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_episodes_per_season_media_season` ON `series_episodes_per_season` (`media_id`,`season`);--> statement-breakpoint
CREATE TABLE `__new_series_genre` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_series_genre`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `series_genre`;--> statement-breakpoint
DROP TABLE `series_genre`;--> statement-breakpoint
ALTER TABLE `__new_series_genre` RENAME TO `series_genre`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_genre_media_name` ON `series_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_series_genre_name_media` ON `series_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_series_network` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_series_network`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `series_network`;--> statement-breakpoint
DROP TABLE `series_network`;--> statement-breakpoint
ALTER TABLE `__new_series_network` RENAME TO `series_network`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_network_media_name` ON `series_network` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_series_network_name_media` ON `series_network` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_series_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_series_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `series_tags`;--> statement-breakpoint
DROP TABLE `series_tags`;--> statement-breakpoint
ALTER TABLE `__new_series_tags` RENAME TO `series_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_tags_user_media_tag` ON `series_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_series_tags_user_tag_media` ON `series_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_anime_actors` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_anime_actors`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `anime_actors`;--> statement-breakpoint
DROP TABLE `anime_actors`;--> statement-breakpoint
ALTER TABLE `__new_anime_actors` RENAME TO `anime_actors`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_actors_media_name` ON `anime_actors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_anime_actors_name_media` ON `anime_actors` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_anime_episodes_per_season` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`season` integer NOT NULL,
	`episodes` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_anime_episodes_per_season`("id", "media_id", "season", "episodes") SELECT "id", "media_id", "season", "episodes" FROM `anime_episodes_per_season`;--> statement-breakpoint
DROP TABLE `anime_episodes_per_season`;--> statement-breakpoint
ALTER TABLE `__new_anime_episodes_per_season` RENAME TO `anime_episodes_per_season`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_episodes_per_season_media_season` ON `anime_episodes_per_season` (`media_id`,`season`);--> statement-breakpoint
CREATE TABLE `__new_anime_genre` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_anime_genre`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `anime_genre`;--> statement-breakpoint
DROP TABLE `anime_genre`;--> statement-breakpoint
ALTER TABLE `__new_anime_genre` RENAME TO `anime_genre`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_genre_media_name` ON `anime_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_anime_genre_name_media` ON `anime_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_anime_network` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_anime_network`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `anime_network`;--> statement-breakpoint
DROP TABLE `anime_network`;--> statement-breakpoint
ALTER TABLE `__new_anime_network` RENAME TO `anime_network`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_network_media_name` ON `anime_network` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_anime_network_name_media` ON `anime_network` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_anime_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_anime_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `anime_tags`;--> statement-breakpoint
DROP TABLE `anime_tags`;--> statement-breakpoint
ALTER TABLE `__new_anime_tags` RENAME TO `anime_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_tags_user_media_tag` ON `anime_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_tags_user_tag_media` ON `anime_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_movies_actors` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_movies_actors`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `movies_actors`;--> statement-breakpoint
DROP TABLE `movies_actors`;--> statement-breakpoint
ALTER TABLE `__new_movies_actors` RENAME TO `movies_actors`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_actors_media_name` ON `movies_actors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_movies_actors_name_media` ON `movies_actors` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_movies_genre` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_movies_genre`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `movies_genre`;--> statement-breakpoint
DROP TABLE `movies_genre`;--> statement-breakpoint
ALTER TABLE `__new_movies_genre` RENAME TO `movies_genre`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_genre_media_name` ON `movies_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_movies_genre_name_media` ON `movies_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_movies_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_movies_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `movies_tags`;--> statement-breakpoint
DROP TABLE `movies_tags`;--> statement-breakpoint
ALTER TABLE `__new_movies_tags` RENAME TO `movies_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_tags_user_media_tag` ON `movies_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_movies_tags_user_tag_media` ON `movies_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_games_companies` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	`publisher` integer DEFAULT false NOT NULL,
	`developer` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_games_companies`("id", "media_id", "name", "publisher", "developer") SELECT "id", "media_id", "name", "publisher", "developer" FROM `games_companies`;--> statement-breakpoint
DROP TABLE `games_companies`;--> statement-breakpoint
ALTER TABLE `__new_games_companies` RENAME TO `games_companies`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_companies_media_name_roles` ON `games_companies` (`media_id`,`name`,`publisher`,`developer`);--> statement-breakpoint
CREATE INDEX `ix_games_companies_name_media` ON `games_companies` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_games_genre` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_games_genre`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `games_genre`;--> statement-breakpoint
DROP TABLE `games_genre`;--> statement-breakpoint
ALTER TABLE `__new_games_genre` RENAME TO `games_genre`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_genre_media_name` ON `games_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_games_genre_name_media` ON `games_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_games_platforms` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_games_platforms`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `games_platforms`;--> statement-breakpoint
DROP TABLE `games_platforms`;--> statement-breakpoint
ALTER TABLE `__new_games_platforms` RENAME TO `games_platforms`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_platforms_media_name` ON `games_platforms` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_games_platforms_name_media` ON `games_platforms` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_games_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_games_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `games_tags`;--> statement-breakpoint
DROP TABLE `games_tags`;--> statement-breakpoint
ALTER TABLE `__new_games_tags` RENAME TO `games_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_tags_user_media_tag` ON `games_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_games_tags_user_tag_media` ON `games_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_books_authors` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_books_authors`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `books_authors`;--> statement-breakpoint
DROP TABLE `books_authors`;--> statement-breakpoint
ALTER TABLE `__new_books_authors` RENAME TO `books_authors`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_authors_media_name` ON `books_authors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_books_authors_name_media` ON `books_authors` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_books_genre` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_books_genre`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `books_genre`;--> statement-breakpoint
DROP TABLE `books_genre`;--> statement-breakpoint
ALTER TABLE `__new_books_genre` RENAME TO `books_genre`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_genre_media_name` ON `books_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_books_genre_name_media` ON `books_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_books_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_books_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `books_tags`;--> statement-breakpoint
DROP TABLE `books_tags`;--> statement-breakpoint
ALTER TABLE `__new_books_tags` RENAME TO `books_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_tags_user_media_tag` ON `books_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_books_tags_user_tag_media` ON `books_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_manga_authors` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_manga_authors`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `manga_authors`;--> statement-breakpoint
DROP TABLE `manga_authors`;--> statement-breakpoint
ALTER TABLE `__new_manga_authors` RENAME TO `manga_authors`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_authors_media_name` ON `manga_authors` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_manga_authors_name_media` ON `manga_authors` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_manga_genre` (
	`id` integer PRIMARY KEY NOT NULL,
	`media_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_manga_genre`("id", "media_id", "name") SELECT "id", "media_id", "name" FROM `manga_genre`;--> statement-breakpoint
DROP TABLE `manga_genre`;--> statement-breakpoint
ALTER TABLE `__new_manga_genre` RENAME TO `manga_genre`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_genre_media_name` ON `manga_genre` (`media_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_manga_genre_name_media` ON `manga_genre` (`name`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_manga_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_manga_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `manga_tags`;--> statement-breakpoint
DROP TABLE `manga_tags`;--> statement-breakpoint
ALTER TABLE `__new_manga_tags` RENAME TO `manga_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_tags_user_media_tag` ON `manga_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_manga_tags_user_tag_media` ON `manga_tags` (`user_id`,`tag_id`,`media_id`);
