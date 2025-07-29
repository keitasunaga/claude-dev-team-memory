import crypto from 'node:crypto';
import { DatabaseManager } from '../db/DatabaseManager.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { CheckpointRepository } from '../repositories/CheckpointRepository.js';
import { MemoryManager } from './MemoryManager.js';
import type {
  ICheckpointManager,
  Checkpoint,
  SessionState,
  IssueContext,
  TaskList
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { sanitizeProjectPath } from '../utils/pathValidator.js';

export class CheckpointManager implements ICheckpointManager {
  private dbManager: DatabaseManager;
  private memoryManager: MemoryManager;
  private projectRepos: Map<string, ProjectRepository>;
  private checkpointRepos: Map<string, CheckpointRepository>;

  constructor(dbManager: DatabaseManager, memoryManager: MemoryManager) {
    this.dbManager = dbManager;
    this.memoryManager = memoryManager;
    this.projectRepos = new Map();
    this.checkpointRepos = new Map();
  }

  private getProjectRepo(projectPath: string): ProjectRepository {
    const safePath = sanitizeProjectPath(projectPath);
    
    if (!this.projectRepos.has(safePath)) {
      const db = this.dbManager.getProjectDb(safePath);
      this.projectRepos.set(safePath, new ProjectRepository(db));
    }
    return this.projectRepos.get(safePath)!;
  }

  private getCheckpointRepo(projectPath: string): CheckpointRepository {
    const safePath = sanitizeProjectPath(projectPath);
    
    if (!this.checkpointRepos.has(safePath)) {
      const db = this.dbManager.getProjectDb(safePath);
      this.checkpointRepos.set(safePath, new CheckpointRepository(db));
    }
    return this.checkpointRepos.get(safePath)!;
  }

  async createCheckpoint(projectPath: string, name?: string): Promise<Checkpoint> {
    try {
      logger.info('Creating checkpoint', { projectPath, name });
      
      // Get the project
      const projectRepo = this.getProjectRepo(projectPath);
      const project = await projectRepo.getProject(projectPath);
      
      if (!project) {
        throw new Error(`Project not found: ${projectPath}`);
      }
      
      // Get the current project context
      const context = await this.memoryManager.getProjectContext(projectPath);
      if (!context) {
        throw new Error(`No context found for project: ${projectPath}`);
      }
      
      // Get session state
      const session = await this.memoryManager.getSessionState(projectPath);
      
      // Create snapshot data
      const snapshotData = {
        projectPath,
        timestamp: new Date().toISOString(),
        context: {
          issue: context.current_issue,
          tasks: context.tasks,
          session: session
        },
        metadata: {
          name: name || `Checkpoint ${new Date().toLocaleString()}`,
          checksum: ''
        }
      };
      
      // Calculate checksum
      const dataString = JSON.stringify(snapshotData);
      const checksum = crypto.createHash('sha256').update(dataString).digest('hex');
      snapshotData.metadata.checksum = checksum;
      
      // Create the checkpoint
      const checkpointRepo = this.getCheckpointRepo(projectPath);
      const checkpoint = await checkpointRepo.createCheckpoint(
        project.id,
        name,
        snapshotData,
        session?.branch,
        session?.current_task,
        'Continue from checkpoint'
      );
      
      logger.info('Checkpoint created', { 
        projectPath, 
        checkpointId: checkpoint.id,
        name: checkpoint.checkpoint_name 
      });
      
      return this.formatCheckpoint(checkpoint);
    } catch (error) {
      logger.error('Failed to create checkpoint', error);
      throw error;
    }
  }

  async listCheckpoints(projectPath: string): Promise<Checkpoint[]> {
    try {
      const projectRepo = this.getProjectRepo(projectPath);
      const project = await projectRepo.getProject(projectPath);
      
      if (!project) {
        return [];
      }
      
      const checkpointRepo = this.getCheckpointRepo(projectPath);
      const checkpoints = await checkpointRepo.findByProjectId(project.id);
      
      return checkpoints.map(cp => this.formatCheckpoint(cp));
    } catch (error) {
      logger.error('Failed to list checkpoints', error);
      throw error;
    }
  }

  async restoreCheckpoint(projectPath: string, checkpointId: string): Promise<void> {
    try {
      logger.info('Restoring checkpoint', { projectPath, checkpointId });
      
      const checkpointRepo = this.getCheckpointRepo(projectPath);
      const checkpoint = await checkpointRepo.findById(parseInt(checkpointId));
      
      if (!checkpoint) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }
      
      // Validate checkpoint
      const isValid = await checkpointRepo.validateCheckpoint(checkpoint);
      if (!isValid) {
        throw new Error('Checkpoint data is corrupted');
      }
      
      // Parse snapshot data
      const snapshotData = JSON.parse(checkpoint.snapshot_data || '{}');
      
      // Restore context
      if (snapshotData.context) {
        const { issue, tasks, session } = snapshotData.context;
        
        // Restore issue context
        if (issue) {
          await this.memoryManager.saveIssueContext(projectPath, issue);
        }
        
        // Restore tasks
        if (tasks) {
          await this.memoryManager.saveTasks(projectPath, tasks);
        }
        
        // Restore session state
        if (session) {
          await this.memoryManager.saveSessionState(projectPath, {
            ...session,
            last_checkpoint: new Date(session.last_checkpoint)
          });
        }
      }
      
      logger.info('Checkpoint restored successfully', { 
        projectPath, 
        checkpointId,
        name: checkpoint.checkpoint_name 
      });
    } catch (error) {
      logger.error('Failed to restore checkpoint', error);
      throw error;
    }
  }

  async deleteCheckpoint(projectPath: string, checkpointId: string): Promise<void> {
    try {
      logger.info('Deleting checkpoint', { projectPath, checkpointId });
      
      const checkpointRepo = this.getCheckpointRepo(projectPath);
      const deleted = await checkpointRepo.delete(parseInt(checkpointId));
      
      if (!deleted) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }
      
      logger.info('Checkpoint deleted', { projectPath, checkpointId });
    } catch (error) {
      logger.error('Failed to delete checkpoint', error);
      throw error;
    }
  }

  async compareCheckpoints(
    projectPath: string, 
    checkpointId1: string, 
    checkpointId2: string
  ): Promise<any> {
    try {
      const checkpointRepo = this.getCheckpointRepo(projectPath);
      
      const [checkpoint1, checkpoint2] = await Promise.all([
        checkpointRepo.findById(parseInt(checkpointId1)),
        checkpointRepo.findById(parseInt(checkpointId2))
      ]);
      
      if (!checkpoint1 || !checkpoint2) {
        throw new Error('One or both checkpoints not found');
      }
      
      const snapshot1 = JSON.parse(checkpoint1.snapshot_data || '{}');
      const snapshot2 = JSON.parse(checkpoint2.snapshot_data || '{}');
      
      // Compare the snapshots
      const comparison = {
        checkpoint1: {
          id: checkpoint1.id,
          name: checkpoint1.checkpoint_name,
          created_at: checkpoint1.created_at,
          branch: checkpoint1.branch_name
        },
        checkpoint2: {
          id: checkpoint2.id,
          name: checkpoint2.checkpoint_name,
          created_at: checkpoint2.created_at,
          branch: checkpoint2.branch_name
        },
        differences: {
          issue: this.compareIssues(
            snapshot1.context?.issue,
            snapshot2.context?.issue
          ),
          tasks: this.compareTasks(
            snapshot1.context?.tasks,
            snapshot2.context?.tasks
          ),
          session: this.compareSessions(
            snapshot1.context?.session,
            snapshot2.context?.session
          )
        }
      };
      
      return comparison;
    } catch (error) {
      logger.error('Failed to compare checkpoints', error);
      throw error;
    }
  }

  private formatCheckpoint(checkpoint: any): Checkpoint {
    const snapshotData = JSON.parse(checkpoint.snapshot_data);
    return {
      id: checkpoint.id.toString(),
      project_id: checkpoint.project_id,
      name: checkpoint.checkpoint_name,
      timestamp: new Date(checkpoint.created_at),
      snapshot_data: checkpoint.snapshot_data,
      checksum: snapshotData.metadata?.checksum || ''
    };
  }

  private compareIssues(issue1?: IssueContext, issue2?: IssueContext): any {
    if (!issue1 && !issue2) return { changed: false };
    if (!issue1 || !issue2) return { changed: true, added: !issue1, removed: !issue2 };
    
    return {
      changed: JSON.stringify(issue1) !== JSON.stringify(issue2),
      differences: {
        number: issue1.number !== issue2.number,
        title: issue1.title !== issue2.title,
        requirements: {
          added: issue2.requirements.filter(r => !issue1.requirements.includes(r)),
          removed: issue1.requirements.filter(r => !issue2.requirements.includes(r))
        },
        design_decisions: {
          added: issue2.design_decisions.filter(d => !issue1.design_decisions.includes(d)),
          removed: issue1.design_decisions.filter(d => !issue2.design_decisions.includes(d))
        }
      }
    };
  }

  private compareTasks(tasks1?: TaskList, tasks2?: TaskList): any {
    if (!tasks1 && !tasks2) return { changed: false };
    if (!tasks1 || !tasks2) return { changed: true, added: !tasks1, removed: !tasks2 };
    
    const getAllTaskIds = (tasks: TaskList) => [
      ...tasks.completed.map(t => t.id),
      ...(tasks.in_progress ? [tasks.in_progress.id] : []),
      ...tasks.pending.map(t => t.id)
    ];
    
    const ids1 = getAllTaskIds(tasks1);
    const ids2 = getAllTaskIds(tasks2);
    
    return {
      changed: JSON.stringify(tasks1) !== JSON.stringify(tasks2),
      differences: {
        completed: {
          count1: tasks1.completed.length,
          count2: tasks2.completed.length
        },
        in_progress: {
          task1: tasks1.in_progress?.description,
          task2: tasks2.in_progress?.description
        },
        pending: {
          count1: tasks1.pending.length,
          count2: tasks2.pending.length
        },
        added_tasks: ids2.filter(id => !ids1.includes(id)),
        removed_tasks: ids1.filter(id => !ids2.includes(id))
      }
    };
  }

  private compareSessions(session1?: SessionState, session2?: SessionState): any {
    if (!session1 && !session2) return { changed: false };
    if (!session1 || !session2) return { changed: true, added: !session1, removed: !session2 };
    
    return {
      changed: JSON.stringify(session1) !== JSON.stringify(session2),
      differences: {
        current_task: session1.current_task !== session2.current_task,
        branch: session1.branch !== session2.branch,
        modified_files: {
          added: session2.modified_files.filter(f => !session1.modified_files.includes(f)),
          removed: session1.modified_files.filter(f => !session2.modified_files.includes(f))
        }
      }
    };
  }

  // Auto-checkpoint methods
  async createAutoCheckpoint(projectPath: string, trigger: string): Promise<Checkpoint> {
    const name = `Auto: ${trigger} - ${new Date().toLocaleString()}`;
    return this.createCheckpoint(projectPath, name);
  }

  async cleanupOldCheckpoints(projectPath: string, keepCount: number = 10): Promise<void> {
    try {
      const checkpoints = await this.listCheckpoints(projectPath);
      
      if (checkpoints.length <= keepCount) {
        return;
      }
      
      // Sort by timestamp descending (newest first)
      checkpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Delete old checkpoints
      const toDelete = checkpoints.slice(keepCount);
      for (const checkpoint of toDelete) {
        await this.deleteCheckpoint(projectPath, checkpoint.id);
      }
      
      logger.info('Cleaned up old checkpoints', {
        projectPath,
        deleted: toDelete.length,
        remaining: keepCount
      });
    } catch (error) {
      logger.error('Failed to cleanup old checkpoints', error);
      // Don't throw - this is a cleanup operation
    }
  }
}