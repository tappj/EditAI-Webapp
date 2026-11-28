CREATE TABLE `account_preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`consent` integer,
	`avatar_preset` text DEFAULT 'editAI' NOT NULL,
	`appearance` text
);
