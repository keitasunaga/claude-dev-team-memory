import { z } from 'zod';
import type { MemoryManager } from '../services/MemoryManager.js';
import type { CheckpointManager } from '../services/CheckpointManager.js';
import type { AutoSaveService } from '../services/AutoSaveService.js';
import type { DatabaseManager } from '../db/DatabaseManager.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import * as schemas from './schemas.js';
import { createHealthHandler } from './handlers/health.js';

export interface HandlerContext {
  memoryManager: MemoryManager;
  checkpointManager: CheckpointManager;
  autoSaveService: AutoSaveService;
  dbManager?: DatabaseManager;
}

export function createHandlers(context: HandlerContext) {
  const { memoryManager, checkpointManager, autoSaveService } = context;

  return {
    // Global preference operations
    'memory/save_global_preference': async (params: unknown) => {
      const validated = schemas.saveGlobalPreferenceSchema.parse(params);
      await memoryManager.saveGlobalPreference(
        validated.category,
        validated.key,
        validated.value
      );
      return { success: true };
    },

    'memory/get_global_preference': async (params: unknown) => {
      const validated = schemas.getGlobalPreferenceSchema.parse(params);
      const result = await memoryManager.getGlobalPreference(
        validated.category,
        validated.key
      );
      return { data: result };
    },

    'memory/get_all_global_preferences': async () => {
      const preferences = await memoryManager.getAllGlobalPreferences();
      return { data: preferences };
    },

    'memory/delete_global_preference': async (params: unknown) => {
      const validated = schemas.deleteGlobalPreferenceSchema.parse(params);
      await memoryManager.deleteGlobalPreference(
        validated.category,
        validated.key
      );
      return { success: true };
    },

    // Project context operations
    'memory/save_project_context': async (params: unknown) => {
      const validated = schemas.saveProjectContextSchema.parse(params);
      await memoryManager.saveProjectContext(
        validated.project_path,
        validated.context
      );
      return { success: true };
    },

    'memory/get_project_context': async (params: unknown) => {
      const validated = schemas.getProjectContextSchema.parse(params);
      const context = await memoryManager.getProjectContext(validated.project_path);
      return { data: context };
    },

    'memory/list_projects': async () => {
      const projects = await memoryManager.listProjects();
      return { data: projects };
    },

    'memory/delete_project': async (params: unknown) => {
      const validated = schemas.deleteProjectSchema.parse(params);
      await memoryManager.deleteProject(validated.project_path);
      return { success: true };
    },

    // Issue context operations
    'memory/save_issue_context': async (params: unknown) => {
      const validated = schemas.saveIssueContextSchema.parse(params);
      await memoryManager.saveIssueContext(
        validated.project_path,
        validated.issue
      );
      return { success: true };
    },

    'memory/get_issue_context': async (params: unknown) => {
      const validated = schemas.getProjectContextSchema.parse(params);
      const issue = await memoryManager.getIssueContext(validated.project_path);
      return { data: issue };
    },

    // Task management operations
    'memory/save_tasks': async (params: unknown) => {
      const validated = schemas.saveTasksSchema.parse(params);
      await memoryManager.saveTasks(validated.project_path, validated.tasks);
      return { success: true };
    },

    'memory/get_tasks': async (params: unknown) => {
      const validated = schemas.getProjectContextSchema.parse(params);
      const tasks = await memoryManager.getTasks(validated.project_path);
      return { data: tasks };
    },

    'memory/update_task_status': async (params: unknown) => {
      const validated = schemas.updateTaskStatusSchema.parse(params);
      await memoryManager.updateTaskStatus(
        validated.project_path,
        validated.task_id,
        validated.status
      );
      return { success: true };
    },

    // Session state operations
    'memory/save_session_state': async (params: unknown) => {
      const validated = schemas.saveSessionStateSchema.parse(params);
      await memoryManager.saveSessionState(
        validated.project_path,
        validated.session
      );
      return { success: true };
    },

    'memory/get_session_state': async (params: unknown) => {
      const validated = schemas.getProjectContextSchema.parse(params);
      const session = await memoryManager.getSessionState(validated.project_path);
      return { data: session };
    },

    // Checkpoint operations
    'memory/create_checkpoint': async (params: unknown) => {
      const validated = schemas.createCheckpointSchema.parse(params);
      const checkpoint = await checkpointManager.createCheckpoint(
        validated.project_path,
        validated.name
      );
      return { data: checkpoint };
    },

    'memory/list_checkpoints': async (params: unknown) => {
      const validated = schemas.listCheckpointsSchema.parse(params);
      const checkpoints = await checkpointManager.listCheckpoints(
        validated.project_path
      );
      return { data: checkpoints };
    },

    'memory/restore_checkpoint': async (params: unknown) => {
      const validated = schemas.restoreCheckpointSchema.parse(params);
      await checkpointManager.restoreCheckpoint(
        validated.project_path,
        validated.checkpoint_id
      );
      return { success: true };
    },

    'memory/delete_checkpoint': async (params: unknown) => {
      const validated = schemas.deleteCheckpointSchema.parse(params);
      await checkpointManager.deleteCheckpoint(
        validated.project_path,
        validated.checkpoint_id
      );
      return { success: true };
    },

    'memory/compare_checkpoints': async (params: unknown) => {
      const validated = schemas.compareCheckpointsSchema.parse(params);
      const comparison = await checkpointManager.compareCheckpoints(
        validated.project_path,
        validated.checkpoint_id1,
        validated.checkpoint_id2
      );
      return { data: comparison };
    },

    // Export operations
    'memory/export_memory': async (params: unknown) => {
      const validated = schemas.exportMemorySchema.parse(params);
      const exported = await memoryManager.exportMemory(validated.format);
      return { data: exported };
    },

    'memory/export_project_memory': async (params: unknown) => {
      const validated = schemas.exportProjectMemorySchema.parse(params);
      const exported = await memoryManager.exportProjectMemory(
        validated.project_path,
        validated.format
      );
      return { data: exported };
    },

    // Auto-save operations
    'memory/register_auto_save': async (params: unknown) => {
      const validated = schemas.registerAutoSaveSchema.parse(params);
      autoSaveService.registerProject(validated.project_path, validated.config);
      return { success: true };
    },

    'memory/unregister_auto_save': async (params: unknown) => {
      const validated = schemas.getProjectContextSchema.parse(params);
      autoSaveService.unregisterProject(validated.project_path);
      return { success: true };
    },

    'memory/trigger_auto_save': async (params: unknown) => {
      const validated = schemas.triggerAutoSaveSchema.parse(params);
      await autoSaveService.triggerSave(validated.project_path, validated.event);
      return { success: true };
    },

    'memory/get_auto_save_status': async (params: unknown) => {
      const validated = params as { project_path?: string };
      const status = autoSaveService.getStatus(validated.project_path);
      return { data: status };
    },

    'memory/save_all': async () => {
      await autoSaveService.saveAll();
      return { success: true };
    },

    // Health check
    'memory/health': context.dbManager ? createHealthHandler(context.dbManager) : async () => ({
      data: {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checks: {
          database: { status: 'unhealthy' as const, message: 'Database manager not available' },
          memory: {
            heapUsed: 0,
            heapTotal: 0,
            external: 0,
            rss: 0
          }
        }
      }
    })
  };
}

