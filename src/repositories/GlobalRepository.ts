import { eq, and } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { globalPreferences, type GlobalPreference, type NewGlobalPreference } from '../db/schemas/global.js';
import { BaseRepository } from './BaseRepository.js';
import type { IGlobalRepository, GlobalMemory } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class GlobalRepository extends BaseRepository<GlobalPreference, number> implements IGlobalRepository {
  private db: BetterSQLite3Database;

  constructor(db: BetterSQLite3Database) {
    super('global_preferences');
    this.db = db;
  }

  async findAll(): Promise<GlobalPreference[]> {
    try {
      this.logOperation('findAll');
      return await this.db.select().from(globalPreferences).all();
    } catch (error) {
      this.handleError('findAll', error);
    }
  }

  async findById(id: number): Promise<GlobalPreference | null> {
    try {
      this.logOperation('findById', { id });
      const result = await this.db
        .select()
        .from(globalPreferences)
        .where(eq(globalPreferences.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('findById', error);
    }
  }

  async create(data: Partial<GlobalPreference>): Promise<GlobalPreference> {
    try {
      this.validateInput(data, ['category', 'key', 'value']);
      this.logOperation('create', data);
      
      const result = await this.db
        .insert(globalPreferences)
        .values(data as NewGlobalPreference)
        .returning();
      return result[0];
    } catch (error) {
      this.handleError('create', error);
    }
  }

  async update(id: number, data: Partial<GlobalPreference>): Promise<GlobalPreference | null> {
    try {
      this.logOperation('update', { id, data });
      
      const result = await this.db
        .update(globalPreferences)
        .set({
          ...data,
          updated_at: new Date().toISOString()
        })
        .where(eq(globalPreferences.id, id))
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
        .delete(globalPreferences)
        .where(eq(globalPreferences.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      this.handleError('delete', error);
    }
  }

  // IGlobalRepository specific methods
  async savePreference(category: string, key: string, value: string, type: string = 'string'): Promise<void> {
    try {
      this.logOperation('savePreference', { category, key, value, type });
      
      // Check if preference already exists
      const existing = await this.db
        .select()
        .from(globalPreferences)
        .where(and(
          eq(globalPreferences.category, category),
          eq(globalPreferences.key, key)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing preference
        await this.db
          .update(globalPreferences)
          .set({
            value,
            type,
            updated_at: new Date().toISOString()
          })
          .where(eq(globalPreferences.id, existing[0].id));
      } else {
        // Create new preference
        await this.db
          .insert(globalPreferences)
          .values({
            category,
            key,
            value,
            type
          });
      }
    } catch (error) {
      this.handleError('savePreference', error);
    }
  }

  async getPreference(category: string, key?: string): Promise<any> {
    try {
      this.logOperation('getPreference', { category, key });
      
      if (key) {
        // Get specific preference
        const result = await this.db
          .select()
          .from(globalPreferences)
          .where(and(
            eq(globalPreferences.category, category),
            eq(globalPreferences.key, key)
          ))
          .limit(1);
        
        if (result.length === 0) return null;
        
        return this.parseValue(result[0].value, result[0].type);
      } else {
        // Get all preferences in category
        const results = await this.db
          .select()
          .from(globalPreferences)
          .where(eq(globalPreferences.category, category));
        
        const preferences: Record<string, any> = {};
        for (const pref of results) {
          preferences[pref.key] = this.parseValue(pref.value, pref.type);
        }
        
        return preferences;
      }
    } catch (error) {
      this.handleError('getPreference', error);
    }
  }

  async getAllPreferences(): Promise<GlobalMemory> {
    try {
      this.logOperation('getAllPreferences');
      
      const allPrefs = await this.db.select().from(globalPreferences).all();
      
      const globalMemory: GlobalMemory = {
        user_preferences: {},
        development_style: {},
        communication_style: {}
      };
      
      for (const pref of allPrefs) {
        const value = this.parseValue(pref.value, pref.type);
        
        switch (pref.category) {
          case 'user_preferences':
            globalMemory.user_preferences[pref.key] = value;
            break;
          case 'development_style':
            globalMemory.development_style[pref.key] = value;
            break;
          case 'communication_style':
            globalMemory.communication_style[pref.key] = value;
            break;
          default:
            logger.warn(`Unknown preference category: ${pref.category}`);
        }
      }
      
      return globalMemory;
    } catch (error) {
      this.handleError('getAllPreferences', error);
    }
  }

  async deletePreference(category: string, key?: string): Promise<void> {
    try {
      this.logOperation('deletePreference', { category, key });
      
      if (key) {
        // Delete specific preference
        await this.db
          .delete(globalPreferences)
          .where(and(
            eq(globalPreferences.category, category),
            eq(globalPreferences.key, key)
          ));
      } else {
        // Delete all preferences in category
        await this.db
          .delete(globalPreferences)
          .where(eq(globalPreferences.category, category));
      }
    } catch (error) {
      this.handleError('deletePreference', error);
    }
  }

  private parseValue(value: string, type: string): any {
    try {
      switch (type) {
        case 'string':
          return value;
        case 'number':
          return Number(value);
        case 'boolean':
          return value === 'true';
        case 'json':
          return JSON.parse(value);
        default:
          return value;
      }
    } catch (error) {
      logger.warn(`Failed to parse value: ${value} as ${type}`, error);
      return value;
    }
  }
}