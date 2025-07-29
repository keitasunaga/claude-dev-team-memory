#!/usr/bin/env node

/**
 * Setup script for MCP Memory Server
 * Initializes databases and runs migrations
 */

import { DatabaseManager } from '../db/DatabaseManager.js';
import { GlobalRepository } from '../repositories/GlobalRepository.js';
import { loadConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import fs from 'node:fs/promises';
import path from 'node:path';

async function setup() {
  try {
    logger.info('Starting MCP Memory Server setup...');
    
    // Load configuration
    const config = await loadConfig();
    
    // Ensure directories exist
    logger.info('Creating directories...');
    await fs.mkdir(config.storage.basePath, { recursive: true });
    await fs.mkdir(path.join(config.storage.basePath, 'global'), { recursive: true });
    await fs.mkdir(path.join(config.storage.basePath, 'projects'), { recursive: true });
    await fs.mkdir(path.join(config.storage.basePath, 'backups'), { recursive: true });
    await fs.mkdir(path.join(config.storage.basePath, 'logs'), { recursive: true });
    
    // Initialize database manager
    logger.info('Initializing databases...');
    const dbManager = new DatabaseManager(config);
    
    // Run migrations
    logger.info('Running database migrations...');
    await dbManager.runMigrations();
    
    // Verify setup
    logger.info('Verifying setup...');
    const globalDb = dbManager.getGlobalDb();
    logger.info('Database connection verified');
    
    // Create initial global preferences if needed
    logger.info('Creating default preferences...');
    
    // Default preferences
    const defaults = [
      ['user_preferences', 'language', 'en', 'string'],
      ['user_preferences', 'commit_style', 'conventional', 'string'],
      ['development_style', 'branch_strategy', 'git-flow', 'string'],
      ['communication_style', 'response', 'concise', 'string']
    ];
    
    // Since we're using Drizzle, we need to use the GlobalRepository instead
    const globalRepo = new GlobalRepository(globalDb);
    
    for (const [category, key, value, type] of defaults) {
      try {
        await globalRepo.savePreference(category as string, key as string, value as string, type as string);
      } catch (error) {
        // Ignore if already exists
      }
    }
    
    logger.info('Setup completed successfully!');
    logger.info(`Database location: ${path.join(config.storage.basePath, 'global.db')}`);
    
    // Clean up
    await dbManager.close();
    
    process.exit(0);
  } catch (error) {
    logger.error('Setup failed', error);
    process.exit(1);
  }
}

// Run setup
setup();