import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPMemoryServer } from '../../server/MCPMemoryServer.js';
import { MCPMemoryClient } from '../../client/MCPMemoryClient.js';
import type { ServerConfig } from '../../types/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('MCP Server Integration Tests', () => {
  let server: MCPMemoryServer;
  let client: MCPMemoryClient;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;
  let testDir: string;
  
  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Create in-memory transport pair
    [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    
    // Configure server
    const config: ServerConfig = {
      storage: {
        basePath: testDir,
        globalDbPath: path.join(testDir, 'global.db'),
        projectsPath: path.join(testDir, 'projects')
      },
      performance: {
        enableCache: true,
        cacheSize: 100,
        cacheTTL: 5 * 60 * 1000
      },
      autoSave: {
        enabled: true,
        interval: 10,
        triggers: ['task_complete', 'test_pass']
      }
    };
    
    // Create and start server with transport
    server = new MCPMemoryServer(config);
    await server.start(serverTransport);
    
    // Create client with transport
    client = new MCPMemoryClient({
      transport: clientTransport
    });
    
    await client.connect();
  });
  
  afterEach(async () => {
    await client.disconnect();
    await server.stop();
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  describe('Global Preferences', () => {
    it('should save and retrieve global preferences', async () => {
      await client.saveGlobalPreference('editor', 'theme', 'dark');
      
      const value = await client.getGlobalPreference('editor', 'theme');
      expect(value).toBe('dark');
    });
    
    it('should get all preferences in a category', async () => {
      await client.saveGlobalPreference('editor', 'theme', 'dark');
      await client.saveGlobalPreference('editor', 'fontSize', '14');
      
      const prefs = await client.getGlobalPreference('editor');
      expect(prefs).toEqual({
        theme: 'dark',
        fontSize: '14'
      });
    });
    
    it('should get all global preferences', async () => {
      await client.saveGlobalPreference('editor', 'theme', 'dark');
      await client.saveGlobalPreference('git', 'autoCommit', 'true');
      
      const allPrefs = await client.getAllGlobalPreferences();
      expect(allPrefs).toHaveProperty('editor');
      expect(allPrefs).toHaveProperty('git');
      expect(allPrefs.editor).toEqual({ theme: 'dark' });
      expect(allPrefs.git).toEqual({ autoCommit: 'true' });
    });
    
    it('should delete specific preference', async () => {
      await client.saveGlobalPreference('editor', 'theme', 'dark');
      await client.deleteGlobalPreference('editor', 'theme');
      
      const value = await client.getGlobalPreference('editor', 'theme');
      expect(value).toBeNull();
    });
    
    it('should delete all preferences in category', async () => {
      await client.saveGlobalPreference('editor', 'theme', 'dark');
      await client.saveGlobalPreference('editor', 'fontSize', '14');
      await client.deleteGlobalPreference('editor');
      
      const prefs = await client.getGlobalPreference('editor');
      expect(prefs).toBeNull();
    });
  });
  
  describe('Project Context', () => {
    const projectPath = '/test/project';
    
    it('should save and retrieve project context', async () => {
      const context = {
        path: projectPath,
        name: 'Test Project',
        description: 'A test project',
        techStack: ['Node.js', 'TypeScript']
      };
      
      await client.saveProjectContext(projectPath, context);
      const retrieved = await client.getProjectContext(projectPath);
      
      expect(retrieved).toMatchObject(context);
    });
    
    it('should list all projects', async () => {
      await client.saveProjectContext('/project1', { path: '/project1' });
      await client.saveProjectContext('/project2', { path: '/project2' });
      
      const projects = await client.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.path)).toContain('/project1');
      expect(projects.map(p => p.path)).toContain('/project2');
    });
    
    it('should delete project and all its data', async () => {
      await client.saveProjectContext(projectPath, { path: projectPath });
      await client.deleteProject(projectPath);
      
      const context = await client.getProjectContext(projectPath);
      expect(context).toBeNull();
    });
  });
  
  describe('Issue Context', () => {
    const projectPath = '/test/project';
    const issue = {
      id: '123',
      title: 'Test Issue',
      description: 'Test description',
      requirements: ['req1', 'req2']
    };
    
    it('should save and retrieve issue context', async () => {
      // First create project
      await client.saveProjectContext(projectPath, { path: projectPath });
      
      await client.saveIssueContext(projectPath, issue);
      const retrieved = await client.getIssueContext(projectPath);
      
      expect(retrieved).toMatchObject(issue);
    });
  });
  
  describe('Task Management', () => {
    const projectPath = '/test/project';
    const tasks = {
      tasks: [
        { id: '1', title: 'Task 1', status: 'pending' as const },
        { id: '2', title: 'Task 2', status: 'in_progress' as const }
      ]
    };
    
    it('should save and retrieve tasks', async () => {
      await client.saveProjectContext(projectPath, { path: projectPath });
      
      await client.saveTasks(projectPath, tasks);
      const retrieved = await client.getTasks(projectPath);
      
      expect(retrieved).toMatchObject(tasks);
    });
    
    it('should update task status', async () => {
      await client.saveProjectContext(projectPath, { path: projectPath });
      await client.saveTasks(projectPath, tasks);
      
      await client.updateTaskStatus(projectPath, '1', 'completed');
      
      const retrieved = await client.getTasks(projectPath);
      const task = retrieved?.tasks.find(t => t.id === '1');
      expect(task?.status).toBe('completed');
    });
  });
  
  describe('Session State', () => {
    const projectPath = '/test/project';
    const session = {
      currentBranch: 'feature/test',
      lastActivity: new Date().toISOString(),
      modifiedFiles: ['file1.ts', 'file2.ts']
    };
    
    it('should save and retrieve session state', async () => {
      await client.saveProjectContext(projectPath, { path: projectPath });
      
      await client.saveSessionState(projectPath, session);
      const retrieved = await client.getSessionState(projectPath);
      
      expect(retrieved).toMatchObject(session);
    });
  });
  
  describe('Checkpoints', () => {
    const projectPath = '/test/project';
    
    beforeEach(async () => {
      // Create project with some data
      await client.saveProjectContext(projectPath, {
        path: projectPath,
        name: 'Test Project'
      });
      await client.saveIssueContext(projectPath, {
        id: '123',
        title: 'Original Issue'
      });
    });
    
    it('should create checkpoint', async () => {
      const checkpoint = await client.createCheckpoint(projectPath, 'Test checkpoint');
      
      expect(checkpoint).toHaveProperty('id');
      expect(checkpoint.name).toBe('Test checkpoint');
    });
    
    it('should list checkpoints', async () => {
      await client.createCheckpoint(projectPath, 'Checkpoint 1');
      await client.createCheckpoint(projectPath, 'Checkpoint 2');
      
      const checkpoints = await client.listCheckpoints(projectPath);
      expect(checkpoints).toHaveLength(2);
      expect(checkpoints[0].name).toBe('Checkpoint 2'); // Most recent first
    });
    
    it('should restore checkpoint', async () => {
      // Create initial checkpoint
      const checkpoint1 = await client.createCheckpoint(projectPath, 'Initial state');
      
      // Modify data
      await client.saveIssueContext(projectPath, {
        id: '456',
        title: 'Modified Issue'
      });
      
      // Verify modification
      let issue = await client.getIssueContext(projectPath);
      expect(issue?.title).toBe('Modified Issue');
      
      // Restore checkpoint
      await client.restoreCheckpoint(projectPath, checkpoint1.id);
      
      // Verify restoration
      issue = await client.getIssueContext(projectPath);
      expect(issue?.title).toBe('Original Issue');
    });
    
    it('should delete checkpoint', async () => {
      const checkpoint = await client.createCheckpoint(projectPath, 'Test checkpoint');
      
      await client.deleteCheckpoint(projectPath, checkpoint.id);
      
      const checkpoints = await client.listCheckpoints(projectPath);
      expect(checkpoints).toHaveLength(0);
    });
    
    it('should compare checkpoints', async () => {
      const checkpoint1 = await client.createCheckpoint(projectPath, 'State 1');
      
      // Modify data
      await client.saveIssueContext(projectPath, {
        id: '456',
        title: 'Modified Issue',
        description: 'New description'
      });
      
      const checkpoint2 = await client.createCheckpoint(projectPath, 'State 2');
      
      const diff = await client.compareCheckpoints(
        projectPath,
        checkpoint1.id,
        checkpoint2.id
      );
      
      expect(diff).toBeDefined();
      // The exact structure of diff depends on implementation
    });
  });
  
  describe('Export Functionality', () => {
    it('should export all memory in JSON format', async () => {
      await client.saveGlobalPreference('test', 'key', 'value');
      await client.saveProjectContext('/project1', { path: '/project1' });
      
      const exported = await client.exportMemory('json');
      const data = JSON.parse(exported);
      
      expect(data).toHaveProperty('global');
      expect(data).toHaveProperty('projects');
    });
    
    it('should export project memory in YAML format', async () => {
      const projectPath = '/test/project';
      await client.saveProjectContext(projectPath, {
        path: projectPath,
        name: 'Test Project'
      });
      
      const exported = await client.exportProjectMemory(projectPath, 'yaml');
      expect(exported).toContain('path: /test/project');
      expect(exported).toContain('name: Test Project');
    });
  });
  
  describe('Auto-Save Functionality', () => {
    const projectPath = '/test/project';
    
    beforeEach(async () => {
      await client.saveProjectContext(projectPath, { path: projectPath });
    });
    
    it('should register project for auto-save', async () => {
      await client.registerAutoSave(projectPath, {
        enabled: true,
        interval: 5,
        triggers: ['task_complete']
      });
      
      const status = await client.getAutoSaveStatus(projectPath);
      expect(status.config.enabled).toBe(true);
      expect(status.config.interval).toBe(5);
    });
    
    it('should trigger manual auto-save', async () => {
      await client.registerAutoSave(projectPath, {
        enabled: true,
        interval: 30,
        triggers: []
      });
      
      await client.triggerAutoSave(projectPath, 'manual');
      
      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const checkpoints = await client.listCheckpoints(projectPath);
      expect(checkpoints.length).toBeGreaterThan(0);
      expect(checkpoints[0].name).toContain('Auto-save: manual');
    });
    
    it('should unregister auto-save', async () => {
      await client.registerAutoSave(projectPath, {
        enabled: true,
        interval: 5,
        triggers: []
      });
      
      await client.unregisterAutoSave(projectPath);
      
      const status = await client.getAutoSaveStatus(projectPath);
      expect(status).toBeUndefined();
    });
    
    it('should save all projects', async () => {
      // Register multiple projects
      await client.saveProjectContext('/project1', { path: '/project1' });
      await client.saveProjectContext('/project2', { path: '/project2' });
      
      await client.registerAutoSave('/project1', {
        enabled: true,
        interval: 30,
        triggers: []
      });
      
      await client.registerAutoSave('/project2', {
        enabled: true,
        interval: 30,
        triggers: []
      });
      
      await client.saveAll();
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const checkpoints1 = await client.listCheckpoints('/project1');
      const checkpoints2 = await client.listCheckpoints('/project2');
      
      expect(checkpoints1.length).toBeGreaterThan(0);
      expect(checkpoints2.length).toBeGreaterThan(0);
    });
  });
  
  describe('Convenience Methods', () => {
    const projectPath = '/test/project';
    
    it('should quick save project data', async () => {
      await client.saveProjectContext(projectPath, { path: projectPath });
      
      await client.quickSave(projectPath, {
        issue: { id: '123', title: 'Test Issue' },
        tasks: { tasks: [{ id: '1', title: 'Task 1', status: 'pending' }] },
        session: { currentBranch: 'main' }
      });
      
      const context = await client.getProjectContext(projectPath);
      expect(context?.current_issue).toBeDefined();
      expect(context?.tasks).toBeDefined();
      expect(context?.session).toBeDefined();
    });
    
    it('should get current work state', async () => {
      await client.saveProjectContext(projectPath, { path: projectPath });
      await client.saveIssueContext(projectPath, { id: '123', title: 'Issue' });
      await client.saveTasks(projectPath, {
        tasks: [{ id: '1', title: 'Task', status: 'pending' }]
      });
      await client.createCheckpoint(projectPath, 'Test checkpoint');
      
      const state = await client.getCurrentWorkState(projectPath);
      
      expect(state.issue).toBeDefined();
      expect(state.tasks).toBeDefined();
      expect(state.lastCheckpoint).toBeDefined();
    });
    
    it('should batch save preferences', async () => {
      await client.batchSavePreferences([
        { category: 'editor', key: 'theme', value: 'dark' },
        { category: 'editor', key: 'fontSize', value: '14' },
        { category: 'git', key: 'autoCommit', value: 'true' }
      ]);
      
      const allPrefs = await client.getAllGlobalPreferences();
      expect(allPrefs.editor).toEqual({ theme: 'dark', fontSize: '14' });
      expect(allPrefs.git).toEqual({ autoCommit: 'true' });
    });
  });
  
  describe('Health Check', () => {
    it('should return true when server is healthy', async () => {
      const isHealthy = await client.ping();
      expect(isHealthy).toBe(true);
    });
    
    it('should return false when disconnected', async () => {
      await client.disconnect();
      const isHealthy = await client.ping();
      expect(isHealthy).toBe(false);
    });
  });
});