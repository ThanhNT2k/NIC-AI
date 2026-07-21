CREATE TABLE `sessions_v2` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `token_hash` text NOT NULL,
  `csrf_hash` text DEFAULT '' NOT NULL,
  `auth_method` text DEFAULT 'local' NOT NULL CHECK (`auth_method` IN ('local','federated')),
  `mfa_verified` integer DEFAULT 0 NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `sessions_v2` (`id`,`user_id`,`token_hash`,`csrf_hash`,`auth_method`,`mfa_verified`,`expires_at`,`created_at`)
SELECT `id`,`user_id`,`token_hash`,`csrf_hash`,CASE WHEN `auth_method`='oidc' THEN 'federated' ELSE 'local' END,`mfa_verified`,`expires_at`,`created_at` FROM `sessions`;
--> statement-breakpoint
DROP TABLE `sessions`;
--> statement-breakpoint
ALTER TABLE `sessions_v2` RENAME TO `sessions`;
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);
--> statement-breakpoint
CREATE TABLE `diagnostic_reports` (
  `id` text PRIMARY KEY NOT NULL,
  `correlation_id` text NOT NULL,
  `trace_id` text NOT NULL,
  `route` text NOT NULL,
  `error_class` text NOT NULL,
  `error_code` text NOT NULL,
  `safe_message` text NOT NULL,
  `frames` text NOT NULL,
  `actor_hash` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `diagnostic_reports_correlation_idx` ON `diagnostic_reports` (`correlation_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `knowledge_documents` (
  `id` text PRIMARY KEY NOT NULL,
  `service_type` text NOT NULL,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `source_uri` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('draft','active','retired')),
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `knowledge_documents_service_status_idx` ON `knowledge_documents` (`service_type`,`status`);
--> statement-breakpoint
INSERT INTO `knowledge_documents` (`id`,`service_type`,`title`,`content`,`source_uri`,`version`,`status`,`updated_at`) VALUES
('knowledge-space-v1','space_booking','Danh mục không gian NIC','Chọn không gian theo ngày, giờ bắt đầu, giờ kết thúc, số người và thiết bị. Hệ thống kiểm tra sức chứa và lịch trống trước khi xác nhận.','/portal/bookings',1,'active',1784617200),
('knowledge-support-v1','support','Hướng dẫn hỗ trợ cơ sở vật chất','Mô tả vị trí, mức ảnh hưởng, mức ưu tiên và thời gian mong muốn. Yêu cầu sau khi gửi được chuyển tới Facility để tạo và lập lịch lệnh công việc.','/portal/requests',1,'active',1784617200),
('knowledge-event-v1','event_registration','Hướng dẫn sự kiện và tea break','Khai báo tên sự kiện, thời gian, số người, gói tea break, số suất và ghi chú hậu cần. Event team điều phối nhà cung cấp trước khi xác nhận.','/portal/coordination',1,'active',1784617200),
('knowledge-access-v1','access_card','Hướng dẫn khách và quyền ra vào','Đăng ký khách cần họ tên, liên hệ, người tiếp đón, thời gian và mục đích. Khách được phê duyệt mới có thể nhận QR hoặc badge.','/portal/coordination',1,'active',1784617200);
