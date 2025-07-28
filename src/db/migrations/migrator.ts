// import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../utils/logger.js';

export class MigrationManager {
  private db: Database.Database;
  // private drizzleDb: ReturnType<typeof drizzle>;
  private migrationsPath: string;

  constructor(dbPath: string, migrationsPath: string) {
    this.db = new Database(dbPath);
    // this.drizzleDb = drizzle(this.db);
    this.migrationsPath = migrationsPath;

    // Enable WAL mode
    this.db.pragma('journal_mode = WAL');

    // Create migrations table if it doesn't exist
    this.createMigrationsTable();
  }

  private createMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  }

  async runMigrations(): Promise<void> {
    try {
      const migrationFiles = await this.getMigrationFiles();
      const appliedMigrations = this.getAppliedMigrations();

      for (const file of migrationFiles) {
        const migrationName = path.basename(file, '.sql');

        if (!appliedMigrations.includes(migrationName)) {
          logger.info(`Running migration: ${migrationName}`);
          await this.runMigration(file, migrationName);
        }
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  }

  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter((file) => file.endsWith('.sql'))
        .sort()
        .map((file) => path.join(this.migrationsPath, file));
    } catch (error) {
      logger.warn(`Migration directory not found: ${this.migrationsPath}`);
      return [];
    }
  }

  private getAppliedMigrations(): string[] {
    const stmt = this.db.prepare('SELECT hash FROM __drizzle_migrations ORDER BY created_at');
    return stmt.all().map((row: any) => row.hash);
  }

  private async runMigration(filePath: string, migrationName: string): Promise<void> {
    const sql = await fs.readFile(filePath, 'utf-8');

    // Execute migration in transaction
    const transaction = this.db.transaction(() => {
      // Execute the migration SQL
      this.db.exec(sql);

      // Record migration as applied
      const stmt = this.db.prepare(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)'
      );
      stmt.run(migrationName, Date.now());
    });

    transaction();
    logger.info(`Migration completed: ${migrationName}`);
  }

  close(): void {
    this.db.close();
  }
}

export async function runGlobalMigrations(globalDbPath: string): Promise<void> {
  const migrationsPath = path.join(process.cwd(), 'src/db/migrations/global');
  const migrator = new MigrationManager(globalDbPath, migrationsPath);

  try {
    await migrator.runMigrations();
  } finally {
    migrator.close();
  }
}

export async function runProjectMigrations(projectDbPath: string): Promise<void> {
  const migrationsPath = path.join(process.cwd(), 'src/db/migrations/project');
  const migrator = new MigrationManager(projectDbPath, migrationsPath);

  try {
    await migrator.runMigrations();
  } finally {
    migrator.close();
  }
}
