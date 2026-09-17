CREATE TABLE `containers` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`owner` text NOT NULL,
	`size` text NOT NULL,
	`cargo` text NOT NULL,
	`position` text,
	`status` text DEFAULT 'waiting' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `containers_code_unique` ON `containers` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `containers_position_unique` ON `containers` (`position`);