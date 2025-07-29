import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPMemoryServer } from '../../server/MCPMemoryServer.js';
import type { ServerConfig } from '../../types/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn()
}));

// Mock the services and utilities
vi.mock('../../db/DatabaseManager.js', () => ({
  DatabaseManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn().mockResolvedValue(undefined),
    getGlobalDb: vi.fn(),
    getProjectDb: vi.fn()
  }))
}));

vi.mock('../../services/MemoryManager.js', () => ({
  MemoryManager: vi.fn().mockImplementation(() => ({
    saveGlobalPreference: vi.fn().mockResolvedValue(undefined),
    getGlobalPreference: vi.fn().mockResolvedValue(null),
    getAllGlobalPreferences: vi.fn().mockResolvedValue({}),
    deleteGlobalPreference: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../services/CheckpointManager.js', () => ({
  CheckpointManager: vi.fn().mockImplementation(() => ({
    createCheckpoint: vi.fn().mockResolvedValue({
      id: '1',
      project_id: 1,
      name: 'test checkpoint',
      timestamp: new Date(),
      snapshot_data: '{}',
      checksum: 'abc123'
    }),
    listCheckpoints: vi.fn().mockResolvedValue([]),
    restoreCheckpoint: vi.fn().mockResolvedValue(undefined),
    deleteCheckpoint: vi.fn().mockResolvedValue(undefined),
    compareCheckpoints: vi.fn().mockResolvedValue({})
  }))
}));

vi.mock('../../services/AutoSaveService.js', () => ({
  AutoSaveService: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    registerProject: vi.fn(),
    unregisterProject: vi.fn(),
    triggerSave: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue({}),
    saveAll: vi.fn().mockResolvedValue(undefined),
    setInterval: vi.fn()
  }))
}));

vi.mock('../../api/handlers/index.js', () => ({
  createHandlers: vi.fn().mockReturnValue({
    global: {},
    project: {},
    checkpoint: {},
    export: {},
    autosave: {}
  })
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('MCPMemoryServer', () => {
  let server: MCPMemoryServer;
  let mockConfig: ServerConfig;
  let mockMcpServer: any;
  let mockTransport: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      storage: {
        basePath: '/tmp/test',
        globalDbPath: '/tmp/test/global.db',
        projectsPath: '/tmp/test/projects'
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
    
    // Get mock instance
    mockMcpServer = new Server();
    mockTransport = {};
    
    server = new MCPMemoryServer(mockConfig);
  });
  
  afterEach(async () => {
    await server.stop();
  });
  
  describe('Server Lifecycle', () => {
    it('should create server with config', () => {
      expect(server).toBeDefined();
      expect(Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'mcp-memory-server',
          version: expect.any(String)
        }),
        expect.objectContaining({
          capabilities: expect.objectContaining({
            tools: {}
          })
        })
      );
    });
    
    it('should start server successfully', async () => {
      await server.start();
      
      expect(mockMcpServer.setRequestHandler).toHaveBeenCalled();
      expect(mockMcpServer.start).toHaveBeenCalled();
    });
    
    it('should stop server gracefully', async () => {
      await server.start();
      await server.stop();
      
      expect(mockMcpServer.close).toHaveBeenCalled();
    });
    
    it('should handle multiple start calls', async () => {
      await server.start();
      await server.start(); // Should not throw
      
      expect(mockMcpServer.start).toHaveBeenCalledTimes(1);
    });
    
    it('should handle stop without start', async () => {
      await server.stop(); // Should not throw
      expect(mockMcpServer.close).not.toHaveBeenCalled();
    });
  });
  
  describe('Service Integration', () => {
    it('should initialize all services on start', async () => {
      await server.start();
      
      // Check that services were created
      const { DatabaseManager } = await import('../../db/DatabaseManager.js');
      const { MemoryManager } = await import('../../services/MemoryManager.js');
      const { CheckpointManager } = await import('../../services/CheckpointManager.js');
      const { AutoSaveService } = await import('../../services/AutoSaveService.js');
      
      expect(DatabaseManager).toHaveBeenCalled();
      expect(MemoryManager).toHaveBeenCalled();
      expect(CheckpointManager).toHaveBeenCalled();
      expect(AutoSaveService).toHaveBeenCalled();
    });
    
    it('should start auto-save service if enabled', async () => {
      await server.start();
      
      const autoSaveService = (server as any).autoSaveService;
      expect(autoSaveService.start).toHaveBeenCalled();
    });
    
    it('should not start auto-save if disabled', async () => {
      const disabledConfig = {
        ...mockConfig,
        autoSave: {
          enabled: false,
          interval: 10,
          triggers: []
        }
      };
      
      const serverWithDisabledAutoSave = new MCPMemoryServer(disabledConfig);
      await serverWithDisabledAutoSave.start();
      
      const autoSaveService = (serverWithDisabledAutoSave as any).autoSaveService;
      expect(autoSaveService.start).not.toHaveBeenCalled();
      
      await serverWithDisabledAutoSave.stop();
    });
  });
  
  describe('Handler Registration', () => {
    it('should register all tool handlers', async () => {
      await server.start();
      
      const { createHandlers } = await import('../../api/handlers/index.js');
      expect(createHandlers).toHaveBeenCalledWith({
        memoryManager: expect.any(Object),
        checkpointManager: expect.any(Object),
        autoSaveService: expect.any(Object)
      });
    });
    
    it('should set request handler on MCP server', async () => {
      await server.start();
      
      expect(mockMcpServer.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });
  
  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      const { DatabaseManager } = await import('../../db/DatabaseManager.js');
      const mockDb = DatabaseManager as unknown as jest.Mock;
      mockDb.mockImplementationOnce(() => ({
        initialize: vi.fn().mockRejectedValue(new Error('DB init failed'))
      }));
      
      const failServer = new MCPMemoryServer(mockConfig);
      
      await expect(failServer.start()).rejects.toThrow('DB init failed');
    });
    
    it('should handle server start errors', async () => {
      mockMcpServer.start = vi.fn().mockRejectedValue(new Error('Start failed'));
      
      await expect(server.start()).rejects.toThrow('Start failed');
    });
  });
  
  describe('Graceful Shutdown', () => {
    it('should stop services on shutdown', async () => {
      await server.start();
      
      const autoSaveService = (server as any).autoSaveService;
      const dbManager = (server as any).dbManager;
      
      await server.stop();
      
      expect(autoSaveService.stop).toHaveBeenCalled();
      expect(dbManager.cleanup).toHaveBeenCalled();
    });
    
    it('should handle errors during shutdown', async () => {
      await server.start();
      
      const autoSaveService = (server as any).autoSaveService;
      autoSaveService.stop = vi.fn().mockImplementation(() => {
        throw new Error('Stop failed');
      });
      
      // Should not throw
      await server.stop();
      
      const { logger } = await import('../../utils/logger.js');
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('Configuration', () => {
    it('should use default config when not provided', () => {
      const serverWithDefaults = new MCPMemoryServer();
      expect(serverWithDefaults).toBeDefined();
    });
    
    it('should merge partial config with defaults', () => {
      const partialConfig = {
        storage: {
          basePath: '/custom/path'
        }
      };
      
      const serverWithPartial = new MCPMemoryServer(partialConfig as ServerConfig);
      expect(serverWithPartial).toBeDefined();
    });
  });
});