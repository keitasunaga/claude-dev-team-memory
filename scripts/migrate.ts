#!/usr/bin/env tsx
/**
 * Migration script for MCP Memory Server
 * Runs database migrations for both global and project databases
 */

import { DatabaseManager } from '../src/db/DatabaseManager.js';
import { loadConfig } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';

async function migrate() {
  logger.info('Starting database migrations...');

  try {
    // Load configuration
    const config = await loadConfig();
    
    // Create database manager
    const dbManager = new DatabaseManager(config);
    
    // Run global migrations
    logger.info('Running global database migrations...');
    await dbManager.runMigrations();
    
    logger.info('Database migrations completed successfully!');
    
    // Close database connections
    await dbManager.close();
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}