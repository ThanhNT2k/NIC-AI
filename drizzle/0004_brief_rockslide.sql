CREATE TABLE `spaces` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `location` text NOT NULL,
  `capacity` integer NOT NULL CHECK (`capacity` > 0),
  `equipment` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spaces_code_unique` ON `spaces` (`code`);
--> statement-breakpoint
CREATE TABLE `bookings` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text,
  `requester_id` text NOT NULL,
  `organization` text NOT NULL,
  `space_id` text NOT NULL,
  `title` text NOT NULL,
  `attendee_count` integer NOT NULL CHECK (`attendee_count` > 0),
  `starts_at` integer NOT NULL,
  `ends_at` integer NOT NULL CHECK (`ends_at` > `starts_at`),
  `status` text DEFAULT 'confirmed' NOT NULL CHECK (`status` IN ('confirmed','cancelled')),
  `notes` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`request_id`) REFERENCES `service_requests`(`id`),
  FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`)
);
--> statement-breakpoint
CREATE INDEX `bookings_space_window_idx` ON `bookings` (`space_id`,`starts_at`,`ends_at`,`status`);
--> statement-breakpoint
CREATE INDEX `bookings_requester_idx` ON `bookings` (`requester_id`,`starts_at`);
--> statement-breakpoint
CREATE TABLE `maintenance_work_orders` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL,
  `title` text NOT NULL,
  `location` text NOT NULL,
  `priority` text DEFAULT 'normal' NOT NULL CHECK (`priority` IN ('low','normal','high','critical')),
  `status` text DEFAULT 'open' NOT NULL CHECK (`status` IN ('open','scheduled','in_progress','completed','cancelled')),
  `assigned_to` text,
  `scheduled_at` integer,
  `resolution` text DEFAULT '' NOT NULL,
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`request_id`) REFERENCES `service_requests`(`id`),
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `work_orders_status_priority_idx` ON `maintenance_work_orders` (`status`,`priority`,`updated_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_active_request_unique` ON `maintenance_work_orders` (`request_id`) WHERE `status` <> 'cancelled';
--> statement-breakpoint
ALTER TABLE `service_requests` ADD `updated_at` integer;
--> statement-breakpoint
UPDATE `service_requests` SET `updated_at` = `created_at` WHERE `updated_at` IS NULL;
--> statement-breakpoint
INSERT INTO `spaces` (`id`,`code`,`name`,`location`,`capacity`,`equipment`,`status`) VALUES
  ('space-meeting-32','MR-3.2','Phòng họp 3.2','NIC Hòa Lạc · Tầng 3',12,'Họp trực tuyến · Bảng viết','active'),
  ('space-seminar-21','SR-2.1','Phòng hội thảo 2.1','NIC Hòa Lạc · Tầng 2',80,'Màn hình LED · Âm thanh','active'),
  ('space-innovation-hall','INNO-HALL','Innovation Hall','NIC Hòa Lạc · Tầng 1',250,'Sân khấu · Trưng bày · Âm thanh','active');
--> statement-breakpoint
INSERT INTO `users` (`id`,`email`,`full_name`,`organization`,`role`,`password_hash`,`password_salt`,`password_iterations`,`failed_attempts`,`created_at`) VALUES
  ('demo-service-desk-001','desk@demo.nic.vn','Lê Minh Service Desk','NIC','service_desk','HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=','UZ9cM6ihl20HzLKw7olQqA==',210000,0,1784552400),
  ('demo-facility-001','facility@demo.nic.vn','Trần Anh Facility','NIC','facility_manager','HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=','UZ9cM6ihl20HzLKw7olQqA==',210000,0,1784552400);
--> statement-breakpoint
INSERT INTO `organization_memberships` (`id`,`user_id`,`organization`,`department_id`,`role`,`status`,`created_at`) VALUES
  ('demo-membership-desk','demo-service-desk-001','NIC','nic-team-service-desk','service_desk','active',1784552400),
  ('demo-membership-facility','demo-facility-001','NIC','nic-team-facility','facility_manager','active',1784552400);
