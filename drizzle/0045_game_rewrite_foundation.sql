CREATE TABLE `game_company` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`name` text NOT NULL,
	`publisher` integer DEFAULT false NOT NULL,
	`developer` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_game_company_item_name` ON `game_company` (`catalog_item_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_game_company_name_item` ON `game_company` (`name`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `game_details` (
	`catalog_item_id` integer PRIMARY KEY NOT NULL,
	`game_engine` text,
	`game_modes` text,
	`player_perspective` text,
	`vote_average` real,
	`vote_count` real,
	`igdb_url` text,
	`hltb_main_hours` real,
	`hltb_main_extra_hours` real,
	`hltb_completionist_hours` real,
	`steam_app_id` text,
	`collection_external_id` integer,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "game_details_hltb_main_check" CHECK("game_details"."hltb_main_hours" IS NULL OR "game_details"."hltb_main_hours" >= 0),
	CONSTRAINT "game_details_hltb_extra_check" CHECK("game_details"."hltb_main_extra_hours" IS NULL OR "game_details"."hltb_main_extra_hours" >= 0),
	CONSTRAINT "game_details_hltb_completionist_check" CHECK("game_details"."hltb_completionist_hours" IS NULL OR "game_details"."hltb_completionist_hours" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_game_details_collection` ON `game_details` (`collection_external_id`,`catalog_item_id`);--> statement-breakpoint
