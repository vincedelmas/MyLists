CREATE TABLE `__new_series_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_series_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `series_tags` WHERE "media_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `series_tags`;--> statement-breakpoint
ALTER TABLE `__new_series_tags` RENAME TO `series_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_series_tags_user_media_tag` ON `series_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_series_tags_user_tag_media` ON `series_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_anime_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_anime_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `anime_tags` WHERE "media_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `anime_tags`;--> statement-breakpoint
ALTER TABLE `__new_anime_tags` RENAME TO `anime_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_anime_tags_user_media_tag` ON `anime_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_anime_tags_user_tag_media` ON `anime_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_movies_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_movies_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `movies_tags` WHERE "media_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `movies_tags`;--> statement-breakpoint
ALTER TABLE `__new_movies_tags` RENAME TO `movies_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_movies_tags_user_media_tag` ON `movies_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_movies_tags_user_tag_media` ON `movies_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_games_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_games_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `games_tags` WHERE "media_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `games_tags`;--> statement-breakpoint
ALTER TABLE `__new_games_tags` RENAME TO `games_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_games_tags_user_media_tag` ON `games_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_games_tags_user_tag_media` ON `games_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_books_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_books_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `books_tags` WHERE "media_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `books_tags`;--> statement-breakpoint
ALTER TABLE `__new_books_tags` RENAME TO `books_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_books_tags_user_media_tag` ON `books_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_books_tags_user_tag_media` ON `books_tags` (`user_id`,`tag_id`,`media_id`);--> statement-breakpoint
CREATE TABLE `__new_manga_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `manga`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `media_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_manga_tags`("id", "user_id", "media_id", "tag_id") SELECT "id", "user_id", "media_id", "tag_id" FROM `manga_tags` WHERE "media_id" IS NOT NULL;--> statement-breakpoint
DROP TABLE `manga_tags`;--> statement-breakpoint
ALTER TABLE `__new_manga_tags` RENAME TO `manga_tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_manga_tags_user_media_tag` ON `manga_tags` (`user_id`,`media_id`,`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_manga_tags_user_tag_media` ON `manga_tags` (`user_id`,`tag_id`,`media_id`);
