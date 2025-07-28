import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseManager } from '../db/DatabaseManager.js';
import { logger } from '../utils/logger.js';
import type { ServerConfig } from '../types/index.js';

export class MCPMemoryServer {
  private server: Server;
  private dbManager: DatabaseManager;
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
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'save_global_preference',
            description: 'Save a global user preference',
            inputSchema: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Preference category' },
                key: { type: 'string', description: 'Preference key' },
                value: { type: 'string', description: 'Preference value' },
                type: {
                  type: 'string',
                  enum: ['string', 'number', 'boolean', 'json'],
                  default: 'string',
                },
              },
              required: ['category', 'key', 'value'],
            },
          },
          {
            name: 'get_global_preference',
            description: 'Get a global user preference',
            inputSchema: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Preference category' },
                key: { type: 'string', description: 'Preference key' },
              },
              required: ['category', 'key'],
            },
          },
          {
            name: 'save_project_context',
            description: 'Save project-specific context',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: { type: 'string', description: 'Project path' },
                context: { type: 'object', description: 'Project context data' },
              },
              required: ['projectPath', 'context'],
            },
          },
          {
            name: 'get_project_context',
            description: 'Get project-specific context',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: { type: 'string', description: 'Project path' },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'create_checkpoint',
            description: 'Create a development checkpoint',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: { type: 'string', description: 'Project path' },
                name: { type: 'string', description: 'Checkpoint name' },
                branch: { type: 'string', description: 'Git branch' },
                lastCommand: { type: 'string', description: 'Last executed command' },
                nextAction: { type: 'string', description: 'Next recommended action' },
                snapshotData: { type: 'object', description: 'Complete state snapshot' },
              },
              required: ['projectPath', 'branch', 'lastCommand', 'nextAction'],
            },
          },
          {
            name: 'list_checkpoints',
            description: 'List available checkpoints for a project',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: { type: 'string', description: 'Project path' },
                limit: {
                  type: 'number',
                  description: 'Number of checkpoints to return',
                  default: 10,
                },
              },
              required: ['projectPath'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'save_global_preference':
            return await this.saveGlobalPreference(args);
          case 'get_global_preference':
            return await this.getGlobalPreference(args);
          case 'save_project_context':
            return await this.saveProjectContext(args);
          case 'get_project_context':
            return await this.getProjectContext(args);
          case 'create_checkpoint':
            return await this.createCheckpoint(args);
          case 'list_checkpoints':
            return await this.listCheckpoints(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error('Tool call failed', { tool: request.params.name, error });
        throw error;
      }
    });
  }

  private async saveGlobalPreference(args: any) {
    const { category, key, value } = args;

    // TODO: Implementation would use drizzle ORM to save preference
    // const db = this.dbManager.getGlobalDb();

    return {
      content: [
        {
          type: 'text',
          text: `Global preference saved: ${category}.${key} = ${value}`,
        },
      ],
    };
  }

  private async getGlobalPreference(args: any) {
    const { category, key } = args;

    // TODO: Implementation would use drizzle ORM to get preference
    // const db = this.dbManager.getGlobalDb();

    return {
      content: [
        {
          type: 'text',
          text: `Retrieved preference: ${category}.${key}`,
        },
      ],
    };
  }

  private async saveProjectContext(args: any) {
    const { projectPath } = args;

    // Ensure project database is migrated
    await this.dbManager.runProjectMigrations(projectPath);

    // TODO: Implementation would use drizzle ORM to save context
    // const db = this.dbManager.getProjectDb(projectPath);

    return {
      content: [
        {
          type: 'text',
          text: `Project context saved for: ${projectPath}`,
        },
      ],
    };
  }

  private async getProjectContext(args: any) {
    const { projectPath } = args;

    // TODO: Implementation would use drizzle ORM to get context
    // const db = this.dbManager.getProjectDb(projectPath);

    return {
      content: [
        {
          type: 'text',
          text: `Retrieved context for project: ${projectPath}`,
        },
      ],
    };
  }

  private async createCheckpoint(args: any) {
    const { projectPath, name } = args;

    // Ensure project database is migrated
    await this.dbManager.runProjectMigrations(projectPath);

    // TODO: Implementation would use drizzle ORM to save checkpoint
    // const db = this.dbManager.getProjectDb(projectPath);

    return {
      content: [
        {
          type: 'text',
          text: `Checkpoint created for project: ${projectPath}${name ? ` (${name})` : ''}`,
        },
      ],
    };
  }

  private async listCheckpoints(args: any) {
    const { projectPath, limit = 10 } = args;

    // TODO: Implementation would use drizzle ORM to list checkpoints
    // const db = this.dbManager.getProjectDb(projectPath);

    return {
      content: [
        {
          type: 'text',
          text: `Listed ${limit} checkpoints for project: ${projectPath}`,
        },
      ],
    };
  }

  async start() {
    try {
      // Initialize database
      await this.dbManager.runMigrations();

      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('MCP Memory Server started successfully');
    } catch (error) {
      logger.error('Failed to start MCP Memory Server', error);
      throw error;
    }
  }

  async stop() {
    try {
      await this.dbManager.close();
      await this.server.close();
      logger.info('MCP Memory Server stopped successfully');
    } catch (error) {
      logger.error('Error stopping MCP Memory Server', error);
      throw error;
    }
  }
}
