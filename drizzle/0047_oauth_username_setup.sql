ALTER TABLE `user` ADD `username_configured` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `user` SET `username_configured` = true;
