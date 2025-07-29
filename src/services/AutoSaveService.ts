import { logger } from '../utils/logger.js';
import type { IAutoSaveService, IMemoryManager, ICheckpointManager } from '../types/index.js';

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // minutes
  triggers: string[];
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

export interface SaveEvent {
  type: 'task_complete' | 'test_pass' | 'manual' | 'interval';
  projectPath: string;
  metadata?: Record<string, any>;
}

export class AutoSaveService implements IAutoSaveService {
  private intervals: Map<string, NodeJS.Timeout>;
  private configs: Map<string, AutoSaveConfig>;
  private memoryManager: IMemoryManager;
  private checkpointManager: ICheckpointManager;
  private saveQueue: Map<string, SaveEvent[]>;
  private isProcessing: Map<string, boolean>;
  private retryCount: Map<string, number>;

  constructor(
    memoryManager: IMemoryManager,
    checkpointManager: ICheckpointManager
  ) {
    this.intervals = new Map();
    this.configs = new Map();
    this.memoryManager = memoryManager;
    this.checkpointManager = checkpointManager;
    this.saveQueue = new Map();
    this.isProcessing = new Map();
    this.retryCount = new Map();
  }

  start(): void {
    logger.info('AutoSaveService started');
    // Start processing queued saves
    this.startQueueProcessor();
  }

  stop(): void {
    logger.info('Stopping AutoSaveService');
    
    // Clear all intervals
    for (const [projectPath, interval] of this.intervals) {
      clearInterval(interval);
      logger.debug(`Cleared interval for project: ${projectPath}`);
    }
    this.intervals.clear();
    
    // Process any remaining saves in queue
    this.processAllQueues();
    
    logger.info('AutoSaveService stopped');
  }

  registerProject(projectPath: string, config: AutoSaveConfig): void {
    logger.info(`Registering project for auto-save: ${projectPath}`, { config });
    
    // Clear existing interval if any
    if (this.intervals.has(projectPath)) {
      const interval = this.intervals.get(projectPath);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(projectPath);
      }
    }
    
    // Store configuration after clearing interval
    this.configs.set(projectPath, config);
    
    if (config.enabled && config.interval > 0) {
      // Set up interval-based auto-save
      const interval = setInterval(
        () => this.performAutoSave(projectPath, 'interval'),
        config.interval * 60 * 1000 // Convert minutes to milliseconds
      );
      
      this.intervals.set(projectPath, interval);
      logger.debug(`Set auto-save interval for project: ${projectPath} (${config.interval} minutes)`);
    }
    
