CREATE TABLE `assets` (
  `id` text PRIMARY KEY NOT NULL,
  `organization` text NOT NULL,
  `parent_asset_id` text,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `location` text NOT NULL,
  `category` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','maintenance','retired')),
  `serial_number` text,
  `model` text,
  `provider_id` text,
  `warranty_start` integer,
  `warranty_end` integer,
  `owner_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`parent_asset_id`) REFERENCES `assets`(`id`),
  FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`),
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`),
  CHECK (`parent_asset_id` IS NULL OR `parent_asset_id` <> `id`),
  CHECK (`warranty_end` IS NULL OR `warranty_start` IS NULL OR `warranty_end` > `warranty_start`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_org_code_unique` ON `assets` (`organization`,`code`);
--> statement-breakpoint
CREATE INDEX `assets_parent_idx` ON `assets` (`parent_asset_id`);
--> statement-breakpoint
CREATE TABLE `maintenance_plans` (
  `id` text PRIMARY KEY NOT NULL,
  `asset_id` text NOT NULL,
  `name` text NOT NULL,
  `recurrence_days` integer NOT NULL CHECK (`recurrence_days` BETWEEN 1 AND 3650),
  `lead_time_days` integer DEFAULT 7 NOT NULL CHECK (`lead_time_days` BETWEEN 0 AND 365),
  `booking_window_days` integer DEFAULT 14 NOT NULL CHECK (`booking_window_days` BETWEEN 1 AND 365),
  `next_due_at` integer NOT NULL,
  `template_id` text,
  `status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','paused','inactive')),
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`),
  FOREIGN KEY (`template_id`) REFERENCES `operation_templates`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `maintenance_plans_due_idx` ON `maintenance_plans` (`status`,`next_due_at`);
