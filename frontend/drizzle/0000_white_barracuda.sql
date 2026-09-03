CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`task_no` text NOT NULL,
	`waybill` text NOT NULL,
	`order_no` text,
	`scene` text DEFAULT 'warehouse' NOT NULL,
	`damage_types` text NOT NULL,
	`confidence` integer NOT NULL,
	`ai_level` integer NOT NULL,
	`review_level` integer,
	`review_note` text,
	`reviewer` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inspections_task_no_unique` ON `inspections` (`task_no`);--> statement-breakpoint
CREATE INDEX `idx_inspections_status` ON `inspections` (`status`);