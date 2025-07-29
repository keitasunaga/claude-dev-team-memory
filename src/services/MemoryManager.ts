import { LRUCache } from 'lru-cache';
import * as yaml from 'js-yaml';
import path from 'node:path';
import { DatabaseManager } from '../db/DatabaseManager.js';
import { GlobalRepository } from '../repositories/GlobalRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import type {
  IMemoryManager,
  MemoryConfig,
  GlobalMemory,
  ProjectMemory,
  ProjectInfo,
  IssueContext,
  TaskList,
  SessionState,
  ExportFormat,
  Task
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { sanitizeProjectPath } from '../utils/pathValidator.js';

export class MemoryManager implements IMemoryManager {
  private dbManager: DatabaseManager;
  private globalRepo: GlobalRepository;
  private projectRepos: Map<string, ProjectRepository>;
  private cache: LRUCache<string, any> | null;

  constructor(dbManager: DatabaseManager, config?: MemoryConfig) {
    this.dbManager = dbManager;
    this.globalRepo = new GlobalRepository(dbManager.getGlobalDb());
    this.projectRepos = new Map();
    
    // Initialize cache if enabled
    if (config?.enableCache !== false) {
      this.cache = new LRUCache<string, any>({
        max: config?.cacheSize || 100,
        ttl: config?.cacheTTL || 5 * 60 * 1000 // 5 minutes default
      });
    } else {
      this.cache = null;
    }
  }

  private getProjectRepo(projectPath: string): ProjectRepository {
    // Validate path before using it
    const safePath = sanitizeProjectPath(projectPath);
    
    if (!this.projectRepos.has(safePath)) {
      const db = this.dbManager.getProjectDb(safePath);
      this.projectRepos.set(safePath, new ProjectRepository(db));
    }
    return this.projectRepos.get(safePath)!;
  }