--> statement-breakpoint
ALTER TABLE `maintenance_work_orders` ADD COLUMN `asset_id` text REFERENCES `assets`(`id`);
--> statement-breakpoint
ALTER TABLE `maintenance_work_orders` ADD COLUMN `maintenance_plan_id` text REFERENCES `maintenance_plans`(`id`);
--> statement-breakpoint
CREATE TABLE `maintenance_plan_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `plan_id` text NOT NULL,
  `due_at` integer NOT NULL,
  `work_order_id` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`plan_id`) REFERENCES `maintenance_plans`(`id`),
  FOREIGN KEY (`work_order_id`) REFERENCES `maintenance_work_orders`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maintenance_plan_run_due_unique` ON `maintenance_plan_runs` (`plan_id`,`due_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `maintenance_plan_run_key_unique` ON `maintenance_plan_runs` (`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `work_order_cost_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `work_order_id` text NOT NULL,
  `line_type` text NOT NULL CHECK (`line_type` IN ('labor','material','service')),
  `phase` text NOT NULL CHECK (`phase` IN ('estimate','actual')),
  `description` text NOT NULL,
  `quantity_milli` integer NOT NULL CHECK (`quantity_milli` > 0),
  `unit` text NOT NULL,
  `unit_price_minor` integer NOT NULL CHECK (`unit_price_minor` >= 0),
  `tax_bps` integer DEFAULT 0 NOT NULL CHECK (`tax_bps` BETWEEN 0 AND 10000),
  `discount_bps` integer DEFAULT 0 NOT NULL CHECK (`discount_bps` BETWEEN 0 AND 10000),
  `subtotal_minor` integer NOT NULL,
  `discount_minor` integer NOT NULL,
  `tax_minor` integer NOT NULL,
  `line_total_minor` integer NOT NULL,
  `currency` text DEFAULT 'VND' NOT NULL,
  `catalog_record_id` text,
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`work_order_id`) REFERENCES `maintenance_work_orders`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `work_order_cost_phase_idx` ON `work_order_cost_lines` (`work_order_id`,`phase`);
--> statement-breakpoint
CREATE TRIGGER `work_order_cost_snapshot_immutable` BEFORE UPDATE OF `quantity_milli`,`unit_price_minor`,`tax_bps`,`discount_bps`,`subtotal_minor`,`discount_minor`,`tax_minor`,`line_total_minor`,`currency`,`catalog_record_id` ON `work_order_cost_lines` BEGIN SELECT RAISE(ABORT,'COST_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE `event_templates` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `event_type` text NOT NULL,
  `scale` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `budget_threshold_minor` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','active','inactive')),
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_template_active_unique` ON `event_templates` (`event_type`,`scale`) WHERE `status`='active';
--> statement-breakpoint
CREATE TABLE `event_template_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `template_id` text NOT NULL,
  `sequence` integer NOT NULL,
  `title` text NOT NULL,
  `due_offset_days` integer DEFAULT 0 NOT NULL,
  `dependency_sequence` integer,
  `required` integer DEFAULT 1 NOT NULL,
  `default_assignee_role` text,
  FOREIGN KEY (`template_id`) REFERENCES `event_templates`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_template_task_sequence_unique` ON `event_template_tasks` (`template_id`,`sequence`);
--> statement-breakpoint
CREATE TABLE `event_template_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `template_id` text NOT NULL,
  `line_type` text NOT NULL CHECK (`line_type` IN ('menu','equipment','service')),
  `description` text NOT NULL,
  `quantity_milli` integer NOT NULL,
  `unit` text NOT NULL,
  `unit_price_minor` integer NOT NULL,
  FOREIGN KEY (`template_id`) REFERENCES `event_templates`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `event_service_orders` ADD COLUMN `template_id` text REFERENCES `event_templates`(`id`);
--> statement-breakpoint
ALTER TABLE `event_service_orders` ADD COLUMN `budget_estimate_minor` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_service_orders` ADD COLUMN `budget_actual_minor` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_service_orders` ADD COLUMN `budget_threshold_minor` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `event_service_orders` ADD COLUMN `budget_status` text DEFAULT 'not_required' NOT NULL CHECK (`budget_status` IN ('not_required','pending','approved','rejected'));
--> statement-breakpoint
CREATE TABLE `event_checklist_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `event_order_id` text NOT NULL,
  `source_template_task_id` text,
  `sequence` integer NOT NULL,
  `title` text NOT NULL,
  `due_at` integer NOT NULL,
  `depends_on_task_id` text,
  `required` integer DEFAULT 1 NOT NULL,
  `assignee_id` text,
  `status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','in_progress','completed','skipped')),
  `completed_by` text,
  `completed_at` integer,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`event_order_id`) REFERENCES `event_service_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`source_template_task_id`) REFERENCES `event_template_tasks`(`id`),
  FOREIGN KEY (`depends_on_task_id`) REFERENCES `event_checklist_tasks`(`id`),
  FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_checklist_sequence_unique` ON `event_checklist_tasks` (`event_order_id`,`sequence`);
--> statement-breakpoint
CREATE TABLE `event_budget_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `event_order_id` text NOT NULL,
  `source_template_line_id` text,
  `line_type` text NOT NULL,
  `description` text NOT NULL,
  `quantity_milli` integer NOT NULL,
  `unit` text NOT NULL,
  `unit_price_minor` integer NOT NULL,
  `line_total_minor` integer NOT NULL,
  `phase` text DEFAULT 'estimate' NOT NULL CHECK (`phase` IN ('estimate','actual')),
  `created_at` integer NOT NULL,
  FOREIGN KEY (`event_order_id`) REFERENCES `event_service_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`source_template_line_id`) REFERENCES `event_template_lines`(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_budget_approvals` (
  `id` text PRIMARY KEY NOT NULL,
  `event_order_id` text NOT NULL,
  `requested_by` text NOT NULL,
  `requested_at` integer NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','approved','rejected')),
  `decided_by` text,
  `decided_at` integer,
  `note` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`event_order_id`) REFERENCES `event_service_orders`(`id`),
  FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`),
  CHECK (`decided_by` IS NULL OR `decided_by` <> `requested_by`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_budget_pending_unique` ON `event_budget_approvals` (`event_order_id`) WHERE `status`='pending';
