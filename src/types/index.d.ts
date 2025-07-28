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
