CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_user_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_auth_user_id_unique` ON `app_users` (`auth_user_id`);--> statement-breakpoint
CREATE INDEX `idx_app_users_auth_user_id` ON `app_users` (`auth_user_id`);--> statement-breakpoint
ALTER TABLE `inspections` ADD `owner_user_id` text;--> statement-breakpoint
ALTER TABLE `inspections` ADD `inference_ms` integer;