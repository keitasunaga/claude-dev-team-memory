import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { GlobalRepository } from '../../repositories/GlobalRepository.js';
import { ProjectRepository } from '../../repositories/ProjectRepository.js';
import { CheckpointRepository } from '../../repositories/CheckpointRepository.js';
import { DatabaseManager } from '../../db/DatabaseManager.js';
import type { ServerConfig } from '../../types/index.js';

// Test database path
const TEST_DB_DIR = join(process.cwd(), '.test-db');
const GLOBAL_DB_PATH = join(TEST_DB_DIR, 'global.db');
const PROJECT_DB_PATH = join(TEST_DB_DIR, 'project.db');

// Test configuration
const testConfig: ServerConfig = {
  storage: {
    basePath: TEST_DB_DIR,
    databases: {
      global: 'global.db',
      projects: 'projects'
    },
    backups: {
      enabled: false,
      retention: 7,
      schedule: '0 0 * * *'
    }
  },
  performance: {
    cache: {
      enabled: true,
      maxSize: 100,
      ttl: 5000
    },
    database: {
      connectionPool: {
        min: 1,
        max: 5
      },
      optimization: false // Disable for tests
    }
  },
  security: {
    encryption: {
      enabled: false,
      algorithm: 'aes-256-gcm'
    },
    accessControl: {
      enabled: false,
      allowedPaths: []
    }
  },
  autoSave: {
    enabled: false,
    interval: 300000,
    triggers: []
  },
  logging: {
    level: 'error',
    file: '',
    maxSize: '10m',
    maxFiles: 5
  }
};

