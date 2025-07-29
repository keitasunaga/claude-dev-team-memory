import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseManager } from '../db/DatabaseManager.js';
import { MemoryManager } from '../services/MemoryManager.js';
import { CheckpointManager } from '../services/CheckpointManager.js';
import { AutoSaveService } from '../services/AutoSaveService.js';
import { createHandlers, getToolDefinitions } from '../api/handlers.js';
import { logger } from '../utils/logger.js';
import type { ServerConfig } from '../types/index.js';

export class MCPMemoryServer {
  private server: Server;
  private dbManager: DatabaseManager;
  private memoryManager: MemoryManager;
  private checkpointManager: CheckpointManager;
  private autoSaveService: AutoSaveService;
  private handlers: ReturnType<typeof createHandlers>;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: 'mcp-memory-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.dbManager = new DatabaseManager(this.config);
    
    // Initialize services
    this.memoryManager = new MemoryManager(this.dbManager, {
      enableCache: this.config.performance.cache.enabled,
      cacheSize: this.config.performance.cache.maxSize,
      cacheTTL: this.config.performance.cache.ttl
    });
    
    this.checkpointManager = new CheckpointManager(this.dbManager, this.memoryManager);
    this.autoSaveService = new AutoSaveService(this.memoryManager, this.checkpointManager);
    
    // Create handlers
    this.handlers = createHandlers({
      memoryManager: this.memoryManager,
      checkpointManager: this.checkpointManager,
      autoSaveService: this.autoSaveService,
      dbManager: this.dbManager
    });
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: getToolDefinitions()
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        // Convert tool name to handler key
        const handlerKey = `memory/${name}` as keyof typeof this.handlers;
        const handler = this.handlers[handlerKey];
        
        if (!handler) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
        
        const result = await handler(args);
        
        // Format response for MCP
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error('Tool call failed', { tool: request.params.name, error });
        
        if (error instanceof McpError) {
          throw error;
        }
        
        // Wrap other errors as internal errors
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  // Session management
  private sessions: Map<string, any> = new Map();
  
  getSession(sessionId: string): any {
    return this.sessions.get(sessionId);
  }
  
  setSession(sessionId: string, data: any): void {
    this.sessions.set(sessionId, data);
  }
  
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  async start() {
    try {
      // Initialize database
      await this.dbManager.runMigrations();
      
      // Start auto-save service
      this.autoSaveService.start();

      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      // Set up graceful shutdown
      process.on('SIGINT', () => this.handleShutdown());
      process.on('SIGTERM', () => this.handleShutdown());

      logger.info('MCP Memory Server started successfully');
    } catch (error) {
      logger.error('Failed to start MCP Memory Server', error);
      throw error;
    }
  }

  async stop() {
    try {
      // Stop auto-save service
      this.autoSaveService.stop();
      
      // Clear sessions
      this.sessions.clear();
      
      // Close database connections
      await this.dbManager.close();
      
      // Close MCP server
      await this.server.close();
      
      logger.info('MCP Memory Server stopped successfully');
    } catch (error) {
      logger.error('Error stopping MCP Memory Server', error);
      throw error;
    }
  }
  
  private async handleShutdown() {
    logger.info('Shutdown signal received, stopping server gracefully');
    await this.stop();
    process.exit(0);
  }
}
