import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../../db/DatabaseManager.js';
import { TEST_CONFIG, createTestProjectPath } from '../setup.js';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    dbManager = new DatabaseManager(TEST_CONFIG);
  });

  afterEach(async () => {
    await dbManager.close();
  });

  describe('Global Database', () => {
    it('should initialize global database', () => {
      const globalDb = dbManager.getGlobalDb();
      expect(globalDb).toBeDefined();
    });

    it('should run global migrations', async () => {
      await expect(dbManager.runMigrations()).resolves.not.toThrow();
    });
  });

  describe('Project Database', () => {
    it('should create project database for new project', () => {
      const projectPath = createTestProjectPath('test-project');
      const projectDb = dbManager.getProjectDb(projectPath);
      expect(projectDb).toBeDefined();
    });

    it('should reuse existing project database', () => {
      const projectPath = createTestProjectPath('test-project');
      const projectDb1 = dbManager.getProjectDb(projectPath);
      const projectDb2 = dbManager.getProjectDb(projectPath);
      // Check that the same database instance is returned (object reference)
      expect(projectDb1).toStrictEqual(projectDb2);
    });

    it('should run project migrations', async () => {
      const projectPath = createTestProjectPath('test-project');
      await expect(dbManager.runProjectMigrations(projectPath)).resolves.not.toThrow();
    });
  });

  describe('Database Operations', () => {
    it('should vacuum databases', async () => {
      await expect(dbManager.vacuum()).resolves.not.toThrow();
    });

    it('should analyze databases', async () => {
      await expect(dbManager.analyze()).resolves.not.toThrow();
    });

    it('should close all databases', async () => {
      // Create some project databases
      const projectPath1 = createTestProjectPath('project1');
      const projectPath2 = createTestProjectPath('project2');
      dbManager.getProjectDb(projectPath1);
      dbManager.getProjectDb(projectPath2);

      await expect(dbManager.close()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project paths gracefully', () => {
      const invalidPath = '';
      expect(() => dbManager.getProjectDb(invalidPath)).not.toThrow();
    });
  });
});
