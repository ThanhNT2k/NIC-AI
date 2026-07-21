CREATE TABLE `request_attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL,
  `uploaded_by` text NOT NULL,
  `object_key` text NOT NULL,
  `original_name` text NOT NULL,
  `content_type` text NOT NULL,
  `size_bytes` integer NOT NULL CHECK (`size_bytes` BETWEEN 1 AND 8388608),
  `sha256` text NOT NULL,
  `validation_status` text DEFAULT 'validated' NOT NULL CHECK (`validation_status` IN ('validated','rejected','quarantined')),
  `created_at` integer NOT NULL,
  FOREIGN KEY (`request_id`) REFERENCES `service_requests`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `request_attachments_object_key_unique` ON `request_attachments` (`object_key`);
--> statement-breakpoint
CREATE INDEX `request_attachments_request_time_idx` ON `request_attachments` (`request_id`,`created_at`);
