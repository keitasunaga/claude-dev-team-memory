import { eq, desc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import crypto from 'node:crypto';
import {
  checkpoints,
  type Checkpoint,
  type NewCheckpoint
} from '../db/schemas/project.js';
import { BaseRepository } from './BaseRepository.js';
import { logger } from '../utils/logger.js';

export class CheckpointRepository extends BaseRepository<Checkpoint, number> {
  private db: BetterSQLite3Database;

  constructor(db: BetterSQLite3Database) {
    super('checkpoints');
    this.db = db;
  }

  async findAll(): Promise<Checkpoint[]> {
    try {
      this.logOperation('findAll');
      return await this.db
        .select()
        .from(checkpoints)
        .orderBy(desc(checkpoints.created_at))
        .all();
    } catch (error) {
      this.handleError('findAll', error);
    }
  }

  async findById(id: number): Promise<Checkpoint | null> {
    try {
      this.logOperation('findById', { id });
      const result = await this.db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('findById', error);
    }
  }

  async create(data: Partial<Checkpoint>): Promise<Checkpoint> {
    try {
      this.validateInput(data, ['project_id', 'snapshot_data']);
      this.logOperation('create', data);
      
      const result = await this.db
        .insert(checkpoints)
        .values(data as NewCheckpoint)
        .returning();
      return result[0];
    } catch (error) {
      this.handleError('create', error);
    }
  }

  async update(id: number, data: Partial<Checkpoint>): Promise<Checkpoint | null> {
    try {
      this.logOperation('update', { id, data });
      
      const result = await this.db
        .update(checkpoints)
        .set(data)
        .where(eq(checkpoints.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      this.handleError('update', error);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      this.logOperation('delete', { id });
      
      const result = await this.db
        .delete(checkpoints)
        .where(eq(checkpoints.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      this.handleError('delete', error);
    }
  }

  // Additional checkpoint-specific methods
  async findByProjectId(projectId: number): Promise<Checkpoint[]> {
    try {
      this.logOperation('findByProjectId', { projectId });
      return await this.db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.project_id, projectId))
        .orderBy(desc(checkpoints.created_at))
        .all();
    } catch (error) {
      this.handleError('findByProjectId', error);
    }
  }

  async createCheckpoint(
    projectId: number,
    name: string | undefined,
    snapshotData: any,
    branchName?: string,
    lastCommand?: string,
    nextAction?: string
  ): Promise<Checkpoint> {
    try {
      const jsonData = JSON.stringify(snapshotData);
      const checksum = this.calculateChecksum(jsonData);
      
      const checkpoint: Partial<Checkpoint> = {
        project_id: projectId,
        checkpoint_name: name,
        branch_name: branchName,
        last_command: lastCommand,
        next_action: nextAction,
        snapshot_data: jsonData
      };
      
      return await this.create(checkpoint);
    } catch (error) {
      this.handleError('createCheckpoint', error);
    }
  }

  async getLatestCheckpoint(projectId: number): Promise<Checkpoint | null> {
    try {
      this.logOperation('getLatestCheckpoint', { projectId });
      const result = await this.db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.project_id, projectId))
        .orderBy(desc(checkpoints.created_at))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('getLatestCheckpoint', error);
    }
  }

  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async validateCheckpoint(checkpoint: Checkpoint): boolean {
    try {
      const calculatedChecksum = this.calculateChecksum(checkpoint.snapshot_data);
      // Note: We'll need to add a checksum column to the schema
      // For now, we'll just validate the JSON
      JSON.parse(checkpoint.snapshot_data);
      return true;
    } catch (error) {
      logger.error('Invalid checkpoint data', { id: checkpoint.id, error });
      return false;
    }
  }
}