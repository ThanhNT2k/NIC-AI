INSERT INTO `users` (`id`,`email`,`full_name`,`organization`,`role`,`password_hash`,`password_salt`,`password_iterations`,`failed_attempts`,`created_at`) VALUES
  ('demo-event-001','event@demo.nic.vn','Nguyễn Lan Event','NIC','event_manager','HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=','UZ9cM6ihl20HzLKw7olQqA==',210000,0,1784552400),
  ('demo-security-001','security@demo.nic.vn','Phạm Nam Security','NIC','security_staff','HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=','UZ9cM6ihl20HzLKw7olQqA==',210000,0,1784552400);
--> statement-breakpoint
INSERT INTO `organization_memberships` (`id`,`user_id`,`organization`,`department_id`,`role`,`status`,`created_at`) VALUES
  ('demo-membership-event','demo-event-001','NIC','nic-team-event','event_manager','active',1784552400),
  ('demo-membership-security','demo-security-001','NIC','nic-team-security','security_staff','active',1784552400);
