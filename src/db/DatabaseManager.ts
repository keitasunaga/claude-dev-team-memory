import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
// import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import fs from 'node:fs/promises';
import { logger } from '../utils/logger.js';
import type { ServerConfig } from '../types/index.js';

export class DatabaseManager {
  private globalDb: Database.Database;
  private projectDbs: Map<string, Database.Database>;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.projectDbs = new Map();
    this.globalDb = this.initGlobalDatabase();
  }

  private initGlobalDatabase(): Database.Database {
    const dbPath = path.join(this.config.storage.basePath, this.config.storage.databases.global);
    return this.createDatabase(dbPath);
  }

  private createDatabase(dbPath: string): Database.Database {
    try {
      // Ensure directory exists
      const dir = path.dirname(dbPath);
      fs.mkdir(dir, { recursive: true }).catch(() => {});

      const db = new Database(dbPath);

      // Enable WAL mode for better concurrency
      db.pragma('journal_mode = WAL');

      // Optimize SQLite settings
      if (this.config.performance.database.optimization) {
        db.pragma('synchronous = NORMAL');
        db.pragma('cache_size = -64000'); // 64MB cache
        db.pragma('temp_store = MEMORY');
        db.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O
      }

      logger.info(`Database initialized: ${dbPath}`);
      return db;
    } catch (error) {
      logger.error(`Failed to create database: ${dbPath}`, error);
      throw error;
    }
  }

  getGlobalDb() {
    return drizzle(this.globalDb);
  }

  getProjectDb(projectPath: string) {
    if (!this.projectDbs.has(projectPath)) {
      const projectHash = this.hashProjectPath(projectPath);
      const dbPath = path.join(
        this.config.storage.basePath,
        this.config.storage.databases.projects,
        `${projectHash}.db`
      );

      const db = this.createDatabase(dbPath);
      this.projectDbs.set(projectPath, db);
    }

    return drizzle(this.projectDbs.get(projectPath)!);
  }

  private hashProjectPath(projectPath: string): string {
    // Simple hash function for project path
    const crypto = require('crypto');
    return crypto.createHash('md5').update(projectPath).digest('hex');
  }

  async runMigrations() {
    try {
      const { runGlobalMigrations } = await import('./migrations/migrator.js');

      // Run global database migrations
      const globalDbPath = path.join(
        this.config.storage.basePath,
        this.config.storage.databases.global
      );
      await runGlobalMigrations(globalDbPath);

      logger.info('Global database migrations completed');
    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  }

  async runProjectMigrations(projectPath: string) {
    try {
      const { runProjectMigrations } = await import('./migrations/migrator.js');

      const projectHash = this.hashProjectPath(projectPath);
      const dbPath = path.join(
        this.config.storage.basePath,
        this.config.storage.databases.projects,
        `${projectHash}.db`
      );

      await runProjectMigrations(dbPath);
      logger.info(`Project database migrations completed for: ${projectPath}`);
    } catch (error) {
      logger.error(`Project migration failed for ${projectPath}`, error);
      throw error;
    }
  }

  async close() {
    try {
      this.globalDb.close();

      for (const [path, db] of this.projectDbs) {
        db.close();
        logger.info(`Closed database for project: ${path}`);
      }

      this.projectDbs.clear();
      logger.info('All databases closed');
    } catch (error) {
      logger.error('Error closing databases', error);
      throw error;
    }
  }

  async vacuum() {
    try {
      this.globalDb.prepare('VACUUM').run();

      for (const db of this.projectDbs.values()) {
        db.prepare('VACUUM').run();
      }

      logger.info('Database vacuum completed');
    } catch (error) {
      logger.error('Vacuum failed', error);
      throw error;
    }
  }

  async analyze() {
    try {
      this.globalDb.prepare('ANALYZE').run();

      for (const db of this.projectDbs.values()) {
        db.prepare('ANALYZE').run();
      }

      logger.info('Database analysis completed');
    } catch (error) {
      logger.error('Analysis failed', error);
      throw error;
    }
  }
}
