import { logger } from '../utils/logger.js';
import type { IRepository } from '../types/index.js';

export abstract class BaseRepository<T, K> implements IRepository<T, K> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  abstract findAll(): Promise<T[]>;
  abstract findById(id: K): Promise<T | null>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: K, data: Partial<T>): Promise<T | null>;
  abstract delete(id: K): Promise<boolean>;

  protected logOperation(operation: string, details?: any) {
    logger.debug({
      msg: `Repository operation: ${operation}`,
      table: this.tableName,
      details
    });
  }

  protected handleError(operation: string, error: any): never {
    logger.error({
      msg: `Repository error: ${operation}`,
      table: this.tableName,
      error: error.message || error
    });
    throw error;
  }

  protected validateInput(data: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  protected sanitizeData<T extends Record<string, any>>(data: T, allowedFields: string[]): Partial<T> {
    const sanitized: Partial<T> = {};
    for (const field of allowedFields) {
      if (field in data) {
        sanitized[field as keyof T] = data[field];
      }
    }
    return sanitized;
  }
}