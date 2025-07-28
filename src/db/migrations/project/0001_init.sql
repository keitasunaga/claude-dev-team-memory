-- Migration: Initialize project database
-- Created: 2025-07-28

CREATE TABLE `project_info` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_path` text NOT NULL,
	`project_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_accessed` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	UNIQUE(`project_path`)
);

CREATE TABLE `current_issue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`issue_number` integer,
	`title` text,
	`requirements` text,
	`design_decisions` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project_info`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`task_description` text NOT NULL,
	`status` text NOT NULL,
	`priority` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `project_info`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `checkpoints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`checkpoint_name` text,
	`branch_name` text,
	`last_command` text,
	`next_action` text,
	`snapshot_data` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project_info`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `session_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`current_task` text,
	`branch` text,
	`modified_files` text,
	`last_checkpoint` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project_info`(`id`) ON UPDATE no action ON DELETE no action
);

-- Create indexes for better performance
CREATE INDEX `idx_project_info_path` ON `project_info` (`project_path`);
CREATE INDEX `idx_current_issue_project` ON `current_issue` (`project_id`);
CREATE INDEX `idx_tasks_project_status` ON `tasks` (`project_id`, `status`);
CREATE INDEX `idx_checkpoints_project` ON `checkpoints` (`project_id`);
CREATE INDEX `idx_session_state_project` ON `session_state` (`project_id`);

-- Create trigger to update last_accessed on project_info
CREATE TRIGGER update_project_last_accessed 
    AFTER UPDATE ON project_info
    FOR EACH ROW
    BEGIN
        UPDATE project_info SET last_accessed = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Create trigger to update updated_at on current_issue
CREATE TRIGGER update_current_issue_timestamp 
    AFTER UPDATE ON current_issue
    FOR EACH ROW
    BEGIN
        UPDATE current_issue SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;