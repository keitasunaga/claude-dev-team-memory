import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoSaveService, type AutoSaveConfig, type SaveEvent } from '../../services/AutoSaveService.js';
import type { IMemoryManager, ICheckpointManager, Checkpoint } from '../../types/index.js';

// Mock implementations
const mockMemoryManager: IMemoryManager = {
  saveGlobalPreference: vi.fn(),
  getGlobalPreference: vi.fn(),
  getAllGlobalPreferences: vi.fn(),
  deleteGlobalPreference: vi.fn(),
  saveProjectContext: vi.fn(),
  getProjectContext: vi.fn(),
  listProjects: vi.fn(),
  deleteProject: vi.fn(),
  saveIssueContext: vi.fn(),
  getIssueContext: vi.fn(),
  saveTasks: vi.fn(),
  getTasks: vi.fn(),
  updateTaskStatus: vi.fn(),
  saveSessionState: vi.fn(),
  getSessionState: vi.fn(),
  exportMemory: vi.fn(),
  exportProjectMemory: vi.fn(),
};

const mockCheckpointManager: ICheckpointManager = {
  createCheckpoint: vi.fn(),
  listCheckpoints: vi.fn(),
  restoreCheckpoint: vi.fn(),
  deleteCheckpoint: vi.fn(),
  compareCheckpoints: vi.fn(),
};

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('AutoSaveService', () => {
  let autoSaveService: AutoSaveService;
  let mockTimers: ReturnType<typeof vi.useFakeTimers>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTimers = vi.useFakeTimers();
    autoSaveService = new AutoSaveService(mockMemoryManager, mockCheckpointManager);
  });

  afterEach(() => {
    autoSaveService.stop();
    mockTimers.useRealTimers();
  });

  describe('Service Lifecycle', () => {
    it('should start and stop correctly', () => {
      autoSaveService.start();
      expect(autoSaveService).toBeDefined();
      
      autoSaveService.stop();
      // No errors should occur
    });
  });

  describe('Project Registration', () => {
    it('should register a project with auto-save config', () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 5, // 5 minutes
        triggers: ['task_complete', 'test_pass']
      };

      autoSaveService.registerProject('/test/project', config);
      
      const status = autoSaveService.getStatus('/test/project');
      expect(status.config).toEqual(config);
      expect(status.hasInterval).toBe(true);
    });

    it('should not create interval if auto-save is disabled', () => {
      const config: AutoSaveConfig = {
        enabled: false,
        interval: 5,
        triggers: []
      };

      autoSaveService.registerProject('/test/project', config);
      
      const status = autoSaveService.getStatus('/test/project');
      expect(status.hasInterval).toBe(false);
    });

    it('should unregister a project', () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 5,
        triggers: []
      };

      autoSaveService.registerProject('/test/project', config);
      autoSaveService.unregisterProject('/test/project');
      
      const status = autoSaveService.getStatus('/test/project');
      expect(status).toBeUndefined();
    });

    it('should replace existing registration', () => {
      const config1: AutoSaveConfig = {
        enabled: true,
        interval: 5,
        triggers: []
      };

      const config2: AutoSaveConfig = {
        enabled: true,
        interval: 10,
        triggers: ['task_complete']
      };

      autoSaveService.registerProject('/test/project', config1);
      autoSaveService.registerProject('/test/project', config2);
      
      const status = autoSaveService.getStatus('/test/project');
      expect(status).toBeDefined();
      expect(status.config.interval).toBe(10);
      expect(status.config.triggers).toEqual(['task_complete']);
    });
  });

  describe('Auto-Save Triggers', () => {
    it('should trigger save on interval', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 5, // 5 minutes
        triggers: []
      };

      vi.mocked(mockCheckpointManager.createCheckpoint).mockResolvedValue({
        id: '1',
        project_id: 1,
        name: 'test',
        timestamp: new Date(),
        snapshot_data: '{}',
        checksum: 'abc123'
      });

      autoSaveService.start();
      autoSaveService.registerProject('/test/project', config);

      // Fast-forward 5 minutes
      await mockTimers.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledWith(
        '/test/project',
        expect.stringContaining('Auto-save: interval')
      );
    });

    it('should trigger save on task complete event', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: ['task_complete']
      };

      vi.mocked(mockCheckpointManager.createCheckpoint).mockResolvedValue({
        id: '1',
        project_id: 1,
        name: 'test',
        timestamp: new Date(),
        snapshot_data: '{}',
        checksum: 'abc123'
      });

      autoSaveService.start();
      autoSaveService.registerProject('/test/project', config);

      const event: SaveEvent = {
        type: 'task_complete',
        projectPath: '/test/project'
      };

      await autoSaveService.triggerSave('/test/project', event);
      
      // Process queue
      await mockTimers.advanceTimersByTimeAsync(100);

      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledWith(
        '/test/project',
        expect.stringContaining('Auto-save: task_complete')
      );
    });

    it('should not trigger save if event type not in triggers', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: ['test_pass'] // Only test_pass is enabled
      };

      autoSaveService.registerProject('/test/project', config);

      const event: SaveEvent = {
        type: 'task_complete', // This is not in triggers
        projectPath: '/test/project'
      };

      await autoSaveService.triggerSave('/test/project', event);
      
      expect(mockCheckpointManager.createCheckpoint).not.toHaveBeenCalled();
    });

    it('should always allow manual triggers', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: [] // No triggers enabled
      };

      vi.mocked(mockCheckpointManager.createCheckpoint).mockResolvedValue({
        id: '1',
        project_id: 1,
        name: 'test',
        timestamp: new Date(),
        snapshot_data: '{}',
        checksum: 'abc123'
      });

      autoSaveService.start();
      autoSaveService.registerProject('/test/project', config);

      const event: SaveEvent = {
        type: 'manual',
        projectPath: '/test/project'
      };

      await autoSaveService.triggerSave('/test/project', event);
      
      // Process queue
      await mockTimers.advanceTimersByTimeAsync(100);

      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalled();
    });
  });

  describe('Save Queue Management', () => {
    it('should queue multiple saves', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: ['task_complete', 'test_pass']
      };

      // Mock createCheckpoint to succeed quickly
      vi.mocked(mockCheckpointManager.createCheckpoint).mockResolvedValue({
        id: '1',
        project_id: 1,
        name: 'test',
        timestamp: new Date(),
        snapshot_data: '{}',
        checksum: 'abc123'
      });

      autoSaveService.start();
      autoSaveService.registerProject('/test/project', config);

      // Check initial state
      let status = autoSaveService.getStatus('/test/project');
      expect(status.queueLength).toBe(0);

      // Trigger saves but don't wait for them to process yet
      autoSaveService.triggerSave('/test/project', {
        type: 'task_complete',
        projectPath: '/test/project'
      });
      
      autoSaveService.triggerSave('/test/project', {
        type: 'test_pass',
        projectPath: '/test/project'
      });

      // Check queue has items (may have 1 or 2 depending on timing)
      status = autoSaveService.getStatus('/test/project');
      expect(status.queueLength).toBeGreaterThan(0);

      // Process the queue by advancing timers
      await mockTimers.advanceTimersByTimeAsync(6000); // Let queue processor run

      // After processing, queue should be empty and saves completed
      const finalStatus = autoSaveService.getStatus('/test/project');
      expect(finalStatus.queueLength).toBe(0);
      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should process queued saves in order', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: ['task_complete']
      };

      let callCount = 0;
      vi.mocked(mockCheckpointManager.createCheckpoint).mockImplementation(async () => {
        callCount++;
        return {
          id: callCount.toString(),
          project_id: 1,
          name: `checkpoint-${callCount}`,
          timestamp: new Date(),
          snapshot_data: '{}',
          checksum: 'abc123'
        };
      });

      autoSaveService.start();
      autoSaveService.registerProject('/test/project', config);

      // Queue multiple events
      await autoSaveService.triggerSave('/test/project', {
        type: 'task_complete',
        projectPath: '/test/project',
        metadata: { order: 1 }
      });
      
      await autoSaveService.triggerSave('/test/project', {
        type: 'task_complete',
        projectPath: '/test/project',
        metadata: { order: 2 }
      });

      // Process queue
      await mockTimers.advanceTimersByTimeAsync(10000);

      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Retry', () => {
    it('should retry failed saves', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: ['task_complete'],
        maxRetries: 3,
        retryDelay: 100
      };

      let attemptCount = 0;
      vi.mocked(mockCheckpointManager.createCheckpoint).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Save failed');
        }
        return {
          id: '1',
          project_id: 1,
          name: 'test',
          timestamp: new Date(),
          snapshot_data: '{}',
          checksum: 'abc123'
        };
      });

      autoSaveService.start();
      autoSaveService.registerProject('/test/project', config);

      const savePromise = autoSaveService.triggerSave('/test/project', {
        type: 'task_complete',
        projectPath: '/test/project'
      });

      // Process the save with retries
      // First attempt fails immediately
      await mockTimers.advanceTimersByTimeAsync(0);
      
      // Wait for first retry (100ms * 1)
      await mockTimers.advanceTimersByTimeAsync(100);
      
      // Wait for second retry (100ms * 2)
      await mockTimers.advanceTimersByTimeAsync(200);
      
      // Wait for queue processor
      await mockTimers.advanceTimersByTimeAsync(5000);

      // Wait for the save promise to complete
      await savePromise;

      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledTimes(3);
      expect(attemptCount).toBe(3);
    });

    it('should disable auto-save after repeated failures', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: ['task_complete'],
        maxRetries: 1,
        retryDelay: 100
      };

      vi.mocked(mockCheckpointManager.createCheckpoint).mockRejectedValue(new Error('Always fails'));

      autoSaveService.start();
      autoSaveService.registerProject('/test/project', config);

      // Trigger 5 saves that will all fail
      for (let i = 0; i < 5; i++) {
        await autoSaveService.triggerSave('/test/project', {
          type: 'task_complete',
          projectPath: '/test/project'
        });
        await mockTimers.advanceTimersByTimeAsync(1000);
      }

      const status = autoSaveService.getStatus('/test/project');
      expect(status.config.enabled).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should update interval for all projects', () => {
      const config1: AutoSaveConfig = {
        enabled: true,
        interval: 5,
        triggers: []
      };

      const config2: AutoSaveConfig = {
        enabled: true,
        interval: 5,
        triggers: []
      };

      autoSaveService.registerProject('/project1', { ...config1 });
      autoSaveService.registerProject('/project2', { ...config2 });

      // Verify initial state
      let status1 = autoSaveService.getStatus('/project1');
      let status2 = autoSaveService.getStatus('/project2');
      expect(status1).toBeDefined();
      expect(status2).toBeDefined();
      expect(status1.config.interval).toBe(5);
      expect(status2.config.interval).toBe(5);

      // Update interval
      autoSaveService.setInterval(10);

      // Check updated state
      status1 = autoSaveService.getStatus('/project1');
      status2 = autoSaveService.getStatus('/project2');

      expect(status1).toBeDefined();
      expect(status2).toBeDefined();
      expect(status1.config.interval).toBe(10);
      expect(status2.config.interval).toBe(10);
      expect(status1.hasInterval).toBe(true);
      expect(status2.hasInterval).toBe(true);
    });

    it('should save all projects', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: []
      };

      vi.mocked(mockCheckpointManager.createCheckpoint).mockResolvedValue({
        id: '1',
        project_id: 1,
        name: 'test',
        timestamp: new Date(),
        snapshot_data: '{}',
        checksum: 'abc123'
      });

      autoSaveService.start();
      autoSaveService.registerProject('/project1', config);
      autoSaveService.registerProject('/project2', config);

      await autoSaveService.saveAll();
      
      // Process queue
      await mockTimers.advanceTimersByTimeAsync(10000);

      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledTimes(2);
      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledWith(
        '/project1',
        expect.any(String)
      );
      expect(mockCheckpointManager.createCheckpoint).toHaveBeenCalledWith(
        '/project2',
        expect.any(String)
      );
    });

    it('should return status for all projects', () => {
      const config: AutoSaveConfig = {
        enabled: true,
        interval: 30,
        triggers: []
      };

      autoSaveService.registerProject('/project1', config);
      autoSaveService.registerProject('/project2', config);

      const allStatus = autoSaveService.getStatus();

      expect(allStatus).toHaveProperty('/project1');
      expect(allStatus).toHaveProperty('/project2');
    });
  });
});