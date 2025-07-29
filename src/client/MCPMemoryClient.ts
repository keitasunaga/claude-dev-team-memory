import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  GlobalMemory,
  ProjectMemory,
  ProjectInfo,
  IssueContext,
  TaskList,
  SessionState,
  Checkpoint,
  ExportFormat
} from '../types/index.js';
import type { AutoSaveConfig } from '../services/AutoSaveService.js';
import { logger } from '../utils/logger.js';

export interface MCPMemoryClientConfig {
  serverPath?: string;
  transport?: Transport;
  retryAttempts?: number;
  retryDelay?: number;
}

export class MCPMemoryClient {
  private client: Client;
  private transport: Transport;
  private config: MCPMemoryClientConfig;
  private connected: boolean = false;

  constructor(config: MCPMemoryClientConfig = {}) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = new Client({
      name: 'mcp-memory-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Use provided transport or create stdio transport
    if (config.transport) {
      this.transport = config.transport;
    } else {
      const serverPath = config.serverPath || 'mcp-memory-server';
      this.transport = new StdioClientTransport({
        command: serverPath,
        args: []
      });
    }
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.client.connect(this.transport);
      this.connected = true;
      logger.info('Connected to MCP Memory Server');
    } catch (error) {
      logger.error('Failed to connect to MCP Memory Server', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
      this.connected = false;
      logger.info('Disconnected from MCP Memory Server');
    } catch (error) {
      logger.error('Failed to disconnect from MCP Memory Server', error);
      throw error;
    }
  }

  private async callTool(name: string, args: any = {}): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      try {
        const response = await this.client.callTool({
          name,
          arguments: args
        });

        // Parse the response
        if (response.content && response.content.length > 0) {
          const content = response.content[0];
          if (content.type === 'text') {
            try {
              return JSON.parse(content.text);
            } catch {
              return content.text;
            }
          }
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Tool call failed (attempt ${attempt + 1}/${this.config.retryAttempts})`, {
          tool: name,
          error: lastError.message
        });

        if (attempt < this.config.retryAttempts! - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay! * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Tool call failed');
  }

  // Global preference methods
  async saveGlobalPreference(category: string, key: string, value: string): Promise<void> {
    await this.callTool('save_global_preference', { category, key, value });
  }

  async getGlobalPreference(category: string, key?: string): Promise<Record<string, any> | string | null> {
    const result = await this.callTool('get_global_preference', { category, key });
    return result.data;
  }

  async getAllGlobalPreferences(): Promise<GlobalMemory> {
    const result = await this.callTool('get_all_global_preferences');
    return result.data;
  }

  async deleteGlobalPreference(category: string, key?: string): Promise<void> {
    await this.callTool('delete_global_preference', { category, key });
  }

  // Project context methods
  async saveProjectContext(projectPath: string, context: Partial<ProjectMemory>): Promise<void> {
    await this.callTool('save_project_context', { project_path: projectPath, context });
  }

  async getProjectContext(projectPath: string): Promise<ProjectMemory | null> {
    const result = await this.callTool('get_project_context', { project_path: projectPath });
    return result.data;
  }

  async listProjects(): Promise<ProjectInfo[]> {
    const result = await this.callTool('list_projects');
    return result.data;
  }

  async deleteProject(projectPath: string): Promise<void> {
    await this.callTool('delete_project', { project_path: projectPath });
  }

  // Issue context methods
  async saveIssueContext(projectPath: string, issue: IssueContext): Promise<void> {
    await this.callTool('save_issue_context', { project_path: projectPath, issue });
  }

  async getIssueContext(projectPath: string): Promise<IssueContext | null> {
    const result = await this.callTool('get_issue_context', { project_path: projectPath });
    return result.data;
  }

  // Task management methods
  async saveTasks(projectPath: string, tasks: TaskList): Promise<void> {
    await this.callTool('save_tasks', { project_path: projectPath, tasks });
  }

  async getTasks(projectPath: string): Promise<TaskList | null> {
    const result = await this.callTool('get_tasks', { project_path: projectPath });
    return result.data;
  }

  async updateTaskStatus(projectPath: string, taskId: string, status: 'pending' | 'in_progress' | 'completed'): Promise<void> {
    await this.callTool('update_task_status', { 
      project_path: projectPath, 
      task_id: taskId, 
      status 
    });
  }

  // Session state methods
  async saveSessionState(projectPath: string, session: SessionState): Promise<void> {
    await this.callTool('save_session_state', { project_path: projectPath, session });
  }

  async getSessionState(projectPath: string): Promise<SessionState | null> {
    const result = await this.callTool('get_session_state', { project_path: projectPath });
    return result.data;
  }

  // Checkpoint methods
  async createCheckpoint(projectPath: string, name?: string): Promise<Checkpoint> {
    const result = await this.callTool('create_checkpoint', { project_path: projectPath, name });
    return result.data;
  }

  async listCheckpoints(projectPath: string): Promise<Checkpoint[]> {
    const result = await this.callTool('list_checkpoints', { project_path: projectPath });
    return result.data;
  }

  async restoreCheckpoint(projectPath: string, checkpointId: string): Promise<void> {
    await this.callTool('restore_checkpoint', { 
      project_path: projectPath, 
      checkpoint_id: checkpointId 
    });
  }

  async deleteCheckpoint(projectPath: string, checkpointId: string): Promise<void> {
    await this.callTool('delete_checkpoint', { 
      project_path: projectPath, 
      checkpoint_id: checkpointId 
    });
  }

  async compareCheckpoints(projectPath: string, checkpointId1: string, checkpointId2: string): Promise<any> {
    const result = await this.callTool('compare_checkpoints', { 
      project_path: projectPath, 
      checkpoint_id1: checkpointId1,
      checkpoint_id2: checkpointId2
    });
    return result.data;
  }

  // Export methods
  async exportMemory(format: ExportFormat): Promise<string> {
    const result = await this.callTool('export_memory', { format });
    return result.data;
  }

  async exportProjectMemory(projectPath: string, format: ExportFormat): Promise<string> {
    const result = await this.callTool('export_project_memory', { 
      project_path: projectPath, 
      format 
    });
    return result.data;
  }

  // Auto-save methods
  async registerAutoSave(projectPath: string, config: AutoSaveConfig): Promise<void> {
    await this.callTool('register_auto_save', { project_path: projectPath, config });
  }

  async unregisterAutoSave(projectPath: string): Promise<void> {
    await this.callTool('unregister_auto_save', { project_path: projectPath });
  }

  async triggerAutoSave(projectPath: string, eventType: 'task_complete' | 'test_pass' | 'manual'): Promise<void> {
    await this.callTool('trigger_auto_save', { 
      project_path: projectPath,
      event: {
        type: eventType,
        projectPath,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'client'
        }
      }
    });
  }

  async getAutoSaveStatus(projectPath?: string): Promise<any> {
    const result = await this.callTool('get_auto_save_status', { project_path: projectPath });
    return result.data;
  }

  async saveAll(): Promise<void> {
    await this.callTool('save_all');
  }

  // Convenience methods for common workflows
  async quickSave(projectPath: string, data: {
    issue?: IssueContext;
    tasks?: TaskList;
    session?: SessionState;
  }): Promise<void> {
    const context: Partial<ProjectMemory> = {
      path: projectPath
    };

    if (data.issue) {
      context.current_issue = data.issue;
    }
    if (data.tasks) {
      context.tasks = data.tasks;
    }
    if (data.session) {
      context.session = data.session;
    }

    await this.saveProjectContext(projectPath, context);
  }

  async getCurrentWorkState(projectPath: string): Promise<{
    issue: IssueContext | null;
    tasks: TaskList | null;
    session: SessionState | null;
    lastCheckpoint: Checkpoint | null;
  }> {
    const [context, checkpoints] = await Promise.all([
      this.getProjectContext(projectPath),
      this.listCheckpoints(projectPath)
    ]);

    return {
      issue: context?.current_issue || null,
      tasks: context?.tasks || null,
      session: context?.session || null,
      lastCheckpoint: checkpoints && checkpoints.length > 0 ? checkpoints[0] : null
    };
  }

  // Batch operations
  async batchSavePreferences(preferences: Array<{
    category: string;
    key: string;
    value: string;
  }>): Promise<void> {
    await Promise.all(
      preferences.map(pref => 
        this.saveGlobalPreference(pref.category, pref.key, pref.value)
      )
    );
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      await this.callTool('list_projects');
      return true;
    } catch {
      return false;
    }
  }
}