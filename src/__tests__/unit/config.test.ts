import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadConfig } from '../../utils/config.js';
import type { ServerConfig } from '../../types/index.js';

describe('Configuration', () => {
  const testHomeDir = path.join(os.tmpdir(), 'test-home');
  const testConfigDir = path.join(testHomeDir, '.mcp-memory-server');
  const testConfigPath = path.join(testConfigDir, 'config.json');

  beforeEach(async () => {
    // Clean up test directories
    try {
      await fs.rm(testHomeDir, { recursive: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(testHomeDir, { recursive: true });
    await fs.mkdir(testConfigDir, { recursive: true });

    // Mock os.homedir to return our test home directory
    vi.spyOn(os, 'homedir').mockReturnValue(testHomeDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await fs.rm(testHomeDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should load default configuration when no config file exists', async () => {
      const config = await loadConfig();

      expect(config).toBeDefined();
      expect(config.storage).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.autoSave).toBeDefined();
      expect(config.logging).toBeDefined();
    });

    it('should create default config file when none exists', async () => {
      await loadConfig();

      const configExists = await fs
        .access(testConfigPath)
        .then(() => true)
        .catch(() => false);
      expect(configExists).toBe(true);
    });

    it('should load user configuration from file', async () => {
      const userConfig: Partial<ServerConfig> = {
        storage: {
          basePath: '/custom/path',
          databases: {
            global: 'custom-global.db',
            projects: 'custom-projects',
          },
          backups: {
            enabled: false,
            retention: 14,
            schedule: '0 3 * * *',
          },
        },
        logging: {
          level: 'debug',
          file: 'custom.log',
          maxSize: '20MB',
          maxFiles: 10,
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(userConfig, null, 2));

      const config = await loadConfig();

      expect(config.storage.basePath).toBe('/custom/path');
      expect(config.storage.databases.global).toBe('custom-global.db');
      expect(config.storage.databases.projects).toBe('custom-projects');
      expect(config.storage.backups.enabled).toBe(false);
      expect(config.storage.backups.retention).toBe(14);
      expect(config.logging.level).toBe('debug');
      expect(config.logging.file).toBe('custom.log');
    });

    it('should merge user config with defaults', async () => {
      const partialUserConfig = {
        logging: {
          level: 'debug',
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(partialUserConfig, null, 2));

      const config = await loadConfig();

      // User config should override
      expect(config.logging.level).toBe('debug');

      // Defaults should be preserved
      expect(config.storage.basePath).toBeDefined();
      expect(config.performance.cache.enabled).toBe(true);
      expect(config.security.encryption.enabled).toBe(false);
    });

    it('should handle invalid JSON gracefully', async () => {
      await fs.writeFile(testConfigPath, 'invalid json content');

      // Should fall back to defaults when JSON is invalid
      const config = await loadConfig();
      expect(config).toBeDefined();
      expect(config.logging.level).toBe('info'); // Default value
    });

    it('should handle file system errors gracefully', async () => {
      // Make config directory non-writable (on systems that support it)
      try {
        await fs.chmod(testConfigDir, 0o444);
      } catch (error) {
        // Some systems might not support chmod, skip this test
        return;
      }

      const config = await loadConfig();
      expect(config).toBeDefined();

      // Restore permissions for cleanup
      await fs.chmod(testConfigDir, 0o755);
    });
  });

  describe('Configuration Structure', () => {
    it('should have all required configuration sections', async () => {
      const config = await loadConfig();

      expect(config.storage).toBeDefined();
      expect(config.storage.basePath).toBeTypeOf('string');
      expect(config.storage.databases).toBeDefined();
      expect(config.storage.backups).toBeDefined();

      expect(config.performance).toBeDefined();
      expect(config.performance.cache).toBeDefined();
      expect(config.performance.database).toBeDefined();

      expect(config.security).toBeDefined();
      expect(config.security.encryption).toBeDefined();
      expect(config.security.accessControl).toBeDefined();

      expect(config.autoSave).toBeDefined();
      expect(config.autoSave.enabled).toBeTypeOf('boolean');
      expect(config.autoSave.interval).toBeTypeOf('number');
      expect(Array.isArray(config.autoSave.triggers)).toBe(true);

      expect(config.logging).toBeDefined();
      expect(config.logging.level).toBeTypeOf('string');
    });
  });
});
