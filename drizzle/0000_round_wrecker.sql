CREATE TABLE `service_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`service_type` text NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`confirmed_version` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`organization` text NOT NULL,
	`role` text DEFAULT 'tenant_member' NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer DEFAULT 210000 NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `service_drafts_owner_updated_idx` ON `service_drafts` (`owner_id`, `updated_at`);
--> statement-breakpoint
INSERT INTO `users` (`id`,`email`,`full_name`,`organization`,`role`,`password_hash`,`password_salt`,`password_iterations`,`failed_attempts`,`created_at`) VALUES ('demo-tenant-001','thanh@demo.nic.vn','Nguyễn Thanh','Innovate Vietnam','tenant_member','HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=','UZ9cM6ihl20HzLKw7olQqA==',210000,0,1784552400);
