CREATE TABLE `profiles` (
	`owner` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`avatar` text,
	`updated_at` integer NOT NULL
);
