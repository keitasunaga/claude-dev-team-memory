import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const globalPreferences = sqliteTable('global_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  type: text('type').notNull().default('string'),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const globalMetadata = sqliteTable('global_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  version: text('version').notNull(),
  last_migration: integer('last_migration').default(0),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Type exports
export type GlobalPreference = typeof globalPreferences.$inferSelect;
export type NewGlobalPreference = typeof globalPreferences.$inferInsert;
export type GlobalMetadata = typeof globalMetadata.$inferSelect;
export type NewGlobalMetadata = typeof globalMetadata.$inferInsert;
