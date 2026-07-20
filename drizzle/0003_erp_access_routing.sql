CREATE TABLE `departments` (
  `id` text PRIMARY KEY NOT NULL,
  `organization` text NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `accepts_requests` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_org_code_unique` ON `departments` (`organization`,`code`);
--> statement-breakpoint
CREATE TABLE `organization_memberships` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `organization` text NOT NULL,
  `department_id` text,
  `role` text DEFAULT 'customer_member' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_user_org_unique` ON `organization_memberships` (`user_id`,`organization`);
--> statement-breakpoint
ALTER TABLE `service_requests` ADD `target_department` text DEFAULT 'service_desk' NOT NULL;
--> statement-breakpoint
ALTER TABLE `service_requests` ADD `requester_role` text DEFAULT 'customer_member' NOT NULL;
--> statement-breakpoint
ALTER TABLE `service_requests` ADD `assigned_to` text REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE `service_requests` ADD `visibility` text DEFAULT 'organization' NOT NULL;
--> statement-breakpoint
INSERT INTO `departments` (`id`,`organization`,`code`,`name`,`accepts_requests`) VALUES
  ('nic-team-service-desk','NIC','service_desk','Service Desk',1),
  ('nic-team-facility','NIC','facility','Facility Operations',1),
  ('nic-team-event','NIC','event','Event Operations',1),
  ('nic-team-security','NIC','security','Security & Visitor Services',1),
  ('demo-customer-team','Innovate Vietnam','customer','Customer Team',0);
--> statement-breakpoint
INSERT INTO `organization_memberships` (`id`,`user_id`,`organization`,`department_id`,`role`,`status`,`created_at`)
SELECT 'demo-membership-001', id, organization, 'demo-customer-team', 'customer_admin', 'active', created_at FROM users WHERE email = 'thanh@demo.nic.vn';
