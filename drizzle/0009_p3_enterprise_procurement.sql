ALTER TABLE `users` ADD COLUMN `account_status` text DEFAULT 'active' NOT NULL CHECK (`account_status` IN ('invited','active','suspended','deprovisioned'));
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `identity_provider` text DEFAULT 'local' NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `identity_subject` text;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `mfa_required` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_external_identity_unique` ON `users` (`identity_provider`,`identity_subject`) WHERE `identity_subject` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `auth_method` text DEFAULT 'local' NOT NULL CHECK (`auth_method` IN ('local','federated'));
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `mfa_verified` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD COLUMN `correlation_id` text;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD COLUMN `source` text DEFAULT 'application' NOT NULL;
--> statement-breakpoint
CREATE TABLE `oidc_login_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `state_hash` text NOT NULL UNIQUE,
  `nonce_hash` text NOT NULL,
  `code_verifier` text NOT NULL,
  `return_to` text DEFAULT '/portal' NOT NULL,
  `expires_at` integer NOT NULL,
  `consumed_at` integer,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `finance_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `organization` text NOT NULL UNIQUE,
  `currency` text DEFAULT 'VND' NOT NULL,
  `po_approval_threshold_minor` integer NOT NULL CHECK (`po_approval_threshold_minor` >= 0),
  `price_tolerance_bps` integer DEFAULT 500 NOT NULL CHECK (`price_tolerance_bps` BETWEEN 0 AND 10000),
  `quantity_tolerance_bps` integer DEFAULT 0 NOT NULL CHECK (`quantity_tolerance_bps` BETWEEN 0 AND 10000),
  `updated_by` text NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_contracts` (
  `id` text PRIMARY KEY NOT NULL,
  `organization` text NOT NULL,
  `contract_number` text NOT NULL,
  `provider_id` text NOT NULL,
  `title` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','active','expired','terminated')),
  `currency` text DEFAULT 'VND' NOT NULL,
  `valid_from` integer NOT NULL,
  `valid_until` integer NOT NULL,
  `ceiling_minor` integer NOT NULL CHECK (`ceiling_minor` >= 0),
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  CHECK (`valid_until` > `valid_from`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `procurement_contract_version_unique` ON `procurement_contracts` (`organization`,`contract_number`,`version`);
--> statement-breakpoint
CREATE TABLE `procurement_contract_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `contract_id` text NOT NULL,
  `line_number` integer NOT NULL,
  `description` text NOT NULL,
  `unit` text NOT NULL,
  `max_quantity_milli` integer NOT NULL CHECK (`max_quantity_milli` > 0),
  `unit_price_minor` integer NOT NULL CHECK (`unit_price_minor` >= 0),
  FOREIGN KEY (`contract_id`) REFERENCES `procurement_contracts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `procurement_contract_line_unique` ON `procurement_contract_lines` (`contract_id`,`line_number`);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
  `id` text PRIMARY KEY NOT NULL,
  `organization` text NOT NULL,
  `po_number` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `provider_id` text NOT NULL,
  `contract_id` text,
  `work_order_id` text,
  `event_order_id` text,
  `status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','pending_approval','approved','rejected','issued','partially_received','received','closed','cancelled')),
  `currency` text DEFAULT 'VND' NOT NULL,
  `subtotal_minor` integer NOT NULL CHECK (`subtotal_minor` >= 0),
  `approval_threshold_minor` integer NOT NULL CHECK (`approval_threshold_minor` >= 0),
  `idempotency_key` text NOT NULL,
  `created_by` text NOT NULL,
  `approved_by` text,
  `approved_at` integer,
  `issued_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`),
  FOREIGN KEY (`contract_id`) REFERENCES `procurement_contracts`(`id`),
  FOREIGN KEY (`work_order_id`) REFERENCES `maintenance_work_orders`(`id`),
  FOREIGN KEY (`event_order_id`) REFERENCES `event_service_orders`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`),
  CHECK (`work_order_id` IS NOT NULL OR `event_order_id` IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_number_version_unique` ON `purchase_orders` (`organization`,`po_number`,`version`);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_idempotency_unique` ON `purchase_orders` (`organization`,`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `purchase_order_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `purchase_order_id` text NOT NULL,
  `contract_line_id` text,
  `line_number` integer NOT NULL,
  `description` text NOT NULL,
  `line_type` text DEFAULT 'service' NOT NULL CHECK (`line_type` IN ('labor','material','service','equipment','menu')),
  `quantity_milli` integer NOT NULL CHECK (`quantity_milli` > 0),
  `unit` text NOT NULL,
  `unit_price_minor` integer NOT NULL CHECK (`unit_price_minor` >= 0),
  `line_total_minor` integer NOT NULL CHECK (`line_total_minor` >= 0),
  FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`contract_line_id`) REFERENCES `procurement_contract_lines`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_line_unique` ON `purchase_order_lines` (`purchase_order_id`,`line_number`);
--> statement-breakpoint
CREATE TABLE `purchase_order_approvals` (
  `id` text PRIMARY KEY NOT NULL,
  `purchase_order_id` text NOT NULL UNIQUE,
  `requested_by` text NOT NULL,
  `requested_at` integer NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending','approved','rejected')),
  `decided_by` text,
  `decided_at` integer,
  `note` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`),
  CHECK (`decided_by` IS NULL OR `decided_by` <> `requested_by`)
);
--> statement-breakpoint
CREATE TRIGGER `purchase_order_issue_guard` BEFORE UPDATE OF `status` ON `purchase_orders`
WHEN NEW.`status`='issued' AND (OLD.`status`<>'approved' OR EXISTS (SELECT 1 FROM `purchase_order_approvals` a WHERE a.`purchase_order_id`=OLD.`id` AND a.`status`<>'approved'))
BEGIN SELECT RAISE(ABORT,'PO_APPROVAL_REQUIRED'); END;
--> statement-breakpoint
CREATE TABLE `goods_receipts` (
  `id` text PRIMARY KEY NOT NULL,
  `purchase_order_id` text NOT NULL,
  `receipt_number` text NOT NULL,
  `status` text DEFAULT 'posted' NOT NULL CHECK (`status` IN ('posted','reversed')),
  `received_at` integer NOT NULL,
  `idempotency_key` text NOT NULL,
  `received_by` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`),
  FOREIGN KEY (`received_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goods_receipt_number_unique` ON `goods_receipts` (`purchase_order_id`,`receipt_number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `goods_receipt_idempotency_unique` ON `goods_receipts` (`purchase_order_id`,`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `goods_receipt_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `receipt_id` text NOT NULL,
  `purchase_order_line_id` text NOT NULL,
  `quantity_received_milli` integer NOT NULL CHECK (`quantity_received_milli` > 0),
  `condition` text DEFAULT 'accepted' NOT NULL CHECK (`condition` IN ('accepted','damaged','rejected')),
  `note` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`receipt_id`) REFERENCES `goods_receipts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`purchase_order_line_id`) REFERENCES `purchase_order_lines`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goods_receipt_line_unique` ON `goods_receipt_lines` (`receipt_id`,`purchase_order_line_id`);
--> statement-breakpoint
CREATE TRIGGER `goods_receipt_quantity_guard` BEFORE INSERT ON `goods_receipt_lines`
WHEN NEW.`quantity_received_milli` > (SELECT pol.`quantity_milli` - COALESCE(SUM(grl.`quantity_received_milli`),0) FROM `purchase_order_lines` pol LEFT JOIN `goods_receipt_lines` grl ON grl.`purchase_order_line_id`=pol.`id` LEFT JOIN `goods_receipts` gr ON gr.`id`=grl.`receipt_id` AND gr.`status`='posted' WHERE pol.`id`=NEW.`purchase_order_line_id` GROUP BY pol.`id`)
BEGIN SELECT RAISE(ABORT,'RECEIPT_EXCEEDS_PO'); END;
--> statement-breakpoint
CREATE TABLE `supplier_invoices` (
  `id` text PRIMARY KEY NOT NULL,
  `purchase_order_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `invoice_number` text NOT NULL,
  `invoice_date` integer NOT NULL,
  `status` text DEFAULT 'pending_match' NOT NULL CHECK (`status` IN ('pending_match','matched','exception','approved','rejected','paid')),
  `currency` text NOT NULL,
  `total_minor` integer NOT NULL CHECK (`total_minor` >= 0),
  `idempotency_key` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`),
  FOREIGN KEY (`provider_id`) REFERENCES `service_providers`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_invoice_number_unique` ON `supplier_invoices` (`provider_id`,`invoice_number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_invoice_idempotency_unique` ON `supplier_invoices` (`provider_id`,`idempotency_key`);
--> statement-breakpoint
CREATE TABLE `supplier_invoice_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `invoice_id` text NOT NULL,
  `purchase_order_line_id` text NOT NULL,
  `line_number` integer NOT NULL,
  `quantity_milli` integer NOT NULL CHECK (`quantity_milli` > 0),
  `unit_price_minor` integer NOT NULL CHECK (`unit_price_minor` >= 0),
  `line_total_minor` integer NOT NULL CHECK (`line_total_minor` >= 0),
  FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`purchase_order_line_id`) REFERENCES `purchase_order_lines`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_invoice_line_unique` ON `supplier_invoice_lines` (`invoice_id`,`line_number`);
--> statement-breakpoint
CREATE TABLE `three_way_matches` (
  `id` text PRIMARY KEY NOT NULL,
  `invoice_id` text NOT NULL UNIQUE,
  `status` text NOT NULL CHECK (`status` IN ('matched','exception')),
  `price_tolerance_bps` integer NOT NULL,
  `quantity_tolerance_bps` integer NOT NULL,
  `variance_minor` integer NOT NULL,
  `result_payload` text NOT NULL,
  `matched_by` text NOT NULL,
  `matched_at` integer NOT NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices`(`id`),
  FOREIGN KEY (`matched_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_exceptions` (
  `id` text PRIMARY KEY NOT NULL,
  `invoice_id` text NOT NULL,
  `exception_type` text NOT NULL,
  `severity` text DEFAULT 'high' NOT NULL CHECK (`severity` IN ('medium','high','critical')),
  `status` text DEFAULT 'open' NOT NULL CHECK (`status` IN ('open','under_review','resolved','rejected')),
  `details` text NOT NULL,
  `assigned_role` text DEFAULT 'finance_manager' NOT NULL,
  `created_at` integer NOT NULL,
  `resolved_by` text,
  `resolved_at` integer,
  FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices`(`id`),
  FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `observability_events` (
  `id` text PRIMARY KEY NOT NULL,
  `correlation_id` text NOT NULL,
  `trace_id` text NOT NULL,
  `level` text NOT NULL CHECK (`level` IN ('info','warn','error')),
  `event_name` text NOT NULL,
  `route` text NOT NULL,
  `actor_hash` text,
  `status_code` integer,
  `duration_ms` integer,
  `error_code` text,
  `metadata` text DEFAULT '{}' NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `observability_correlation_idx` ON `observability_events` (`correlation_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `operational_incidents` (
  `id` text PRIMARY KEY NOT NULL,
  `correlation_id` text NOT NULL,
  `source` text NOT NULL,
  `severity` text NOT NULL CHECK (`severity` IN ('warning','critical')),
  `title` text NOT NULL,
  `status` text DEFAULT 'open' NOT NULL CHECK (`status` IN ('open','acknowledged','resolved')),
  `runbook` text NOT NULL,
  `dedupe_key` text NOT NULL UNIQUE,
  `created_at` integer NOT NULL,
  `resolved_at` integer
);
--> statement-breakpoint
CREATE TABLE `retention_policies` (
  `id` text PRIMARY KEY NOT NULL,
  `data_class` text NOT NULL UNIQUE,
  `retention_days` integer NOT NULL CHECK (`retention_days` > 0),
  `action` text NOT NULL CHECK (`action` IN ('archive_delete','delete','anonymize')),
  `legal_basis` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','inactive')),
  `updated_by` text NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `legal_holds` (
  `id` text PRIMARY KEY NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `reason` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','released')),
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL,
  `released_by` text,
  `released_at` integer,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`released_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `legal_hold_active_unique` ON `legal_holds` (`entity_type`,`entity_id`) WHERE `status`='active';
--> statement-breakpoint
CREATE TABLE `retention_job_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `correlation_id` text NOT NULL,
  `dry_run` integer DEFAULT 1 NOT NULL,
  `status` text NOT NULL CHECK (`status` IN ('running','completed','failed')),
  `candidate_count` integer DEFAULT 0 NOT NULL,
  `processed_count` integer DEFAULT 0 NOT NULL,
  `held_count` integer DEFAULT 0 NOT NULL,
  `error_code` text,
  `started_at` integer NOT NULL,
  `completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `retention_archive` (
  `id` text PRIMARY KEY NOT NULL,
  `job_run_id` text NOT NULL,
  `data_class` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `payload` text NOT NULL,
  `payload_hash` text NOT NULL,
  `archived_at` integer NOT NULL,
  FOREIGN KEY (`job_run_id`) REFERENCES `retention_job_runs`(`id`)
);
--> statement-breakpoint
INSERT INTO `finance_policies` (`id`,`organization`,`currency`,`po_approval_threshold_minor`,`price_tolerance_bps`,`quantity_tolerance_bps`,`updated_by`,`updated_at`) VALUES ('finance-policy-nic','NIC','VND',50000000,500,0,'demo-system-admin-001',1784617200);
--> statement-breakpoint
INSERT INTO `retention_policies` (`id`,`data_class`,`retention_days`,`action`,`legal_basis`,`updated_by`,`updated_at`) VALUES ('retention-auth-session','auth_session',30,'delete','Bảo mật và quản trị phiên','demo-system-admin-001',1784617200),('retention-visitor-qr','visitor_qr',30,'archive_delete','An toàn truy cập và kiểm toán','demo-system-admin-001',1784617200),('retention-observability','observability',90,'delete','Vận hành và điều tra sự cố','demo-system-admin-001',1784617200);
