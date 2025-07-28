import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './src/db/schemas/*.ts',
  out: './src/db/migrations',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: './data/global.db', // Default path for migrations generation
  },
  strict: true,
  verbose: true,
} satisfies Config;