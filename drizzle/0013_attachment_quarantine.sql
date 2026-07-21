ALTER TABLE `request_attachments` ADD `scan_attempts` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `request_attachments` ADD `last_scan_error` text;
--> statement-breakpoint
ALTER TABLE `request_attachments` ADD `scanned_at` integer;
--> statement-breakpoint
CREATE INDEX `request_attachments_scan_queue_idx` ON `request_attachments` (`validation_status`,`scan_attempts`,`created_at`);
