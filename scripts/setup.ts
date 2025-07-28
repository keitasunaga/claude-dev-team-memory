#!/usr/bin/env tsx
/**
 * Setup script for MCP Memory Server
 * Initializes the development environment and creates necessary directories
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../src/utils/logger.js';

async function setup() {
  logger.info('Starting MCP Memory Server setup...');

  try {
    // Create necessary directories
    const baseDir = path.join(os.homedir(), '.mcp-memory-server');
    const logsDir = path.join(baseDir, 'logs');
    const dataDir = path.join(baseDir, 'data');
    const backupsDir = path.join(baseDir, 'backups');

    const directories = [baseDir, logsDir, dataDir, backupsDir];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
        logger.info(`Directory already exists: ${dir}`);
      }
    }

    // Create default configuration if it doesn't exist
    const configPath = path.join(baseDir, 'config.json');
    
    try {
      await fs.access(configPath);
      logger.info('Configuration file already exists');
    } catch (error) {
      const defaultConfig = {
        storage: {
          basePath: baseDir,
          databases: {
            global: 'global.db',
            projects: 'projects',
          },
          backups: {
            enabled: true,
            retention: 30,
            schedule: '0 2 * * *',
          },
        },
        performance: {
          cache: {
            enabled: true,
            maxSize: 1000,
            ttl: 300000,
          },
          database: {
            connectionPool: {
              min: 1,
              max: 10,
            },
            optimization: true,
          },
        },
        security: {
          encryption: {
            enabled: false,
            algorithm: 'aes-256-gcm',
          },
          accessControl: {
            enabled: false,
            allowedPaths: [],
          },
        },
        autoSave: {
          enabled: true,
          interval: 30000,
          triggers: ['task_complete', 'test_pass', 'checkpoint'],
        },
        logging: {
          level: 'info',
          file: 'mcp-memory-server.log',
          maxSize: '10MB',
          maxFiles: 5,
        },
      };

      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      logger.info(`Created default configuration: ${configPath}`);
    }

    // Create project data directory
    const projectsDir = path.join(dataDir, 'projects');
    await fs.mkdir(projectsDir, { recursive: true });
    logger.info(`Created projects directory: ${projectsDir}`);

    logger.info('Setup completed successfully!');
    logger.info(`Configuration directory: ${baseDir}`);
    logger.info('You can now run the MCP Memory Server with: npm start');

  } catch (error) {
    logger.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setup();
}