CREATE TABLE `service_providers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `service_types` text NOT NULL,
  `contact_name` text NOT NULL,
  `contact_phone` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','inactive'))
);
--> statement-breakpoint
CREATE TABLE `visitor_registrations` (
  `id` text PRIMARY KEY NOT NULL,
  `requester_id` text NOT NULL,
  `organization` text NOT NULL,
  `visitor_name` text NOT NULL,
  `visitor_phone` text NOT NULL,
  `host_name` text NOT NULL,
  `visit_at` integer NOT NULL,
  `purpose` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','approved','checked_in','checked_out','cancelled')),
  `badge_code` text NOT NULL UNIQUE,
  `checked_in_at` integer,
  `checked_out_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `visitor_visit_status_idx` ON `visitor_registrations` (`visit_at`,`status`);
--> statement-breakpoint
CREATE TABLE `event_service_orders` (
  `id` text PRIMARY KEY NOT NULL,
  `requester_id` text NOT NULL,
  `organization` text NOT NULL,
  `event_name` text NOT NULL,
  `event_at` integer NOT NULL,
  `attendee_count` integer NOT NULL CHECK (`attendee_count` > 0),
  `catering_package` text NOT NULL CHECK (`catering_package` IN ('none','tea_break_standard','tea_break_premium')),
  `servings` integer NOT NULL CHECK (`servings` >= 0),
  `logistics_notes` text DEFAULT '' NOT NULL,
  `provider_id` text,
  `status` text DEFAULT 'requested' NOT NULL CHECK (`status` IN ('requested','coordinating','confirmed','completed','cancelled')),
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`)
);
--> statement-breakpoint
CREATE INDEX `event_services_event_status_idx` ON `event_service_orders` (`event_at`,`status`);
--> statement-breakpoint
ALTER TABLE `maintenance_work_orders` ADD `provider_id` text REFERENCES `service_providers`(`id`);
--> statement-breakpoint
INSERT INTO `service_providers` (`id`,`name`,`service_types`,`contact_name`,`contact_phone`,`status`) VALUES
  ('provider-building-mvp','NIC Building Services','maintenance,repair','Nguyễn Văn Minh','024-0000-1001','active'),
  ('provider-catering-mvp','NIC Event Catering','catering,tea_break','Trần Thu Hà','024-0000-1002','active');
