CREATE TABLE `speech_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`source_id` text NOT NULL,
	`upload_id` text NOT NULL,
	`job_id` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
