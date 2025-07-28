import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Test database paths
export const TEST_DB_DIR = path.join(os.tmpdir(), 'mcp-memory-server-test');
export const TEST_GLOBAL_DB = path.join(TEST_DB_DIR, 'test-global.db');
export const TEST_PROJECT_DB_DIR = path.join(TEST_DB_DIR, 'projects');

// Test configuration
export const TEST_CONFIG = {
  storage: {
    basePath: TEST_DB_DIR,
    databases: {
      global: 'test-global.db',
      projects: 'projects',
    },
    backups: {
      enabled: false,
      retention: 7,
      schedule: '0 2 * * *',
    },
  },
  performance: {
    cache: {
      enabled: false, // Disable cache for testing
      maxSize: 100,
      ttl: 10000,
    },
    database: {
      connectionPool: {
        min: 1,
        max: 2,
      },
      optimization: false, // Disable optimization for testing
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
    enabled: false, // Disable auto-save for testing
    interval: 1000,
    triggers: ['test_complete'],
  },
  logging: {
    level: 'silent', // Disable logging during tests
    file: 'test.log',
    maxSize: '1MB',
    maxFiles: 1,
  },
};

// Global setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';

  // Create test directories
  await fs.mkdir(TEST_DB_DIR, { recursive: true });
  await fs.mkdir(TEST_PROJECT_DB_DIR, { recursive: true });
});

// Global teardown
afterAll(async () => {
  // Clean up test databases
  try {
    await fs.rm(TEST_DB_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
    console.warn('Failed to clean up test directory:', error);
  }
});

// Test setup before each test
beforeEach(async () => {
  // Clean up any existing test databases
  try {
    const files = await fs.readdir(TEST_DB_DIR);
    for (const file of files) {
      if (file.endsWith('.db') || file.endsWith('.db-wal') || file.endsWith('.db-shm')) {
        await fs.unlink(path.join(TEST_DB_DIR, file));
      }
    }

    // Clean up project databases
    const projectFiles = await fs.readdir(TEST_PROJECT_DB_DIR);
    for (const file of projectFiles) {
      await fs.unlink(path.join(TEST_PROJECT_DB_DIR, file));
    }
  } catch (error) {
    // Directory might not exist, ignore
  }
});

// Test cleanup after each test
afterEach(async () => {
  // Additional cleanup if needed
});

// Test utilities
export const createTestProjectPath = (name: string): string => {
  return path.join(os.tmpdir(), 'test-projects', name);
};

export const waitFor = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const createMockGlobalPreference = () => ({
  category: 'test',
  key: 'preference',
  value: 'test-value',
  type: 'string' as const,
});

export const createMockProjectContext = () => ({
  current_issue: {
    number: 123,
    title: 'Test Issue',
    requirements: ['Requirement 1', 'Requirement 2'],
    design_decisions: ['Decision 1'],
  },
  tasks: {
    completed: [],
    in_progress: null,
    pending: [
      {
        id: '1',
        description: 'Test task',
        status: 'pending' as const,
        priority: 1,
        created_at: new Date(),
      },
    ],
  },
  checkpoint: {
    id: 'checkpoint-1',
    timestamp: new Date(),
    branch: 'main',
    last_command: 'npm test',
    next_action: 'Continue development',
  },
});

// Mock data generators
export const generateMockTask = (overrides?: Partial<any>) => ({
  id: `task-${Date.now()}`,
  description: 'Mock task description',
  status: 'pending',
  priority: 1,
  created_at: new Date(),
  ...overrides,
});

export const generateMockCheckpoint = (overrides?: Partial<any>) => ({
  id: `checkpoint-${Date.now()}`,
  name: 'Mock checkpoint',
  timestamp: new Date(),
  branch: 'main',
  last_command: 'npm test',
  next_action: 'Continue development',
  snapshot_data: '{}',
  ...overrides,
});
