import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import type { ServerConfig } from '../types/index.js';
import { logger } from './logger.js';

const DEFAULT_CONFIG: ServerConfig = {
  storage: {
    basePath: path.join(os.homedir(), '.mcp-memory-server'),
    databases: {
      global: 'global.db',
      projects: 'projects',
    },
    backups: {
      enabled: true,
      retention: 30, // days
      schedule: '0 2 * * *', // Daily at 2 AM
    },
  },
  performance: {
    cache: {
      enabled: true,
      maxSize: 1000,
      ttl: 300000, // 5 minutes
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
    interval: 30000, // 30 seconds
    triggers: ['task_complete', 'test_pass', 'checkpoint'],
  },
  logging: {
    level: 'info',
    file: 'mcp-memory-server.log',
    maxSize: '10MB',
    maxFiles: 5,
  },
};

export async function loadConfig(): Promise<ServerConfig> {
  try {
    const configPath = path.join(os.homedir(), '.mcp-memory-server', 'config.json');

    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const userConfig = JSON.parse(configData);

      // Merge with default config
      const config = mergeConfig(DEFAULT_CONFIG, userConfig);
      logger.info('Configuration loaded from file', { configPath });
      return config;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // Config file doesn't exist, create it with defaults
        await ensureConfigExists(configPath, DEFAULT_CONFIG);
        logger.info('Default configuration created', { configPath });
        return DEFAULT_CONFIG;
      }
      throw error;
    }
  } catch (error) {
    logger.warn('Failed to load configuration, using defaults', error);
    return DEFAULT_CONFIG;
  }
}

async function ensureConfigExists(configPath: string, config: ServerConfig): Promise<void> {
  try {
    // Ensure directory exists
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });

    // Write default config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    logger.error('Failed to create default configuration file', error);
  }
}

function mergeConfig(defaultConfig: ServerConfig, userConfig: Partial<ServerConfig>): ServerConfig {
  return {
    storage: {
      ...defaultConfig.storage,
      ...userConfig.storage,
      databases: {
        ...defaultConfig.storage.databases,
        ...userConfig.storage?.databases,
      },
      backups: {
        ...defaultConfig.storage.backups,
        ...userConfig.storage?.backups,
      },
    },
    performance: {
      ...defaultConfig.performance,
      ...userConfig.performance,
      cache: {
        ...defaultConfig.performance.cache,
        ...userConfig.performance?.cache,
      },
      database: {
        ...defaultConfig.performance.database,
        ...userConfig.performance?.database,
        connectionPool: {
          ...defaultConfig.performance.database.connectionPool,
          ...userConfig.performance?.database?.connectionPool,
        },
      },
    },
    security: {
      ...defaultConfig.security,
      ...userConfig.security,
      encryption: {
        ...defaultConfig.security.encryption,
        ...userConfig.security?.encryption,
      },
      accessControl: {
        ...defaultConfig.security.accessControl,
        ...userConfig.security?.accessControl,
      },
    },
    autoSave: {
      ...defaultConfig.autoSave,
      ...userConfig.autoSave,
    },
    logging: {
      ...defaultConfig.logging,
      ...userConfig.logging,
    },
  };
}
