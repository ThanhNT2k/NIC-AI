CREATE TABLE `request_comments` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL,
  `author_id` text NOT NULL,
  `body` text NOT NULL CHECK (length(`body`) BETWEEN 1 AND 2000),
  `created_at` integer NOT NULL,
  FOREIGN KEY (`request_id`) REFERENCES `service_requests`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `request_comments_request_time_idx` ON `request_comments` (`request_id`,`created_at`);
