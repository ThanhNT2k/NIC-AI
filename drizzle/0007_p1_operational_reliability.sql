CREATE TABLE `operation_templates` (`id` text PRIMARY KEY NOT NULL,`service_type` text NOT NULL,`name` text NOT NULL,`version` integer DEFAULT 1 NOT NULL,`status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','active','inactive')),`created_by` text NOT NULL,`created_at` integer NOT NULL,FOREIGN KEY (`created_by`) REFERENCES `users`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `operation_templates_active_service_unique` ON `operation_templates` (`service_type`) WHERE `status`='active';
--> statement-breakpoint
CREATE TABLE `operation_template_tasks` (`id` text PRIMARY KEY NOT NULL,`template_id` text NOT NULL,`sequence` integer NOT NULL,`title` text NOT NULL,`required` integer DEFAULT 1 NOT NULL,`estimated_minutes` integer DEFAULT 0 NOT NULL,`required_skill` text,`required_materials` text DEFAULT '[]' NOT NULL,FOREIGN KEY (`template_id`) REFERENCES `operation_templates`(`id`) ON DELETE CASCADE);
--> statement-breakpoint
CREATE UNIQUE INDEX `operation_template_task_sequence_unique` ON `operation_template_tasks` (`template_id`,`sequence`);
--> statement-breakpoint
CREATE TABLE `work_order_tasks` (`id` text PRIMARY KEY NOT NULL,`work_order_id` text NOT NULL,`template_task_id` text,`sequence` integer NOT NULL,`title` text NOT NULL,`required` integer DEFAULT 1 NOT NULL,`status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','in_progress','completed','skipped')),`completed_by` text,`completed_at` integer,`updated_at` integer NOT NULL,FOREIGN KEY (`work_order_id`) REFERENCES `maintenance_work_orders`(`id`) ON DELETE CASCADE,FOREIGN KEY (`template_task_id`) REFERENCES `operation_template_tasks`(`id`),FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `work_order_task_sequence_unique` ON `work_order_tasks` (`work_order_id`,`sequence`);
--> statement-breakpoint
CREATE TABLE `work_order_close_approvals` (`id` text PRIMARY KEY NOT NULL,`work_order_id` text NOT NULL,`requested_by` text NOT NULL,`requested_at` integer NOT NULL,`status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','approved','rejected')),`decided_by` text,`decided_at` integer,`note` text DEFAULT '' NOT NULL,FOREIGN KEY (`work_order_id`) REFERENCES `maintenance_work_orders`(`id`),FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`),FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `work_order_pending_close_unique` ON `work_order_close_approvals` (`work_order_id`) WHERE `status`='pending';
--> statement-breakpoint
CREATE TABLE `business_calendars` (`id` text PRIMARY KEY NOT NULL,`name` text NOT NULL,`timezone` text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,`working_windows` text NOT NULL,`status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','inactive')));
--> statement-breakpoint
CREATE TABLE `business_calendar_holidays` (`id` text PRIMARY KEY NOT NULL,`calendar_id` text NOT NULL,`holiday_date` text NOT NULL,`name` text NOT NULL,FOREIGN KEY (`calendar_id`) REFERENCES `business_calendars`(`id`) ON DELETE CASCADE);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_calendar_holiday_unique` ON `business_calendar_holidays` (`calendar_id`,`holiday_date`);
--> statement-breakpoint
CREATE TABLE `sla_instances` (`id` text PRIMARY KEY NOT NULL,`work_order_id` text NOT NULL UNIQUE,`calendar_id` text NOT NULL,`warning_at` integer NOT NULL,`due_at` integer NOT NULL,`status` text DEFAULT 'running' NOT NULL CHECK (`status` IN ('running','paused','met','failed')),`paused_at` integer,`paused_seconds` integer DEFAULT 0 NOT NULL,`pause_reason` text,`updated_at` integer NOT NULL,FOREIGN KEY (`work_order_id`) REFERENCES `maintenance_work_orders`(`id`),FOREIGN KEY (`calendar_id`) REFERENCES `business_calendars`(`id`));
--> statement-breakpoint
CREATE TABLE `sla_job_events` (`id` text PRIMARY KEY NOT NULL,`sla_instance_id` text NOT NULL,`event_type` text NOT NULL CHECK (`event_type` IN ('warning','failure','escalation')),`idempotency_key` text NOT NULL UNIQUE,`recipient_scope` text NOT NULL,`created_at` integer NOT NULL,FOREIGN KEY (`sla_instance_id`) REFERENCES `sla_instances`(`id`));
--> statement-breakpoint
CREATE TABLE `resource_profiles` (`id` text PRIMARY KEY NOT NULL,`user_id` text,`provider_id` text,`location` text NOT NULL,`timezone` text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,`working_windows` text NOT NULL,`status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','inactive')),FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`),CHECK ((`user_id` IS NOT NULL) <> (`provider_id` IS NOT NULL)));
--> statement-breakpoint
CREATE TABLE `resource_skills` (`id` text PRIMARY KEY NOT NULL,`resource_id` text NOT NULL,`skill_code` text NOT NULL,`certificate_code` text,`valid_until` integer,FOREIGN KEY (`resource_id`) REFERENCES `resource_profiles`(`id`) ON DELETE CASCADE);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_skill_unique` ON `resource_skills` (`resource_id`,`skill_code`);
--> statement-breakpoint
CREATE TABLE `resource_bookings` (`id` text PRIMARY KEY NOT NULL,`resource_id` text NOT NULL,`work_order_id` text NOT NULL,`starts_at` integer NOT NULL,`ends_at` integer NOT NULL CHECK (`ends_at`>`starts_at`),`status` text DEFAULT 'confirmed' NOT NULL CHECK (`status` IN ('confirmed','cancelled')),`created_at` integer NOT NULL,FOREIGN KEY (`resource_id`) REFERENCES `resource_profiles`(`id`),FOREIGN KEY (`work_order_id`) REFERENCES `maintenance_work_orders`(`id`));
--> statement-breakpoint
CREATE INDEX `resource_booking_window_idx` ON `resource_bookings` (`resource_id`,`starts_at`,`ends_at`,`status`);
--> statement-breakpoint
CREATE TRIGGER `resource_booking_no_overlap_insert` BEFORE INSERT ON `resource_bookings` WHEN NEW.`status`='confirmed' AND EXISTS (SELECT 1 FROM `resource_bookings` b WHERE b.`resource_id`=NEW.`resource_id` AND b.`status`='confirmed' AND b.`starts_at`<NEW.`ends_at` AND b.`ends_at`>NEW.`starts_at`) BEGIN SELECT RAISE(ABORT,'RESOURCE_BOOKING_OVERLAP'); END;
--> statement-breakpoint
CREATE TABLE `provider_memberships` (`id` text PRIMARY KEY NOT NULL,`provider_id` text NOT NULL,`user_id` text NOT NULL,`status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','inactive')),FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`),FOREIGN KEY (`user_id`) REFERENCES `users`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_membership_unique` ON `provider_memberships` (`provider_id`,`user_id`);
--> statement-breakpoint
CREATE TABLE `provider_assignments` (`id` text PRIMARY KEY NOT NULL,`work_order_id` text NOT NULL,`provider_id` text NOT NULL,`version` integer DEFAULT 1 NOT NULL,`status` text DEFAULT 'awaiting_provider' NOT NULL CHECK (`status` IN ('awaiting_provider','awaiting_nic','accepted','rejected','expired')),`response_deadline` integer NOT NULL,`promised_at` integer,`response_note` text DEFAULT '' NOT NULL,`responded_by` text,`responded_at` integer,`confirmed_by` text,`confirmed_at` integer,FOREIGN KEY (`work_order_id`) REFERENCES `maintenance_work_orders`(`id`),FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`),FOREIGN KEY (`responded_by`) REFERENCES `users`(`id`),FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`));
--> statement-breakpoint
CREATE TABLE `provider_assignment_responses` (`id` text PRIMARY KEY NOT NULL,`assignment_id` text NOT NULL,`version` integer NOT NULL,`response` text NOT NULL CHECK (`response` IN ('accept','reject','accept_with_change')),`promised_at` integer,`note` text DEFAULT '' NOT NULL,`actor_id` text NOT NULL,`created_at` integer NOT NULL,FOREIGN KEY (`assignment_id`) REFERENCES `provider_assignments`(`id`) ON DELETE CASCADE,FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_response_version_unique` ON `provider_assignment_responses` (`assignment_id`,`version`);
--> statement-breakpoint
CREATE TABLE `access_reviews` (`id` text PRIMARY KEY NOT NULL,`organization` text NOT NULL,`scope` text NOT NULL,`status` text DEFAULT 'open' NOT NULL CHECK (`status` IN ('open','completed','overdue')),`deadline` integer NOT NULL,`created_by` text NOT NULL,`created_at` integer NOT NULL,FOREIGN KEY (`created_by`) REFERENCES `users`(`id`));
--> statement-breakpoint
CREATE TABLE `access_review_items` (`id` text PRIMARY KEY NOT NULL,`review_id` text NOT NULL,`membership_id` text NOT NULL,`decision` text CHECK (`decision` IN ('retain','revoke')),`evidence` text DEFAULT '' NOT NULL,`reviewed_by` text,`reviewed_at` integer,FOREIGN KEY (`review_id`) REFERENCES `access_reviews`(`id`) ON DELETE CASCADE,FOREIGN KEY (`membership_id`) REFERENCES `organization_memberships`(`id`),FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`));
--> statement-breakpoint
CREATE TABLE `configuration_changes` (`id` text PRIMARY KEY NOT NULL,`entity_type` text NOT NULL CHECK (`entity_type` IN ('role','sla','master_data')),`entity_id` text NOT NULL,`payload` text NOT NULL,`reason` text NOT NULL,`maker_id` text NOT NULL,`status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','approved','rejected')),`checker_id` text,`decided_at` integer,`created_at` integer NOT NULL,FOREIGN KEY (`maker_id`) REFERENCES `users`(`id`),FOREIGN KEY (`checker_id`) REFERENCES `users`(`id`),CHECK (`checker_id` IS NULL OR `checker_id` <> `maker_id`));
--> statement-breakpoint
CREATE TABLE `notifications` (`id` text PRIMARY KEY NOT NULL,`recipient_id` text NOT NULL,`type` text NOT NULL,`entity_type` text NOT NULL,`entity_id` text NOT NULL,`dedupe_key` text NOT NULL UNIQUE,`title` text NOT NULL,`body` text NOT NULL,`status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','delivered','failed','read')),`attempts` integer DEFAULT 0 NOT NULL,`created_at` integer NOT NULL,`delivered_at` integer,FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`));
--> statement-breakpoint
INSERT INTO `business_calendars` (`id`,`name`,`timezone`,`working_windows`,`status`) VALUES ('calendar-nic-default','Lịch làm việc NIC','Asia/Ho_Chi_Minh','[{"weekday":1,"startsMinute":480,"endsMinute":1020},{"weekday":2,"startsMinute":480,"endsMinute":1020},{"weekday":3,"startsMinute":480,"endsMinute":1020},{"weekday":4,"startsMinute":480,"endsMinute":1020},{"weekday":5,"startsMinute":480,"endsMinute":1020}]','active');
--> statement-breakpoint
INSERT INTO `operation_templates` (`id`,`service_type`,`name`,`version`,`status`,`created_by`,`created_at`) VALUES ('template-support-v1','support','Quy trình xử lý Facility chuẩn',1,'active','demo-facility-001',1784617200);
--> statement-breakpoint
INSERT INTO `operation_template_tasks` (`id`,`template_id`,`sequence`,`title`,`required`,`estimated_minutes`,`required_skill`,`required_materials`) VALUES ('template-task-diagnose','template-support-v1',1,'Khảo sát và chẩn đoán',1,30,'facility_general','[]'),('template-task-repair','template-support-v1',2,'Thực hiện xử lý',1,90,'facility_general','[]'),('template-task-verify','template-support-v1',3,'Kiểm tra và ghi nhận kết quả',1,30,'facility_general','[]');
--> statement-breakpoint
INSERT INTO `resource_profiles` (`id`,`user_id`,`location`,`timezone`,`working_windows`,`status`) VALUES ('resource-demo-facility','demo-facility-001','NIC Hòa Lạc','Asia/Ho_Chi_Minh','[{"weekday":1,"startsMinute":480,"endsMinute":1020},{"weekday":2,"startsMinute":480,"endsMinute":1020},{"weekday":3,"startsMinute":480,"endsMinute":1020},{"weekday":4,"startsMinute":480,"endsMinute":1020},{"weekday":5,"startsMinute":480,"endsMinute":1020}]','active');
--> statement-breakpoint
INSERT INTO `resource_skills` (`id`,`resource_id`,`skill_code`,`certificate_code`) VALUES ('skill-demo-facility','resource-demo-facility','facility_general','NIC-FAC-001');
--> statement-breakpoint
INSERT INTO `users` (`id`,`email`,`full_name`,`organization`,`role`,`password_hash`,`password_salt`,`password_iterations`,`failed_attempts`,`created_at`) VALUES ('demo-system-admin-001','admin@demo.nic.vn','Quản trị NIC','NIC','system_admin','HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=','UZ9cM6ihl20HzLKw7olQqA==',210000,0,1784617200),('demo-provider-001','provider@demo.nic.vn','Nguyễn Minh Provider','NIC Building Services','customer_member','HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=','UZ9cM6ihl20HzLKw7olQqA==',210000,0,1784617200);
--> statement-breakpoint
INSERT INTO `organization_memberships` (`id`,`user_id`,`organization`,`role`,`status`,`created_at`) VALUES ('membership-system-admin','demo-system-admin-001','NIC','system_admin','active',1784617200),('membership-provider','demo-provider-001','NIC Building Services','customer_member','active',1784617200);
--> statement-breakpoint
INSERT INTO `provider_memberships` (`id`,`provider_id`,`user_id`,`status`) VALUES ('provider-membership-demo','provider-building-mvp','demo-provider-001','active');