    // Initialize queue for this project
    if (!this.saveQueue.has(projectPath)) {
      this.saveQueue.set(projectPath, []);
    }
  }

  unregisterProject(projectPath: string): void {
    logger.info(`Unregistering project from auto-save: ${projectPath}`);
    
    // Clear interval
    const interval = this.intervals.get(projectPath);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(projectPath);
    }
    
    // Process any remaining saves for this project
    this.processProjectQueue(projectPath);
    
    // Clean up
    this.configs.delete(projectPath);
    this.saveQueue.delete(projectPath);
    this.isProcessing.delete(projectPath);
    this.retryCount.delete(projectPath);
  }

  async triggerSave(projectPath: string, event: SaveEvent): Promise<void> {
    const config = this.configs.get(projectPath);
    
    if (!config || !config.enabled) {
      logger.debug(`Auto-save not enabled for project: ${projectPath}`);
      return;
    }
    
    // Check if this trigger type is enabled
    if (event.type !== 'manual' && event.type !== 'interval' && 
        !config.triggers.includes(event.type)) {
      logger.debug(`Trigger type '${event.type}' not enabled for project: ${projectPath}`);
      return;
    }
    
    // Add to queue
    const queue = this.saveQueue.get(projectPath) || [];
    queue.push(event);
    this.saveQueue.set(projectPath, queue);
    
    logger.info(`Queued auto-save for project: ${projectPath}`, { 
      event: event.type, 
      queueLength: queue.length 
    });
    
    // Process queue if not already processing
    if (!this.isProcessing.get(projectPath)) {
      await this.processProjectQueue(projectPath);
    }
  }

  private async performAutoSave(projectPath: string, eventType: SaveEvent['type']): Promise<void> {
    await this.triggerSave(projectPath, {
      type: eventType,
      projectPath,
      metadata: {
        timestamp: new Date().toISOString(),
        automatic: true
      }
    });
  }

  private startQueueProcessor(): void {
    // Process queues every 5 seconds
    setInterval(() => {
      this.processAllQueues();
    }, 5000);
  }

  private async processAllQueues(): Promise<void> {
    const projects = Array.from(this.saveQueue.keys());
    
    await Promise.all(
      projects.map(projectPath => this.processProjectQueue(projectPath))
    );
  }

  private async processProjectQueue(projectPath: string): Promise<void> {
    const queue = this.saveQueue.get(projectPath);
    if (!queue || queue.length === 0) {
      return;
    }
    
    // Check if already processing
    if (this.isProcessing.get(projectPath)) {
      return;
    }
    
    this.isProcessing.set(projectPath, true);
    
    try {
      // Process saves in order
      while (queue.length > 0) {
        const event = queue.shift()!;
        await this.executeSave(projectPath, event);
      }
    } finally {
      this.isProcessing.set(projectPath, false);
    }
  }

  private async executeSave(projectPath: string, event: SaveEvent): Promise<void> {
    const config = this.configs.get(projectPath);
    const maxRetries = config?.maxRetries || 3;
    const retryDelay = config?.retryDelay || 1000;
    
    let attempt = 0;
    let lastError: Error | null = null;
    
    while (attempt < maxRetries) {
      try {
        logger.info(`Executing auto-save for project: ${projectPath}`, {
          event: event.type,
          attempt: attempt + 1
        });
        
        // Create checkpoint with event metadata
        const checkpointName = `Auto-save: ${event.type} - ${new Date().toLocaleString()}`;
        await this.checkpointManager.createCheckpoint(projectPath, checkpointName);
        
        logger.info(`Auto-save completed for project: ${projectPath}`);
        
        // Reset retry count on success
        this.retryCount.delete(projectPath);
        return;
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        logger.error(`Auto-save failed for project: ${projectPath}`, {
          error: lastError.message,
          attempt,
          maxRetries
        });
        
        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    // All retries failed
    logger.error(`Auto-save failed after ${maxRetries} attempts for project: ${projectPath}`, {
      error: lastError?.message
    });
    
    // Track consecutive failures
    const failures = (this.retryCount.get(projectPath) || 0) + 1;
    this.retryCount.set(projectPath, failures);
    
    // Disable auto-save if too many consecutive failures
    if (failures >= 5) {
      logger.warn(`Disabling auto-save for project due to repeated failures: ${projectPath}`);
      const config = this.configs.get(projectPath);
      if (config) {
        config.enabled = false;
        this.configs.set(projectPath, config);
      }
    }
  }

  setInterval(interval: number): void {
    // Update interval for all registered projects
    for (const [projectPath, config] of this.configs) {
      // Clear existing interval if any
      const existingInterval = this.intervals.get(projectPath);
      if (existingInterval) {
        clearInterval(existingInterval);
        this.intervals.delete(projectPath);
      }
      
      // Update config
      config.interval = interval;
      this.configs.set(projectPath, config);
      
      // Set up new interval if enabled
      if (config.enabled && interval > 0) {
        const newInterval = setInterval(
          () => this.performAutoSave(projectPath, 'interval'),
          interval * 60 * 1000
        );
        this.intervals.set(projectPath, newInterval);
      }
    }
    
    logger.info(`Updated auto-save interval to ${interval} minutes for all projects`);
  }

  // Helper methods for monitoring
  getStatus(projectPath?: string): any {
    if (projectPath) {
      const config = this.configs.get(projectPath);
      if (!config) {
        return undefined;
      }
      
      return {
        projectPath,
        config,
        queueLength: this.saveQueue.get(projectPath)?.length || 0,
        isProcessing: this.isProcessing.get(projectPath) || false,
        retryCount: this.retryCount.get(projectPath) || 0,
        hasInterval: this.intervals.has(projectPath)
      };
    }
    
    // Return status for all projects
    const status: Record<string, any> = {};
    for (const path of this.configs.keys()) {
      status[path] = this.getStatus(path);
    }
    return status;
  }

  // Method to manually trigger a save for all projects
  async saveAll(): Promise<void> {
    const projects = Array.from(this.configs.keys());
    
    await Promise.all(
      projects.map(projectPath => 
        this.triggerSave(projectPath, {
          type: 'manual',
          projectPath,
          metadata: {
            timestamp: new Date().toISOString(),
            reason: 'manual_save_all'
          }
        })
      )
    );
  }
}