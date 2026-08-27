PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TEMP TABLE `_better_auth_1_7_guard` (
	`valid` integer NOT NULL CHECK (`valid` = 1)
);--> statement-breakpoint
INSERT INTO `_better_auth_1_7_guard` (`valid`)
SELECT CASE
	WHEN EXISTS (
		SELECT 1
		FROM `account`
		WHERE (`provider_id` IS NULL AND (
			`access_token` IS NOT NULL OR
			`refresh_token` IS NOT NULL OR
			`id_token` IS NOT NULL OR
			`scope` IS NOT NULL OR
			`password` IS NOT NULL
		)) OR
		(`provider_id` IS NOT NULL AND `provider_id` NOT IN ('credential', 'github', 'google')) OR
		(`provider_id` IN ('github', 'google') AND `account_id` IS NULL)
	) OR EXISTS (
		SELECT 1
		FROM (
			SELECT
				CASE `provider_id`
					WHEN 'credential' THEN 'local:credential'
					WHEN 'github' THEN 'local:oauth:github'
					WHEN 'google' THEN 'https://accounts.google.com'
				END AS `migrated_issuer`,
				CASE `provider_id`
					WHEN 'credential' THEN CAST(`user_id` AS text)
					ELSE CAST(`account_id` AS text)
				END AS `migrated_account_id`
			FROM `account`
			WHERE `provider_id` IN ('credential', 'github', 'google')
			GROUP BY `migrated_issuer`, `migrated_account_id`
			HAVING COUNT(DISTINCT `user_id`) > 1
		)
	)
	THEN 0
	ELSE 1
END;--> statement-breakpoint
DROP TABLE `_better_auth_1_7_guard`;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` integer PRIMARY KEY NOT NULL,
	`issuer` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Omit legacy rows that have neither a provider nor authentication material.
-- When one user has duplicate copies of an identity, retain the most recently updated copy.
WITH `migrated_account` AS (
SELECT
	"id",
	CASE "provider_id"
		WHEN 'credential' THEN 'local:credential'
		WHEN 'github' THEN 'local:oauth:github'
		WHEN 'google' THEN 'https://accounts.google.com'
	END AS "issuer",
	CASE "provider_id"
		WHEN 'credential' THEN CAST("user_id" AS text)
		ELSE CAST("account_id" AS text)
	END AS "account_id",
	"provider_id",
	"user_id",
	"access_token",
	"refresh_token",
	"id_token",
	"access_token_expires_at",
	"refresh_token_expires_at",
	"scope",
	"password",
	"created_at",
	"updated_at",
	ROW_NUMBER() OVER (
		PARTITION BY
			CASE "provider_id"
				WHEN 'credential' THEN 'local:credential'
				WHEN 'github' THEN 'local:oauth:github'
				WHEN 'google' THEN 'https://accounts.google.com'
			END,
			CASE "provider_id"
				WHEN 'credential' THEN CAST("user_id" AS text)
				ELSE CAST("account_id" AS text)
			END
		ORDER BY "updated_at" DESC, "id" DESC
	) AS "identity_rank"
FROM `account`
WHERE `provider_id` IN ('credential', 'github', 'google')
)
INSERT INTO `__new_account`("id", "issuer", "account_id", "provider_id", "user_id", "access_token", "refresh_token", "id_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "password", "created_at", "updated_at")
SELECT
	"id",
	"issuer",
	"account_id",
	"provider_id",
	"user_id",
	"access_token",
	"refresh_token",
	"id_token",
	"access_token_expires_at",
	"refresh_token_expires_at",
	"scope",
	"password",
	"created_at",
	"updated_at"
FROM `migrated_account`
WHERE "identity_rank" = 1;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_account_id_unique` ON `account` (`issuer`,`account_id`);--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);