  private getCacheKey(type: string, ...args: string[]): string {
    return `${type}:${args.join(':')}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.cache) return null;
    return this.cache.get(key) as T | null;
  }

  private setCache(key: string, value: any): void {
    if (this.cache) {
      this.cache.set(key, value);
    }
  }

  private invalidateCache(pattern?: string): void {
    if (!this.cache) return;
    
    if (pattern) {
      // Invalidate keys matching pattern
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  // Global preference methods
  async saveGlobalPreference(category: string, key: string, value: string): Promise<void> {
    try {
      logger.info('Saving global preference', { category, key });
      await this.globalRepo.savePreference(category, key, value);
      this.invalidateCache(`global:${category}`);
    } catch (error) {
      logger.error('Failed to save global preference', error);
      throw error;
    }
  }

  async getGlobalPreference(category: string, key?: string): Promise<Record<string, any> | string | null> {
    try {
      const cacheKey = this.getCacheKey('global', category, key || 'all');
      const cached = await this.getFromCache<any>(cacheKey);
      if (cached !== null) return cached;
      
      const result = await this.globalRepo.getPreference(category, key);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to get global preference', error);
      throw error;
    }
  }

  async getAllGlobalPreferences(): Promise<GlobalMemory> {
    try {
      const cacheKey = this.getCacheKey('global', 'all');
      const cached = await this.getFromCache<GlobalMemory>(cacheKey);
      if (cached) return cached;
      
      const result = await this.globalRepo.getAllPreferences();
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to get all global preferences', error);
      throw error;
    }
  }

  async deleteGlobalPreference(category: string, key?: string): Promise<void> {
    try {
      logger.info('Deleting global preference', { category, key });
      await this.globalRepo.deletePreference(category, key);
      this.invalidateCache('global:');
    } catch (error) {
      logger.error('Failed to delete global preference', error);
      throw error;
    }
  }

  // Project context methods
  async saveProjectContext(projectPath: string, context: Partial<ProjectMemory>): Promise<void> {
    try {
      logger.info('Saving project context', { projectPath });
      
      const projectName = path.basename(projectPath);
      const repo = this.getProjectRepo(projectPath);
      
      // Ensure project exists
      const project = await repo.createProject(projectPath, projectName);
      
      // Save different parts of the context
      if (context.current_issue) {
        await this.saveIssueContext(projectPath, context.current_issue);
      }
      
      if (context.tasks) {
        await this.saveTasks(projectPath, context.tasks);
      }
      
      if (context.session) {
        await this.saveSessionState(projectPath, context.session);
      }
      
      this.invalidateCache(`project:${projectPath}`);
    } catch (error) {
      logger.error('Failed to save project context', error);
      throw error;
    }
  }

  async getProjectContext(projectPath: string): Promise<ProjectMemory | null> {
    try {
      const cacheKey = this.getCacheKey('project', projectPath);
      const cached = await this.getFromCache<ProjectMemory>(cacheKey);
      if (cached) return cached;
      
      const repo = this.getProjectRepo(projectPath);
      const project = await repo.getProject(projectPath);
      
      if (!project) return null;
      
      const [issue, tasks, session] = await Promise.all([
        this.getIssueContext(projectPath),
        this.getTasks(projectPath),
        this.getSessionState(projectPath)
      ]);
      
      const context: ProjectMemory = {
        path: projectPath,
        current_issue: issue || {
          number: 0,
          title: '',
          requirements: [],
          design_decisions: []
        },
        tasks: tasks || {
          completed: [],
          in_progress: null,
          pending: []
        },
        checkpoint: {
          id: '',
          timestamp: new Date(),
          branch: session?.branch || '',
          last_command: '',
          next_action: ''
        },
        session: session || undefined
      };
      
      this.setCache(cacheKey, context);
      return context;
    } catch (error) {
      logger.error('Failed to get project context', error);
      throw error;
    }
  }

  async listProjects(): Promise<ProjectInfo[]> {
    try {
      const cacheKey = this.getCacheKey('projects', 'list');
      const cached = await this.getFromCache<ProjectInfo[]>(cacheKey);
      if (cached) return cached;
      
      // For now, return from the first project repo or create a default one
      const repo = this.projectRepos.values().next().value || 
                   this.getProjectRepo('default');
      const projects = await repo.listProjects();
      
      this.setCache(cacheKey, projects);
      return projects;
    } catch (error) {
      logger.error('Failed to list projects', error);
      throw error;
    }
  }

  async deleteProject(projectPath: string): Promise<void> {
    try {
      logger.info('Deleting project', { projectPath });
      const repo = this.getProjectRepo(projectPath);
      await repo.deleteProject(projectPath);
      this.projectRepos.delete(projectPath);
      this.invalidateCache(`project:${projectPath}`);
    } catch (error) {
      logger.error('Failed to delete project', error);
      throw error;
    }
  }

  // Issue context methods
  async saveIssueContext(projectPath: string, issue: IssueContext): Promise<void> {
    try {
      const repo = this.getProjectRepo(projectPath);
      const project = await repo.getProject(projectPath);
      
      if (!project) {
        const projectName = path.basename(projectPath);
        await repo.createProject(projectPath, projectName);
      }
      
      const projectInfo = await repo.getProject(projectPath);
      if (!projectInfo) throw new Error('Failed to create project');
      
      await repo.saveIssue(projectInfo.id, {
        issue_number: issue.number,
        title: issue.title,
        requirements: JSON.stringify(issue.requirements),
        design_decisions: JSON.stringify(issue.design_decisions)
      });
      
      this.invalidateCache(`project:${projectPath}:issue`);
    } catch (error) {
      logger.error('Failed to save issue context', error);
      throw error;
    }
  }

  async getIssueContext(projectPath: string): Promise<IssueContext | null> {
    try {
      const cacheKey = this.getCacheKey('project', projectPath, 'issue');
      const cached = await this.getFromCache<IssueContext>(cacheKey);
      if (cached) return cached;
      
      const repo = this.getProjectRepo(projectPath);
      const project = await repo.getProject(projectPath);
      
      if (!project) return null;
      
      const issue = await repo.getIssue(project.id);
      if (!issue) return null;
      
      const context: IssueContext = {
        number: issue.issue_number || 0,
        title: issue.title || '',
        requirements: issue.requirements ? JSON.parse(issue.requirements) : [],
        design_decisions: issue.design_decisions ? JSON.parse(issue.design_decisions) : []
      };
      
      this.setCache(cacheKey, context);
      return context;
    } catch (error) {
      logger.error('Failed to get issue context', error);
      throw error;
    }
  }

  // Task management methods
  async saveTasks(projectPath: string, tasks: TaskList): Promise<void> {
    try {
      const repo = this.getProjectRepo(projectPath);
      const project = await repo.getProject(projectPath);
      
      if (!project) {
        const projectName = path.basename(projectPath);
        await repo.createProject(projectPath, projectName);
      }
      
      const projectInfo = await repo.getProject(projectPath);
      if (!projectInfo) throw new Error('Failed to create project');
      
      // Convert TaskList to array of Task objects
      const allTasks: Task[] = [
        ...tasks.completed,
        ...(tasks.in_progress ? [tasks.in_progress] : []),
        ...tasks.pending
      ];
      
      await repo.saveTasks(projectInfo.id, allTasks);
      this.invalidateCache(`project:${projectPath}:tasks`);
    } catch (error) {
      logger.error('Failed to save tasks', error);
      throw error;
    }
  }

  async getTasks(projectPath: string): Promise<TaskList | null> {
    try {
      const cacheKey = this.getCacheKey('project', projectPath, 'tasks');
      const cached = await this.getFromCache<TaskList>(cacheKey);
      if (cached) return cached;
      
      const repo = this.getProjectRepo(projectPath);
      const project = await repo.getProject(projectPath);
      
      if (!project) return null;
      
      const tasks = await repo.getTasks(project.id);
      
      const taskList: TaskList = {
        completed: tasks.filter(t => t.status === 'completed'),
        in_progress: tasks.find(t => t.status === 'in_progress') || null,
        pending: tasks.filter(t => t.status === 'pending')
      };
      
      this.setCache(cacheKey, taskList);
      return taskList;
    } catch (error) {
      logger.error('Failed to get tasks', error);
      throw error;
    }
  }

  async updateTaskStatus(projectPath: string, taskId: string, status: Task['status']): Promise<void> {
    try {
      const repo = this.getProjectRepo(projectPath);
      await repo.updateTask(parseInt(taskId), { status });
      this.invalidateCache(`project:${projectPath}:tasks`);
    } catch (error) {
      logger.error('Failed to update task status', error);
      throw error;
    }
  }

  // Session state methods
  async saveSessionState(projectPath: string, session: SessionState): Promise<void> {
    try {
      const repo = this.getProjectRepo(projectPath);
      const project = await repo.getProject(projectPath);
      
      if (!project) {
        const projectName = path.basename(projectPath);
        await repo.createProject(projectPath, projectName);
      }
      
      const projectInfo = await repo.getProject(projectPath);
      if (!projectInfo) throw new Error('Failed to create project');
      
      await repo.saveSession(projectInfo.id, {
        current_task: session.current_task,
        branch: session.branch,
        modified_files: JSON.stringify(session.modified_files),
        last_checkpoint: session.last_checkpoint.toISOString()
      });
      
      this.invalidateCache(`project:${projectPath}:session`);
    } catch (error) {
      logger.error('Failed to save session state', error);
      throw error;
    }
  }

  async getSessionState(projectPath: string): Promise<SessionState | null> {
    try {
      const cacheKey = this.getCacheKey('project', projectPath, 'session');
      const cached = await this.getFromCache<SessionState>(cacheKey);
      if (cached) return cached;
      
      const repo = this.getProjectRepo(projectPath);
      const project = await repo.getProject(projectPath);
      
      if (!project) return null;
      
      const session = await repo.getSession(project.id);
      if (!session) return null;
      
      const state: SessionState = {
        current_task: session.current_task || '',
        branch: session.branch || '',
        modified_files: session.modified_files ? JSON.parse(session.modified_files) : [],
        last_checkpoint: new Date(session.last_checkpoint || Date.now())
      };
      
      this.setCache(cacheKey, state);
      return state;
    } catch (error) {
      logger.error('Failed to get session state', error);
      throw error;
    }
  }

  // Export methods
  async exportMemory(format: ExportFormat): Promise<string> {
    try {
      const globalMemory = await this.getAllGlobalPreferences();
      const projects = await this.listProjects();
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        global: globalMemory,
        projects: {} as Record<string, ProjectMemory>
      };
      
      // Export all project contexts
      for (const project of projects) {
        const context = await this.getProjectContext(project.project_path);
        if (context) {
          exportData.projects[project.project_path] = context;
        }
      }
      
      if (format === 'yaml') {
        return yaml.dump(exportData, { indent: 2 });
      } else {
        return JSON.stringify(exportData, null, 2);
      }
    } catch (error) {
      logger.error('Failed to export memory', error);
      throw error;
    }
  }

  async exportProjectMemory(projectPath: string, format: ExportFormat): Promise<string> {
    try {
      const context = await this.getProjectContext(projectPath);
      
      if (!context) {
        throw new Error(`Project not found: ${projectPath}`);
      }
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        project: context
      };
      
      if (format === 'yaml') {
        return yaml.dump(exportData, { indent: 2 });
      } else {
        return JSON.stringify(exportData, null, 2);
      }
    } catch (error) {
      logger.error('Failed to export project memory', error);
      throw error;
    }
  }
}