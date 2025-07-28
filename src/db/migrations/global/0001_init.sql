-- Migration: Initialize global database
-- Created: 2025-07-28

CREATE TABLE `global_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`type` text DEFAULT 'string' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `global_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version` text NOT NULL,
	`last_migration` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create unique index for preferences
CREATE UNIQUE INDEX `idx_global_preferences_category_key` ON `global_preferences` (`category`, `key`);

-- Create index for version lookup
CREATE INDEX `idx_global_metadata_version` ON `global_metadata` (`version`);

-- Insert initial metadata
INSERT INTO `global_metadata` (`version`, `last_migration`) VALUES ('1.0.0', 1);