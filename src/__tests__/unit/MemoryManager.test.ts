import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { MemoryManager } from '../../services/MemoryManager.js';
import type {
  GlobalMemory,
  ProjectMemory,
  IssueContext,
  TaskList,
  SessionState,
  ProjectInfo
} from '../../types/index.js';

// Mock the repositories
vi.mock('../../repositories/GlobalRepository.js', () => ({
  GlobalRepository: vi.fn().mockImplementation(() => ({
    savePreference: vi.fn(),
    getPreference: vi.fn(),
    getAllPreferences: vi.fn(),
    deletePreference: vi.fn(),
  }))
}));

vi.mock('../../repositories/ProjectRepository.js', () => ({
  ProjectRepository: vi.fn().mockImplementation(() => ({
    createProject: vi.fn(),
    getProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    listProjects: vi.fn(),
    saveIssue: vi.fn(),
    getIssue: vi.fn(),
    saveTasks: vi.fn(),
    getTasks: vi.fn(),
    updateTask: vi.fn(),
    saveSession: vi.fn(),
    getSession: vi.fn(),
  }))
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let mockDbManager: any;
  let mockGlobalRepo: any;
  let mockProjectRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database manager
    mockDbManager = {
      getGlobalDb: vi.fn().mockReturnValue({}),
      getProjectDb: vi.fn().mockReturnValue({}),
    };

    // Create memory manager (this will create repo instances via mocked constructors)
    memoryManager = new MemoryManager(mockDbManager, { enableCache: true });

    // Get references to the mocked repo instances
    mockGlobalRepo = (memoryManager as any).globalRepo;
    mockProjectRepo = mockGlobalRepo; // We'll override this per test as needed
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Global Preferences', () => {
    it('should save global preference', async () => {
      await memoryManager.saveGlobalPreference('user_preferences', 'language', 'en');

      expect(mockGlobalRepo.savePreference).toHaveBeenCalledWith(
        'user_preferences',
        'language',
        'en'
      );
    });

    it('should get global preference by key', async () => {
      mockGlobalRepo.getPreference.mockResolvedValue('en');

      const result = await memoryManager.getGlobalPreference('user_preferences', 'language');

      expect(result).toBe('en');
      expect(mockGlobalRepo.getPreference).toHaveBeenCalledWith('user_preferences', 'language');
    });

    it('should get all preferences in a category', async () => {
      const mockPreferences = {
        language: 'en',
        theme: 'dark'
      };
      mockGlobalRepo.getPreference.mockResolvedValue(mockPreferences);

      const result = await memoryManager.getGlobalPreference('user_preferences');

      expect(result).toEqual(mockPreferences);
      expect(mockGlobalRepo.getPreference).toHaveBeenCalledWith('user_preferences', undefined);
    });

    it('should get all global preferences', async () => {
      const mockGlobalMemory: GlobalMemory = {
        user_preferences: { language: 'en' },
        development_style: { branch_strategy: 'feature' },
        communication_style: { response: 'concise' }
      };
      mockGlobalRepo.getAllPreferences.mockResolvedValue(mockGlobalMemory);

      const result = await memoryManager.getAllGlobalPreferences();

      expect(result).toEqual(mockGlobalMemory);
      expect(mockGlobalRepo.getAllPreferences).toHaveBeenCalled();
    });

    it('should delete global preference', async () => {
      await memoryManager.deleteGlobalPreference('user_preferences', 'language');

      expect(mockGlobalRepo.deletePreference).toHaveBeenCalledWith('user_preferences', 'language');
    });
  });

  describe('Project Context', () => {
    const mockProjectInfo: ProjectInfo = {
      id: 1,
      project_path: '/test/project',
      project_name: 'project',
      created_at: new Date(),
      last_accessed: new Date()
    };

    beforeEach(() => {
      // Get the project repo that will be created for this project path
      mockProjectRepo = {
        createProject: vi.fn().mockResolvedValue(mockProjectInfo),
        getProject: vi.fn().mockResolvedValue(mockProjectInfo),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        listProjects: vi.fn(),
        saveIssue: vi.fn(),
        getIssue: vi.fn(),
        saveTasks: vi.fn(),
        getTasks: vi.fn(),
        updateTask: vi.fn(),
        saveSession: vi.fn(),
        getSession: vi.fn(),
      };
      // Override getProjectRepo to return our mock
      (memoryManager as any).projectRepos.set('/test/project', mockProjectRepo);
    });

    it('should save project context', async () => {
      const context: Partial<ProjectMemory> = {
        current_issue: {
          number: 42,
          title: 'Test Issue',
          requirements: ['req1'],
          design_decisions: ['decision1']
        }
      };

      await memoryManager.saveProjectContext('/test/project', context);

      expect(mockProjectRepo.createProject).toHaveBeenCalledWith('/test/project', 'project');
    });

    it('should get project context', async () => {
      mockProjectRepo.getIssue.mockResolvedValue(null);
      mockProjectRepo.getTasks.mockResolvedValue([]);
      mockProjectRepo.getSession.mockResolvedValue(null);

      const result = await memoryManager.getProjectContext('/test/project');

      expect(result).toBeDefined();
      expect(result?.path).toBe('/test/project');
      expect(mockProjectRepo.getProject).toHaveBeenCalledWith('/test/project');
    });

    it('should list projects', async () => {
      const mockProjects: ProjectInfo[] = [mockProjectInfo];
      mockProjectRepo.listProjects.mockResolvedValue(mockProjects);

      const result = await memoryManager.listProjects();

      expect(result).toEqual(mockProjects);
    });

    it('should delete project', async () => {
      await memoryManager.deleteProject('/test/project');

      expect(mockProjectRepo.deleteProject).toHaveBeenCalledWith('/test/project');
    });
  });

  describe('Issue Context', () => {
    const mockIssue: IssueContext = {
      number: 42,
      title: 'Test Issue',
      requirements: ['req1', 'req2'],
      design_decisions: ['decision1']
    };

    beforeEach(() => {
      mockProjectRepo = {
        createProject: vi.fn(),
        getProject: vi.fn().mockResolvedValue({
          id: 1,
          project_path: '/test/project',
          project_name: 'project',
          created_at: new Date(),
          last_accessed: new Date()
        }),
        saveIssue: vi.fn(),
        getIssue: vi.fn(),
      };
      (memoryManager as any).projectRepos.set('/test/project', mockProjectRepo);
    });

    it('should save issue context', async () => {
      await memoryManager.saveIssueContext('/test/project', mockIssue);

      expect(mockProjectRepo.saveIssue).toHaveBeenCalledWith(1, {
        issue_number: 42,
        title: 'Test Issue',
        requirements: JSON.stringify(['req1', 'req2']),
        design_decisions: JSON.stringify(['decision1'])
      });
    });

    it('should get issue context', async () => {
      mockProjectRepo.getIssue.mockResolvedValue({
        id: 1,
        project_id: 1,
        issue_number: 42,
        title: 'Test Issue',
        requirements: JSON.stringify(['req1', 'req2']),
        design_decisions: JSON.stringify(['decision1']),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await memoryManager.getIssueContext('/test/project');

      expect(result).toEqual(mockIssue);
    });
  });

  describe('Task Management', () => {
    const mockTaskList: TaskList = {
      completed: [{
        id: '1',
        description: 'Completed task',
        status: 'completed',
        priority: 1,
        created_at: new Date()
      }],
      in_progress: {
        id: '2',
        description: 'In progress task',
        status: 'in_progress',
        priority: 2,
        created_at: new Date()
      },
      pending: [{
        id: '3',
        description: 'Pending task',
        status: 'pending',
        priority: 3,
        created_at: new Date()
      }]
    };

    beforeEach(() => {
      mockProjectRepo = {
        getProject: vi.fn().mockResolvedValue({
          id: 1,
          project_path: '/test/project',
          project_name: 'project',
          created_at: new Date(),
          last_accessed: new Date()
        }),
        saveTasks: vi.fn(),
        getTasks: vi.fn(),
        updateTask: vi.fn(),
        createProject: vi.fn(),
      };
      (memoryManager as any).projectRepos.set('/test/project', mockProjectRepo);
    });

    it('should save tasks', async () => {
      await memoryManager.saveTasks('/test/project', mockTaskList);

      expect(mockProjectRepo.saveTasks).toHaveBeenCalled();
    });

    it('should get tasks', async () => {
      mockProjectRepo.getTasks.mockResolvedValue([
        {
          id: 1,
          project_id: 1,
          task_description: 'Completed task',
          status: 'completed',
          priority: 1,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        }
      ]);

      const result = await memoryManager.getTasks('/test/project');

      expect(result).toBeDefined();
      expect(result?.completed).toHaveLength(1);
    });

    it('should update task status', async () => {
      await memoryManager.updateTaskStatus('/test/project', '1', 'completed');

      expect(mockProjectRepo.updateTask).toHaveBeenCalledWith(1, { status: 'completed' });
    });
  });

  describe('Session State', () => {
    const mockSession: SessionState = {
      current_task: 'Implementing feature',
      branch: 'feature/test',
      modified_files: ['file1.ts', 'file2.ts'],
      last_checkpoint: new Date()
    };

    beforeEach(() => {
      mockProjectRepo = {
        getProject: vi.fn().mockResolvedValue({
          id: 1,
          project_path: '/test/project',
          project_name: 'project',
          created_at: new Date(),
          last_accessed: new Date()
        }),
        saveSession: vi.fn(),
        getSession: vi.fn(),
        createProject: vi.fn(),
      };
      (memoryManager as any).projectRepos.set('/test/project', mockProjectRepo);
    });

    it('should save session state', async () => {
      await memoryManager.saveSessionState('/test/project', mockSession);

      expect(mockProjectRepo.saveSession).toHaveBeenCalled();
    });

    it('should get session state', async () => {
      mockProjectRepo.getSession.mockResolvedValue({
        id: 1,
        project_id: 1,
        current_task: 'Implementing feature',
        branch: 'feature/test',
        modified_files: JSON.stringify(['file1.ts', 'file2.ts']),
        last_checkpoint: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await memoryManager.getSessionState('/test/project');

      expect(result).toBeDefined();
      expect(result?.current_task).toBe('Implementing feature');
      expect(result?.branch).toBe('feature/test');
    });
  });

  describe('Export Methods', () => {
    beforeEach(() => {
      mockProjectRepo = {
        listProjects: vi.fn().mockResolvedValue([]),
        getProject: vi.fn(),
        getIssue: vi.fn(),
        getTasks: vi.fn(),
        getSession: vi.fn(),
      };
      (memoryManager as any).projectRepos.set('/test/project', mockProjectRepo);
    });

    it('should export memory in JSON format', async () => {
      const mockGlobalMemory: GlobalMemory = {
        user_preferences: { language: 'en' },
        development_style: { branch_strategy: 'feature' },
        communication_style: { response: 'concise' }
      };
      
      mockGlobalRepo.getAllPreferences.mockResolvedValue(mockGlobalMemory);

      const result = await memoryManager.exportMemory('json');
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('global');
      expect(parsed).toHaveProperty('projects');
    });

    it('should export project memory in JSON format', async () => {
      mockProjectRepo.getProject.mockResolvedValue({
        id: 1,
        project_path: '/test/project',
        project_name: 'project',
        created_at: new Date(),
        last_accessed: new Date()
      });
      mockProjectRepo.getIssue.mockResolvedValue(null);
      mockProjectRepo.getTasks.mockResolvedValue([]);
      mockProjectRepo.getSession.mockResolvedValue(null);

      const result = await memoryManager.exportProjectMemory('/test/project', 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('project');
    });

    it('should throw error when exporting non-existent project', async () => {
      mockProjectRepo.getProject.mockResolvedValue(null);

      await expect(
        memoryManager.exportProjectMemory('/non-existent', 'json')
      ).rejects.toThrow('Project not found: /non-existent');
    });
  });

  describe('Caching', () => {
    it('should use cache for repeated global preference requests', async () => {
      mockGlobalRepo.getPreference.mockResolvedValue('en');

      // First call - should hit the repository
      await memoryManager.getGlobalPreference('user_preferences', 'language');
      expect(mockGlobalRepo.getPreference).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await memoryManager.getGlobalPreference('user_preferences', 'language');
      expect(mockGlobalRepo.getPreference).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when saving preferences', async () => {
      mockGlobalRepo.getPreference.mockResolvedValue('en');

      // Get preference (cached)
      await memoryManager.getGlobalPreference('user_preferences', 'language');
      
      // Save new preference (should invalidate cache)
      await memoryManager.saveGlobalPreference('user_preferences', 'language', 'fr');
      
      // Get preference again (should hit repository due to cache invalidation)
      mockGlobalRepo.getPreference.mockResolvedValue('fr');
      await memoryManager.getGlobalPreference('user_preferences', 'language');
      
      expect(mockGlobalRepo.getPreference).toHaveBeenCalledTimes(2);
    });
  });
});