--> statement-breakpoint
CREATE TABLE `access_zones` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `controller_ref` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','inactive'))
);
--> statement-breakpoint
ALTER TABLE `visitor_registrations` ADD COLUMN `access_zone_id` text REFERENCES `access_zones`(`id`);
--> statement-breakpoint
CREATE TABLE `visitor_qr_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `visitor_id` text NOT NULL,
  `token_hash` text NOT NULL UNIQUE,
  `expires_at` integer NOT NULL,
  `redeemed_at` integer,
  `redeemed_by` text,
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`visitor_id`) REFERENCES `visitor_registrations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`redeemed_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TRIGGER `visitor_qr_no_replay` BEFORE UPDATE OF `redeemed_at` ON `visitor_qr_tokens` WHEN OLD.`redeemed_at` IS NOT NULL BEGIN SELECT RAISE(ABORT,'QR_ALREADY_REDEEMED'); END;
--> statement-breakpoint
CREATE TABLE `badge_print_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `visitor_id` text NOT NULL,
  `template_version` integer DEFAULT 1 NOT NULL,
  `printer_ref` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL CHECK (`status` IN ('queued','printed','failed')),
  `is_reprint` integer DEFAULT 0 NOT NULL,
  `reason` text NOT NULL,
  `render_payload` text NOT NULL,
  `actor_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `printed_at` integer,
  FOREIGN KEY (`visitor_id`) REFERENCES `visitor_registrations`(`id`),
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitor_access_grants` (
  `id` text PRIMARY KEY NOT NULL,
  `visitor_id` text NOT NULL,
  `access_zone_id` text NOT NULL,
  `valid_from` integer NOT NULL,
  `valid_until` integer NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','active','revoked','expired','offline_hold')),
  `controller_grant_ref` text,
  `created_at` integer NOT NULL,
  `revoked_at` integer,
  FOREIGN KEY (`visitor_id`) REFERENCES `visitor_registrations`(`id`),
  FOREIGN KEY (`access_zone_id`) REFERENCES `access_zones`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_active_grant_unique` ON `visitor_access_grants` (`visitor_id`,`access_zone_id`) WHERE `status` IN ('pending','active');
--> statement-breakpoint
CREATE TABLE `access_controller_events` (
  `id` text PRIMARY KEY NOT NULL,
  `visitor_id` text NOT NULL,
  `access_grant_id` text,
  `event_type` text NOT NULL CHECK (`event_type` IN ('grant','revoke','offline_hold','override')),
  `controller_ref` text,
  `status` text NOT NULL CHECK (`status` IN ('queued','sent','acknowledged','failed','manual_review')),
  `reason` text NOT NULL,
  `actor_id` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`visitor_id`) REFERENCES `visitor_registrations`(`id`),
  FOREIGN KEY (`access_grant_id`) REFERENCES `visitor_access_grants`(`id`),
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `master_data_records` (
  `id` text PRIMARY KEY NOT NULL,
  `entity_type` text NOT NULL CHECK (`entity_type` IN ('asset_category','cost_catalog','provider','access_zone','event_catalog')),
  `record_key` text NOT NULL,
  `version` integer NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','approved','inactive','rejected')),
  `owner_id` text NOT NULL,
  `effective_from` integer NOT NULL,
  `effective_to` integer,
  `payload` text NOT NULL,
  `reason` text NOT NULL,
  `maker_id` text NOT NULL,
  `checker_id` text,
  `decided_at` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`maker_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`checker_id`) REFERENCES `users`(`id`),
  CHECK (`checker_id` IS NULL OR `checker_id` <> `maker_id`),
  CHECK (`effective_to` IS NULL OR `effective_to` > `effective_from`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_data_record_version_unique` ON `master_data_records` (`entity_type`,`record_key`,`version`);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_data_effective_unique` ON `master_data_records` (`entity_type`,`record_key`) WHERE `status`='approved' AND `effective_to` IS NULL;
--> statement-breakpoint
CREATE TRIGGER `master_data_no_hard_delete` BEFORE DELETE ON `master_data_records` WHEN OLD.`status` <> 'draft' BEGIN SELECT RAISE(ABORT,'MASTER_DATA_HARD_DELETE_FORBIDDEN'); END;
--> statement-breakpoint
INSERT INTO `assets` (`id`,`organization`,`code`,`name`,`location`,`category`,`status`,`serial_number`,`model`,`provider_id`,`warranty_start`,`warranty_end`,`owner_id`,`created_at`,`updated_at`) VALUES ('asset-hvac-demo','NIC','HVAC-HL-01','Cụm điều hòa trung tâm Hòa Lạc','NIC Hòa Lạc · Tầng 1','HVAC','active','NIC-HVAC-0001','VRV-X','provider-building-mvp',1751328000,1814400000,'demo-facility-001',1784617200,1784617200);
--> statement-breakpoint
INSERT INTO `maintenance_plans` (`id`,`asset_id`,`name`,`recurrence_days`,`lead_time_days`,`booking_window_days`,`next_due_at`,`template_id`,`status`,`created_by`,`created_at`,`updated_at`) VALUES ('plan-hvac-demo','asset-hvac-demo','Bảo trì HVAC định kỳ',90,7,14,1785222000,'template-support-v1','active','demo-facility-001',1784617200,1784617200);
--> statement-breakpoint
INSERT INTO `event_templates` (`id`,`name`,`event_type`,`scale`,`version`,`budget_threshold_minor`,`status`,`created_by`,`created_at`) VALUES ('event-template-workshop-v1','Workshop tiêu chuẩn','workshop','medium',1,50000000,'active','demo-event-001',1784617200);
--> statement-breakpoint
INSERT INTO `event_template_tasks` (`id`,`template_id`,`sequence`,`title`,`due_offset_days`,`dependency_sequence`,`required`,`default_assignee_role`) VALUES ('event-task-plan','event-template-workshop-v1',1,'Chốt mặt bằng và sơ đồ',-7,NULL,1,'event_staff'),('event-task-equipment','event-template-workshop-v1',2,'Kiểm tra thiết bị',-2,1,1,'event_staff'),('event-task-catering','event-template-workshop-v1',3,'Xác nhận catering',-1,1,1,'event_staff');
--> statement-breakpoint
INSERT INTO `event_template_lines` (`id`,`template_id`,`line_type`,`description`,`quantity_milli`,`unit`,`unit_price_minor`) VALUES ('event-line-room','event-template-workshop-v1','service','Vận hành hội trường',1000,'gói',15000000),('event-line-equipment','event-template-workshop-v1','equipment','Âm thanh và trình chiếu',1000,'gói',12000000),('event-line-menu','event-template-workshop-v1','menu','Tea break tiêu chuẩn',100000,'suất',180000);
--> statement-breakpoint
INSERT INTO `access_zones` (`id`,`code`,`name`,`controller_ref`,`status`) VALUES ('zone-reception-demo','RECEPTION','Sảnh và khu tiếp khách','controller-nic-demo','active');
--> statement-breakpoint
INSERT INTO `master_data_records` (`id`,`entity_type`,`record_key`,`version`,`status`,`owner_id`,`effective_from`,`payload`,`reason`,`maker_id`,`checker_id`,`decided_at`,`created_at`) VALUES ('master-asset-category-hvac','asset_category','HVAC',1,'approved','demo-system-admin-001',1784617200,'{"name":"HVAC","maintenanceRequired":true}','Seed danh mục P2','demo-system-admin-001','demo-facility-001',1784617200,1784617200);
