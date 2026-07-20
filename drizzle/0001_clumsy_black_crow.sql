CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`organization` text NOT NULL,
	`service_type` text NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `service_drafts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_requests_draft_id_unique` ON `service_requests` (`draft_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `service_requests_owner_idempotency_idx` ON `service_requests` (`owner_id`,`idempotency_key`);