export function getToolDefinitions(): Tool[] {
  return [
    {
      name: 'save_global_preference',
      description: 'Save a global user preference',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Preference category (e.g., user_preferences, development_style)' },
          key: { type: 'string', description: 'Preference key' },
          value: { type: 'string', description: 'Preference value' }
        },
        required: ['category', 'key', 'value']
      }
    },
    {
      name: 'get_global_preference',
      description: 'Get a global user preference',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Preference category' },
          key: { type: 'string', description: 'Preference key (optional - omit to get all in category)' }
        },
        required: ['category']
      }
    },
    {
      name: 'get_all_global_preferences',
      description: 'Get all global user preferences',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'save_project_context',
      description: 'Save project-specific context and memory',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Project path' },
          context: { 
            type: 'object',
            description: 'Project context including issue, tasks, and session'
          }
        },
        required: ['project_path', 'context']
      }
    },
    {
      name: 'get_project_context',
      description: 'Get project-specific context and memory',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Project path' }
        },
        required: ['project_path']
      }
    },
    {
      name: 'list_projects',
      description: 'List all projects with saved memory',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'create_checkpoint',
      description: 'Create a checkpoint of current project state',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Project path' },
          name: { type: 'string', description: 'Optional checkpoint name' }
        },
        required: ['project_path']
      }
    },
    {
      name: 'list_checkpoints',
      description: 'List all checkpoints for a project',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Project path' }
        },
        required: ['project_path']
      }
    },
    {
      name: 'restore_checkpoint',
      description: 'Restore project state from a checkpoint',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Project path' },
          checkpoint_id: { type: 'string', description: 'Checkpoint ID to restore' }
        },
        required: ['project_path', 'checkpoint_id']
      }
    },
    {
      name: 'export_memory',
      description: 'Export all memory data',
      inputSchema: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['json', 'yaml'],
            description: 'Export format'
          }
        },
        required: ['format']
      }
    },
    {
      name: 'register_auto_save',
      description: 'Register a project for auto-save',
      inputSchema: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'Project path' },
          config: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              interval: { type: 'number', description: 'Auto-save interval in minutes' },
              triggers: { 
                type: 'array',
                items: { type: 'string' },
                description: 'Event triggers (task_complete, test_pass)'
              }
            },
            required: ['enabled', 'interval', 'triggers']
          }
        },
        required: ['project_path', 'config']
      }
    },
    {
      name: 'health',
      description: 'Check server health status',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ];
}