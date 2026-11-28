CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`bytes` integer NOT NULL,
	`mime` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`document` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`install_id` text NOT NULL,
	`credential` text,
	`own_key` text,
	`choice` text,
	`owner` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_event` integer DEFAULT 0 NOT NULL,
	`consent` integer DEFAULT 0 NOT NULL,
	`telemetry` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL,
	`charge` integer DEFAULT 0 NOT NULL
);
