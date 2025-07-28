import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const projectInfo = sqliteTable('project_info', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_path: text('project_path').notNull().unique(),
  project_name: text('project_name').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  last_accessed: text('last_accessed')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const currentIssue = sqliteTable('current_issue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id')
    .notNull()
    .references(() => projectInfo.id),
  issue_number: integer('issue_number'),
  title: text('title'),
  requirements: text('requirements'), // JSON array
  design_decisions: text('design_decisions'), // JSON array
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id')
    .notNull()
    .references(() => projectInfo.id),
  task_description: text('task_description').notNull(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed'] }).notNull(),
  priority: integer('priority').default(0),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  completed_at: text('completed_at'),
});

export const checkpoints = sqliteTable('checkpoints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id')
    .notNull()
    .references(() => projectInfo.id),
  checkpoint_name: text('checkpoint_name'),
  branch_name: text('branch_name'),
  last_command: text('last_command'),
  next_action: text('next_action'),
  snapshot_data: text('snapshot_data'), // JSON blob of complete state
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sessionState = sqliteTable('session_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_id: integer('project_id')
    .notNull()
    .references(() => projectInfo.id),
  current_task: text('current_task'),
  branch: text('branch'),
  modified_files: text('modified_files'), // JSON array
  last_checkpoint: text('last_checkpoint'),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Type exports
export type ProjectInfo = typeof projectInfo.$inferSelect;
export type NewProjectInfo = typeof projectInfo.$inferInsert;
export type CurrentIssue = typeof currentIssue.$inferSelect;
export type NewCurrentIssue = typeof currentIssue.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type NewCheckpoint = typeof checkpoints.$inferInsert;
export type SessionState = typeof sessionState.$inferSelect;
export type NewSessionState = typeof sessionState.$inferInsert;