describe('Repository Integration Tests', () => {
  let dbManager: DatabaseManager;
  let globalDb: Database.Database;
  let projectDb: Database.Database;

  beforeEach(async () => {
    // Create test directory
    if (!existsSync(TEST_DB_DIR)) {
      mkdirSync(TEST_DB_DIR, { recursive: true });
    }

    // Initialize database manager
    dbManager = new DatabaseManager(testConfig);

    // Create databases
    globalDb = new Database(GLOBAL_DB_PATH);
    projectDb = new Database(PROJECT_DB_PATH);

    // Run migrations
    await runTestMigrations(globalDb, 'global');
    await runTestMigrations(projectDb, 'project');
  });

  afterEach(() => {
    // Close databases
    globalDb.close();
    projectDb.close();
    dbManager.close();

    // Clean up test directory
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    }
  });

  describe('GlobalRepository', () => {
    let globalRepo: GlobalRepository;

    beforeEach(() => {
      const db = drizzle(globalDb);
      globalRepo = new GlobalRepository(db);
    });

    it('should save and retrieve preferences', async () => {
      await globalRepo.savePreference('user_preferences', 'language', 'en');
      
      const result = await globalRepo.getPreference('user_preferences', 'language');
      expect(result).toBe('en');
    });

    it('should update existing preferences', async () => {
      await globalRepo.savePreference('user_preferences', 'language', 'en');
      await globalRepo.savePreference('user_preferences', 'language', 'fr');
      
      const result = await globalRepo.getPreference('user_preferences', 'language');
      expect(result).toBe('fr');
    });

    it('should retrieve all preferences in a category', async () => {
      await globalRepo.savePreference('user_preferences', 'language', 'en');
      await globalRepo.savePreference('user_preferences', 'theme', 'dark');
      
      const result = await globalRepo.getPreference('user_preferences');
      expect(result).toEqual({
        language: 'en',
        theme: 'dark'
      });
    });

    it('should retrieve all global preferences', async () => {
      await globalRepo.savePreference('user_preferences', 'language', 'en');
      await globalRepo.savePreference('development_style', 'branch_strategy', 'feature');
      await globalRepo.savePreference('communication_style', 'response', 'concise');
      
      const result = await globalRepo.getAllPreferences();
      
      expect(result.user_preferences).toEqual({ language: 'en' });
      expect(result.development_style).toEqual({ branch_strategy: 'feature' });
      expect(result.communication_style).toEqual({ response: 'concise' });
    });

    it('should delete specific preference', async () => {
      await globalRepo.savePreference('user_preferences', 'language', 'en');
      await globalRepo.deletePreference('user_preferences', 'language');
      
      const result = await globalRepo.getPreference('user_preferences', 'language');
      expect(result).toBeNull();
    });

    it('should delete all preferences in a category', async () => {
      await globalRepo.savePreference('user_preferences', 'language', 'en');
      await globalRepo.savePreference('user_preferences', 'theme', 'dark');
      await globalRepo.deletePreference('user_preferences');
      
      const result = await globalRepo.getPreference('user_preferences');
      expect(result).toEqual({});
    });

    it('should handle different data types', async () => {
      await globalRepo.savePreference('test', 'string', 'value', 'string');
      await globalRepo.savePreference('test', 'number', '42', 'number');
      await globalRepo.savePreference('test', 'boolean', 'true', 'boolean');
      await globalRepo.savePreference('test', 'json', '{"key":"value"}', 'json');
      
      const result = await globalRepo.getPreference('test');
      expect(result.string).toBe('value');
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.json).toEqual({ key: 'value' });
    });
  });

  describe('ProjectRepository', () => {
    let projectRepo: ProjectRepository;

    beforeEach(() => {
      const db = drizzle(projectDb);
      projectRepo = new ProjectRepository(db);
    });

    it('should create and retrieve project', async () => {
      const project = await projectRepo.createProject('/test/project', 'Test Project');
      
      expect(project.project_path).toBe('/test/project');
      expect(project.project_name).toBe('Test Project');
      
      const retrieved = await projectRepo.getProject('/test/project');
      expect(retrieved).toBeTruthy();
      expect(retrieved?.project_path).toBe('/test/project');
    });

    it('should not create duplicate projects', async () => {
      await projectRepo.createProject('/test/project', 'Test Project');
      const second = await projectRepo.createProject('/test/project', 'Test Project 2');
      
      // Should return existing project with updated last_accessed
      expect(second.project_name).toBe('Test Project');
    });

    it('should list all projects', async () => {
      await projectRepo.createProject('/test/project1', 'Project 1');
      await projectRepo.createProject('/test/project2', 'Project 2');
      
      const projects = await projectRepo.listProjects();
      expect(projects).toHaveLength(2);
    });

    it('should save and retrieve issue context', async () => {
      const project = await projectRepo.createProject('/test/project', 'Test Project');
      
      await projectRepo.saveIssue(project.id, {
        issue_number: 42,
        title: 'Test Issue',
        requirements: JSON.stringify(['req1', 'req2']),
        design_decisions: JSON.stringify(['decision1'])
      });
      
      const issue = await projectRepo.getIssue(project.id);
      expect(issue).toBeTruthy();
      expect(issue?.issue_number).toBe(42);
      expect(issue?.title).toBe('Test Issue');
    });

    it('should save and retrieve tasks', async () => {
      const project = await projectRepo.createProject('/test/project', 'Test Project');
      
      const tasks = [
        {
          project_id: project.id,
          task_description: 'Task 1',
          status: 'pending' as const,
          priority: 1
        },
        {
          project_id: project.id,
          task_description: 'Task 2',
          status: 'completed' as const,
          priority: 2,
          completed_at: new Date().toISOString()
        }
      ];
      
      await projectRepo.saveTasks(project.id, tasks as any);
      
      const retrieved = await projectRepo.getTasks(project.id);
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].task_description).toBe('Task 1');
      expect(retrieved[1].status).toBe('completed');
    });

    it('should update task status', async () => {
      const project = await projectRepo.createProject('/test/project', 'Test Project');
      
      await projectRepo.saveTasks(project.id, [{
        project_id: project.id,
        task_description: 'Task 1',
        status: 'pending' as const,
        priority: 1
      }] as any);
      
      const tasks = await projectRepo.getTasks(project.id);
      await projectRepo.updateTask(tasks[0].id, { status: 'completed' });
      
      const updated = await projectRepo.getTasks(project.id);
      expect(updated[0].status).toBe('completed');
      expect(updated[0].completed_at).toBeTruthy();
    });

    it('should save and retrieve session state', async () => {
      const project = await projectRepo.createProject('/test/project', 'Test Project');
      
      await projectRepo.saveSession(project.id, {
        current_task: 'Implementing feature',
        branch: 'feature/test',
        modified_files: JSON.stringify(['file1.ts', 'file2.ts']),
        last_checkpoint: new Date().toISOString()
      });
      
      const session = await projectRepo.getSession(project.id);
      expect(session).toBeTruthy();
      expect(session?.current_task).toBe('Implementing feature');
      expect(session?.branch).toBe('feature/test');
    });

    it('should delete project and cascade delete related data', async () => {
      const project = await projectRepo.createProject('/test/project', 'Test Project');
      
      // Add related data
      await projectRepo.saveIssue(project.id, {
        issue_number: 42,
        title: 'Test Issue'
      });
      await projectRepo.saveTasks(project.id, [{
        project_id: project.id,
        task_description: 'Task 1',
        status: 'pending' as const
      }] as any);
      
      // Delete project
      await projectRepo.deleteProject('/test/project');
      
      // Verify project is deleted
      const deleted = await projectRepo.getProject('/test/project');
      expect(deleted).toBeNull();
      
      // Verify related data is also deleted
      const issue = await projectRepo.getIssue(project.id);
      expect(issue).toBeNull();
      
      const tasks = await projectRepo.getTasks(project.id);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('CheckpointRepository', () => {
    let checkpointRepo: CheckpointRepository;
    let projectRepo: ProjectRepository;
    let projectId: number;

    beforeEach(async () => {
      const db = drizzle(projectDb);
      checkpointRepo = new CheckpointRepository(db);
      projectRepo = new ProjectRepository(db);
      
      // Create a project for checkpoints
      const project = await projectRepo.createProject('/test/project', 'Test Project');
      projectId = project.id;
    });

    it('should create and retrieve checkpoint', async () => {
      const snapshotData = {
        projectPath: '/test/project',
        timestamp: new Date().toISOString(),
        context: {
          issue: { number: 42, title: 'Test' },
          tasks: { completed: [], in_progress: null, pending: [] }
        }
      };
      
      const checkpoint = await checkpointRepo.createCheckpoint(
        projectId,
        'Test Checkpoint',
        snapshotData,
        'main',
        'git commit',
        'Continue work'
      );
      
      expect(checkpoint.checkpoint_name).toBe('Test Checkpoint');
      expect(checkpoint.branch_name).toBe('main');
      
      const retrieved = await checkpointRepo.findById(checkpoint.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.checkpoint_name).toBe('Test Checkpoint');
    });

    it('should list checkpoints by project', async () => {
      const snapshotData = { test: 'data' };
      
      await checkpointRepo.createCheckpoint(projectId, 'Checkpoint 1', snapshotData);
      await checkpointRepo.createCheckpoint(projectId, 'Checkpoint 2', snapshotData);
      
      const checkpoints = await checkpointRepo.findByProjectId(projectId);
      expect(checkpoints).toHaveLength(2);
      expect(checkpoints[0].checkpoint_name).toBe('Checkpoint 2'); // Ordered by created_at DESC
    });

    it('should get latest checkpoint', async () => {
      const snapshotData = { test: 'data' };
      
      await checkpointRepo.createCheckpoint(projectId, 'Old Checkpoint', snapshotData);
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      await checkpointRepo.createCheckpoint(projectId, 'Latest Checkpoint', snapshotData);
      
      const latest = await checkpointRepo.getLatestCheckpoint(projectId);
      expect(latest?.checkpoint_name).toBe('Latest Checkpoint');
    });

    it('should validate checkpoint data', async () => {
      const validData = { test: 'data' };
      const checkpoint = await checkpointRepo.createCheckpoint(projectId, 'Valid', validData);
      
      const isValid = await checkpointRepo.validateCheckpoint(checkpoint);
      expect(isValid).toBe(true);
      
      // Test with invalid JSON
      const invalidCheckpoint = {
        ...checkpoint,
        snapshot_data: 'invalid json'
      };
      
      const isInvalid = await checkpointRepo.validateCheckpoint(invalidCheckpoint);
      expect(isInvalid).toBe(false);
    });

    it('should delete checkpoint', async () => {
      const checkpoint = await checkpointRepo.createCheckpoint(
        projectId,
        'To Delete',
        { test: 'data' }
      );
      
      const deleted = await checkpointRepo.delete(checkpoint.id);
      expect(deleted).toBe(true);
      
      const retrieved = await checkpointRepo.findById(checkpoint.id);
      expect(retrieved).toBeNull();
    });
  });
});

// Helper function to run test migrations
async function runTestMigrations(db: Database.Database, type: 'global' | 'project') {
  if (type === 'global') {
    // Create global tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS global_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'string',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS global_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        last_migration INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    // Create project tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_path TEXT NOT NULL UNIQUE,
        project_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_accessed TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS current_issue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES project_info(id),
        issue_number INTEGER,
        title TEXT,
        requirements TEXT,
        design_decisions TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES project_info(id),
        task_description TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
        priority INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES project_info(id),
        checkpoint_name TEXT,
        branch_name TEXT,
        last_command TEXT,
        next_action TEXT,
        snapshot_data TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS session_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES project_info(id),
        current_task TEXT,
        branch TEXT,
        modified_files TEXT,
        last_checkpoint TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
}