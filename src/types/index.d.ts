// Type definitions for MCP Memory Server

export interface GlobalMemory {
  user_preferences: UserPreferences;
  development_style: DevelopmentStyle;
  communication_style: CommunicationStyle;
}

export interface UserPreferences {
  language: string;
  commit_style: string;
  package_manager: string;
  container: string;
  test_coverage: string;
}

export interface DevelopmentStyle {
  branch_strategy: string;
  pr_target: string;
  testing: string;
  linting: string;
}

export interface CommunicationStyle {
  response: string;
  explanation: string;
  error_handling: string;
}

export interface ProjectMemory {
  path: string;
  current_issue: IssueContext;
  tasks: TaskList;
  checkpoint: CheckpointInfo;
  session?: SessionState;
}

export interface IssueContext {
  number: number;
  title: string;
  requirements: string[];
  design_decisions: string[];
}

export interface TaskList {
  completed: Task[];
  in_progress: Task | null;
  pending: Task[];
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: number;
  created_at: Date;
  completed_at?: Date;
}

export interface CheckpointInfo {
  id: string;
  name?: string;
  timestamp: Date;
  branch: string;
  last_command: string;
  next_action: string;
}

export interface SessionState {
  current_task: string;
  branch: string;
  modified_files: string[];
  last_checkpoint: Date;
}

export interface Checkpoint {
  id: string;
  project_id: number;
  name?: string;
  timestamp: Date;
  snapshot_data: string;
  checksum: string;
}

export interface ProjectInfo {
  id: number;
  project_path: string;
  project_name: string;
  created_at: Date;
  last_accessed: Date;
}

export interface DevTeamMemory {
  issue: {
    context: IssueContext;
    requirements: string[];
    design: DesignDecision[];
    tasks: TaskList;
  };
  session: {
    currentTask: string;
    branch: string;
    modifiedFiles: string[];
    lastCheckpoint: Date;
  };
  autoSave: {
    onTaskComplete: boolean;
    onTestPass: boolean;
    interval: number;
  };
}

export interface DesignDecision {
  id: string;
  description: string;
  rationale: string;
  timestamp: Date;
}

export type ExportFormat = 'json' | 'yaml';

export interface ServerConfig {
  storage: {
    basePath: string;
    databases: {
      global: string;
      projects: string;
    };
    backups: {
      enabled: boolean;
      retention: number;
      schedule: string;
    };
  };
  performance: {
    cache: {
      enabled: boolean;
      maxSize: number;
      ttl: number;
    };
    database: {
      connectionPool: {
        min: number;
        max: number;
      };
      optimization: boolean;
    };
  };
  security: {
    encryption: {
      enabled: boolean;
      algorithm: string;
    };
    accessControl: {
      enabled: boolean;
      allowedPaths: string[];
    };
  };
  autoSave: {
    enabled: boolean;
    interval: number;
    triggers: string[];
  };
  logging: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: number;
  };
}

export interface CacheConfig {
  maxSize?: number;
  ttl?: number;
}

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
}

export interface ShardingConfig {
  shardCount?: number;
  shardPath: string;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: Record<string, ServiceHealth>;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  error?: string;
}

export interface IHealthCheckable {
  checkHealth(): Promise<ServiceHealth>;
}

export interface PerformanceReport {
  [operation: string]: {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  };
}

export interface Metric {
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
}

export interface BackupInfo {
  id: string;
  name: string;
  timestamp: Date;
  size: number;
  checksum: string;
}

export interface EncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
}

export interface AccessControlConfig {
  dbPath: string;
  allowedPaths: string[];
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Memory Manager Interfaces
export interface IMemoryManager {
  // Global preference methods
  saveGlobalPreference(category: string, key: string, value: string): Promise<void>;
  getGlobalPreference(category: string, key?: string): Promise<Record<string, any> | string | null>;
  getAllGlobalPreferences(): Promise<GlobalMemory>;
  deleteGlobalPreference(category: string, key?: string): Promise<void>;
  
  // Project context methods
  saveProjectContext(projectPath: string, context: Partial<ProjectMemory>): Promise<void>;
  getProjectContext(projectPath: string): Promise<ProjectMemory | null>;
  listProjects(): Promise<ProjectInfo[]>;
  deleteProject(projectPath: string): Promise<void>;
  
  // Issue context methods
  saveIssueContext(projectPath: string, issue: IssueContext): Promise<void>;
  getIssueContext(projectPath: string): Promise<IssueContext | null>;
  
  // Task management methods
  saveTasks(projectPath: string, tasks: TaskList): Promise<void>;
  getTasks(projectPath: string): Promise<TaskList | null>;
  updateTaskStatus(projectPath: string, taskId: string, status: Task['status']): Promise<void>;
  
  // Session state methods
  saveSessionState(projectPath: string, session: SessionState): Promise<void>;
  getSessionState(projectPath: string): Promise<SessionState | null>;
  
  // Export methods
  exportMemory(format: ExportFormat): Promise<string>;
  exportProjectMemory(projectPath: string, format: ExportFormat): Promise<string>;
}

// Checkpoint Manager Interfaces
export interface ICheckpointManager {
  createCheckpoint(projectPath: string, name?: string): Promise<Checkpoint>;
  listCheckpoints(projectPath: string): Promise<Checkpoint[]>;
  restoreCheckpoint(projectPath: string, checkpointId: string): Promise<void>;
  deleteCheckpoint(projectPath: string, checkpointId: string): Promise<void>;
  compareCheckpoints(projectPath: string, checkpointId1: string, checkpointId2: string): Promise<any>;
}

// Repository Interfaces
export interface IRepository<T, K> {
  findAll(): Promise<T[]>;
  findById(id: K): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: K, data: Partial<T>): Promise<T | null>;
  delete(id: K): Promise<boolean>;
}

export interface IGlobalRepository {
  savePreference(category: string, key: string, value: string, type?: string): Promise<void>;
  getPreference(category: string, key?: string): Promise<any>;
  getAllPreferences(): Promise<GlobalMemory>;
  deletePreference(category: string, key?: string): Promise<void>;
}

export interface IProjectRepository {
  createProject(projectPath: string, projectName: string): Promise<ProjectInfo>;
  getProject(projectPath: string): Promise<ProjectInfo | null>;
  updateProject(projectPath: string, data: Partial<ProjectInfo>): Promise<void>;
  deleteProject(projectPath: string): Promise<void>;
  listProjects(): Promise<ProjectInfo[]>;
  
  // Issue methods
  saveIssue(projectId: number, issue: Partial<CurrentIssue>): Promise<void>;
  getIssue(projectId: number): Promise<CurrentIssue | null>;
  
  // Task methods
  saveTasks(projectId: number, tasks: Task[]): Promise<void>;
  getTasks(projectId: number): Promise<Task[]>;
  updateTask(taskId: number, data: Partial<Task>): Promise<void>;
  
  // Session methods
  saveSession(projectId: number, session: Partial<SessionState>): Promise<void>;
  getSession(projectId: number): Promise<SessionState | null>;
}

// Auto-save service interface
export interface IAutoSaveService {
  start(): void;
  stop(): void;
  triggerSave(trigger: string): Promise<void>;
  setInterval(interval: number): void;
}

// Memory Configuration
export interface MemoryConfig {
  cacheSize?: number;
  cacheTTL?: number;
  enableCache?: boolean;
}