CREATE INDEX `ix_game_details_engine` ON `game_details` (`game_engine`,`catalog_item_id`);--> statement-breakpoint
CREATE INDEX `ix_game_details_perspective` ON `game_details` (`player_perspective`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `game_platform` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`catalog_item_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_game_platform_item_name` ON `game_platform` (`catalog_item_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_game_platform_name_item` ON `game_platform` (`name`,`catalog_item_id`);--> statement-breakpoint
CREATE TABLE `game_progress` (
	`library_entry_id` integer PRIMARY KEY NOT NULL,
	`playtime_minutes` integer DEFAULT 0 NOT NULL,
	`platform` text,
	FOREIGN KEY (`library_entry_id`) REFERENCES `library_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "game_progress_playtime_check" CHECK("game_progress"."playtime_minutes" >= 0 AND "game_progress"."playtime_minutes" <= 1800000),
	CONSTRAINT "game_progress_platform_check" CHECK("game_progress"."platform" IS NULL OR "game_progress"."platform" IN ('PC', 'DOS', 'Iphone', 'Android', 'visionOS', 'Windows Phone', 'Playstation 5', 'Playstation 4', 'Playstation 3', 'Playstation 2', 'Playstation', 'PSP', 'PS Vita', 'Playstation VR', 'Playstation VR2', 'Xbox Series', 'Xbox One', 'Xbox 360', 'Xbox', 'Switch 2', 'Switch', 'Wii U', 'Wii', 'Gamecube', 'Nintendo 64', 'SNES', 'NES', 'Nintendo 3DS', 'Nintendo DS', 'GB Advance', 'GB Color', 'Game Boy', 'Game & Watch', 'Dreamcast', 'Sega Saturn', 'Sega Genesis', 'Sega Game Gear', 'Sega Master System', 'Neo Geo', 'Atari 2600', 'Atari 5200', 'Atari 7800', 'Atari Jaguar', 'Atari Lynx', 'Meta Quest', 'Oculus', 'Arcade', 'Retro Computer', 'Other Console', 'Other Handheld', 'Other Mobile', 'Other VR', 'Old Sega', 'Old Atari', 'Other'))
);--> statement-breakpoint

-- game-rewrite-backfill-start
INSERT OR IGNORE INTO `catalog_item` (
	`kind`, `primary_provider`, `primary_external_id`, `name`, `release_date`,
	`synopsis`, `image_cover`, `locked`, `added_at`, `last_provider_update`
)
SELECT
	'games', 'igdb', CAST(`api_id` AS text), `name`, `release_date`, `synopsis`,
	`image_cover`, COALESCE(`lock_status`, 0), `added_at`, `last_api_update`
FROM `games`;--> statement-breakpoint

INSERT OR IGNORE INTO `legacy_catalog_item_mapping` (`kind`, `legacy_media_id`, `catalog_item_id`)
SELECT 'games', legacy.`id`, item.`id`
FROM `games` legacy
JOIN `catalog_item` item
	ON item.`kind` = 'games'
	AND item.`primary_provider` = 'igdb'
	AND item.`primary_external_id` = CAST(legacy.`api_id` AS text);--> statement-breakpoint

INSERT OR IGNORE INTO `game_details` (
	`catalog_item_id`, `game_engine`, `game_modes`, `player_perspective`,
	`vote_average`, `vote_count`, `igdb_url`, `hltb_main_hours`,
	`hltb_main_extra_hours`, `hltb_completionist_hours`, `steam_app_id`,
	`collection_external_id`
)
SELECT
	mapping.`catalog_item_id`, legacy.`game_engine`, legacy.`game_modes`,
	legacy.`player_perspective`, legacy.`vote_average`, legacy.`vote_count`,
	legacy.`igdb_url`,
	CASE WHEN typeof(legacy.`hltb_main_time`) IN ('integer', 'real') AND legacy.`hltb_main_time` >= 0
		THEN legacy.`hltb_main_time` ELSE NULL END,
	CASE WHEN typeof(legacy.`hltb_main_and_extra_time`) IN ('integer', 'real') AND legacy.`hltb_main_and_extra_time` >= 0
		THEN legacy.`hltb_main_and_extra_time` ELSE NULL END,
	CASE WHEN typeof(legacy.`hltb_total_complete_time`) IN ('integer', 'real') AND legacy.`hltb_total_complete_time` >= 0
		THEN legacy.`hltb_total_complete_time` ELSE NULL END,
	legacy.`steam_api_id`, legacy.`collection_id`
FROM `games` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games' AND mapping.`legacy_media_id` = legacy.`id`;--> statement-breakpoint

INSERT OR IGNORE INTO `game_platform` (`catalog_item_id`, `name`)
SELECT mapping.`catalog_item_id`, platform.`name`
FROM `games_platforms` platform
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games' AND mapping.`legacy_media_id` = platform.`media_id`
WHERE length(trim(platform.`name`)) > 0;--> statement-breakpoint

INSERT OR IGNORE INTO `game_company` (`catalog_item_id`, `name`, `publisher`, `developer`)
SELECT mapping.`catalog_item_id`, company.`name`,
	MAX(COALESCE(company.`publisher`, 0)), MAX(COALESCE(company.`developer`, 0))
FROM `games_companies` company
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games' AND mapping.`legacy_media_id` = company.`media_id`
WHERE length(trim(company.`name`)) > 0
GROUP BY mapping.`catalog_item_id`, company.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `catalog_genre` (`name`)
SELECT `name` FROM `games_genre` WHERE length(trim(`name`)) > 0;--> statement-breakpoint
INSERT OR IGNORE INTO `catalog_item_genre` (`catalog_item_id`, `genre_id`)
SELECT mapping.`catalog_item_id`, genre.`id`
FROM `games_genre` legacy_genre
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games' AND mapping.`legacy_media_id` = legacy_genre.`media_id`
JOIN `catalog_genre` genre ON genre.`name` = legacy_genre.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_entry` (
	`user_id`, `catalog_item_id`, `status`, `favorite`, `comment`, `rating`,
	`custom_cover`, `added_at`, `updated_at`
)
SELECT
	legacy.`user_id`, mapping.`catalog_item_id`, legacy.`status`, COALESCE(legacy.`favorite`, 0),
	legacy.`comment`, legacy.`rating`, legacy.`custom_cover`, legacy.`added_at`, legacy.`last_updated`
FROM `games_list` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games' AND mapping.`legacy_media_id` = legacy.`media_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `game_progress` (`library_entry_id`, `playtime_minutes`, `platform`)
SELECT entry.`id`, legacy.`playtime`, legacy.`platform`
FROM `games_list` legacy
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games' AND mapping.`legacy_media_id` = legacy.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = legacy.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_tag` (`user_id`, `kind`, `name`)
SELECT `user_id`, 'games', `name`
FROM `games_tags`
WHERE length(trim(`name`)) > 0;--> statement-breakpoint
INSERT OR IGNORE INTO `library_entry_tag` (`library_entry_id`, `tag_id`)
SELECT entry.`id`, tag.`id`
FROM `games_tags` legacy_tag
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games' AND mapping.`legacy_media_id` = legacy_tag.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = legacy_tag.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`
JOIN `library_tag` tag
	ON tag.`user_id` = legacy_tag.`user_id` AND tag.`kind` = 'games' AND tag.`name` = legacy_tag.`name`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_change` (
	`legacy_update_id`, `library_entry_id`, `update_type`, `payload`, `occurred_at`
)
SELECT update_row.`id`, entry.`id`, update_row.`update_type`, update_row.`payload`, update_row.`timestamp`
FROM `user_media_update` update_row
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games'
	AND update_row.`media_type` = 'games'
	AND mapping.`legacy_media_id` = update_row.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = update_row.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;--> statement-breakpoint

INSERT OR IGNORE INTO `library_activity` (
	`legacy_activity_id`, `library_entry_id`, `units_gained`, `completed`, `redo`,
	`hidden`, `month_bucket`, `last_updated_at`
)
SELECT
	activity.`id`, entry.`id`, activity.`specific_gained`, activity.`is_completed`,
	activity.`is_redo`, activity.`hidden`, activity.`month_bucket`, activity.`last_update`
FROM `user_media_activity` activity
JOIN `legacy_catalog_item_mapping` mapping
	ON mapping.`kind` = 'games'
	AND activity.`media_type` = 'games'
	AND mapping.`legacy_media_id` = activity.`media_id`
JOIN `library_entry` entry
	ON entry.`user_id` = activity.`user_id` AND entry.`catalog_item_id` = mapping.`catalog_item_id`;
