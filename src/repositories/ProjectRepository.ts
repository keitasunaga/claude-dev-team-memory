import { eq, desc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  projectInfo,
  currentIssue,
  tasks,
  sessionState,
  type ProjectInfo,
  type NewProjectInfo,
  type CurrentIssue,
  type NewCurrentIssue,
  type Task,
  type NewTask,
  type SessionState,
  type NewSessionState
} from '../db/schemas/project.js';
import { BaseRepository } from './BaseRepository.js';
import type { IProjectRepository } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ProjectRepository extends BaseRepository<ProjectInfo, number> implements IProjectRepository {
  private db: BetterSQLite3Database;

  constructor(db: BetterSQLite3Database) {
    super('project_info');
    this.db = db;
  }

  async findAll(): Promise<ProjectInfo[]> {
    try {
      this.logOperation('findAll');
      return await this.db
        .select()
        .from(projectInfo)
        .orderBy(desc(projectInfo.last_accessed))
        .all();
    } catch (error) {
      this.handleError('findAll', error);
    }
  }

  async findById(id: number): Promise<ProjectInfo | null> {
    try {
      this.logOperation('findById', { id });
      const result = await this.db
        .select()
        .from(projectInfo)
        .where(eq(projectInfo.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('findById', error);
    }
  }

  async create(data: Partial<ProjectInfo>): Promise<ProjectInfo> {
    try {
      this.validateInput(data, ['project_path', 'project_name']);
      this.logOperation('create', data);
      
      const result = await this.db
        .insert(projectInfo)
        .values(data as NewProjectInfo)
        .returning();
      return result[0];
    } catch (error) {
      this.handleError('create', error);
    }
  }

  async update(id: number, data: Partial<ProjectInfo>): Promise<ProjectInfo | null> {
    try {
      this.logOperation('update', { id, data });
      
      const result = await this.db
        .update(projectInfo)
        .set({
          ...data,
          last_accessed: new Date().toISOString()
        })
        .where(eq(projectInfo.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      this.handleError('update', error);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      this.logOperation('delete', { id });
      
      // Delete all related data first (cascade delete)
      await this.db.delete(sessionState).where(eq(sessionState.project_id, id));
      await this.db.delete(tasks).where(eq(tasks.project_id, id));
      await this.db.delete(currentIssue).where(eq(currentIssue.project_id, id));
      
      const result = await this.db
        .delete(projectInfo)
        .where(eq(projectInfo.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      this.handleError('delete', error);
    }
  }

  // IProjectRepository specific methods
  async createProject(projectPath: string, projectName: string): Promise<ProjectInfo> {
    try {
      this.logOperation('createProject', { projectPath, projectName });
      
      // Check if project already exists
      const existing = await this.getProject(projectPath);
      if (existing) {
        // Update last accessed time
        await this.updateProject(projectPath, { last_accessed: new Date().toISOString() });
        return existing;
      }
      
      return await this.create({
        project_path: projectPath,
        project_name: projectName
      });
    } catch (error) {
      this.handleError('createProject', error);
    }
  }

  async getProject(projectPath: string): Promise<ProjectInfo | null> {
    try {
      this.logOperation('getProject', { projectPath });
      
      const result = await this.db
        .select()
        .from(projectInfo)
        .where(eq(projectInfo.project_path, projectPath))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('getProject', error);
    }
  }

  async updateProject(projectPath: string, data: Partial<ProjectInfo>): Promise<void> {
    try {
      this.logOperation('updateProject', { projectPath, data });
      
      await this.db
        .update(projectInfo)
        .set({
          ...data,
          last_accessed: new Date().toISOString()
        })
        .where(eq(projectInfo.project_path, projectPath));
    } catch (error) {
      this.handleError('updateProject', error);
    }
  }

  async deleteProject(projectPath: string): Promise<void> {
    try {
      this.logOperation('deleteProject', { projectPath });
      
      const project = await this.getProject(projectPath);
      if (project) {
        await this.delete(project.id);
      }
    } catch (error) {
      this.handleError('deleteProject', error);
    }
  }

  async listProjects(): Promise<ProjectInfo[]> {
    return this.findAll();
  }

  // Issue methods
  async saveIssue(projectId: number, issue: Partial<CurrentIssue>): Promise<void> {
    try {
      this.logOperation('saveIssue', { projectId, issue });
      
      // Check if issue already exists
      const existing = await this.getIssue(projectId);
      
      if (existing) {
        // Update existing issue
        await this.db
          .update(currentIssue)
          .set({
            ...issue,
            updated_at: new Date().toISOString()
          })
          .where(eq(currentIssue.project_id, projectId));
      } else {
        // Create new issue
        await this.db
          .insert(currentIssue)
          .values({
            ...issue,
            project_id: projectId
          } as NewCurrentIssue);
      }
    } catch (error) {
      this.handleError('saveIssue', error);
    }
  }

  async getIssue(projectId: number): Promise<CurrentIssue | null> {
    try {
      this.logOperation('getIssue', { projectId });
      
      const result = await this.db
        .select()
        .from(currentIssue)
        .where(eq(currentIssue.project_id, projectId))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('getIssue', error);
    }
  }

  // Task methods
  async saveTasks(projectId: number, taskList: Task[]): Promise<void> {
    try {
      this.logOperation('saveTasks', { projectId, taskCount: taskList.length });
      
      // Delete existing tasks
      await this.db.delete(tasks).where(eq(tasks.project_id, projectId));
      
      // Insert new tasks
      if (taskList.length > 0) {
        const tasksToInsert = taskList.map(task => ({
          ...task,
          project_id: projectId
        })) as NewTask[];
        
        await this.db.insert(tasks).values(tasksToInsert);
      }
    } catch (error) {
      this.handleError('saveTasks', error);
    }
  }

  async getTasks(projectId: number): Promise<Task[]> {
    try {
      this.logOperation('getTasks', { projectId });
      
      return await this.db
        .select()
        .from(tasks)
        .where(eq(tasks.project_id, projectId))
        .orderBy(tasks.priority, desc(tasks.created_at))
        .all();
    } catch (error) {
      this.handleError('getTasks', error);
    }
  }

  async updateTask(taskId: number, data: Partial<Task>): Promise<void> {
    try {
      this.logOperation('updateTask', { taskId, data });
      
      const updateData: any = { ...data };
      
      // Set completed_at if status is completed
      if (data.status === 'completed' && !data.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      
      await this.db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, taskId));
    } catch (error) {
      this.handleError('updateTask', error);
    }
  }

  // Session methods
  async saveSession(projectId: number, session: Partial<SessionState>): Promise<void> {
    try {
      this.logOperation('saveSession', { projectId, session });
      
      // Check if session already exists
      const existing = await this.getSession(projectId);
      
      if (existing) {
        // Update existing session
        await this.db
          .update(sessionState)
          .set({
            ...session,
            updated_at: new Date().toISOString()
          })
          .where(eq(sessionState.project_id, projectId));
      } else {
        // Create new session
        await this.db
          .insert(sessionState)
          .values({
            ...session,
            project_id: projectId
          } as NewSessionState);
      }
    } catch (error) {
      this.handleError('saveSession', error);
    }
  }

  async getSession(projectId: number): Promise<SessionState | null> {
    try {
      this.logOperation('getSession', { projectId });
      
      const result = await this.db
        .select()
        .from(sessionState)
        .where(eq(sessionState.project_id, projectId))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('getSession', error);
    }
  }
}