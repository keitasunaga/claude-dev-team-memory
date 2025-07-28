// Memory Manager Types
export interface GlobalMemory {
  preferences: Record<string, any>;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemory {
  projectId: string;
  issueNumber?: number;
  issueTitle?: string;
  requirements?: string;
  design?: string;
  tasks?: string;
  currentProgress?: string;
  checkpoints: Checkpoint[];
  createdAt: string;
  updatedAt: string;
}

export interface Checkpoint {
  id: string;
  timestamp: string;
  description: string;
  state: Record<string, any>;
  filesModified: string[];
}

// Spec to Issue Types
export interface SpecificationStructure {
  name: string;
  path: string;
  files: {
    requirement: boolean;
    design: boolean;
    tasks: boolean;
  };
}

export interface IssueContent {
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  milestone?: string;
  projectId?: number;
}

export interface RepositoryConfig {
  name: string;
  type: 'frontend' | 'backend' | 'blockchain' | 'other';
  techStack: string[];
  defaultLabels: string[];
}

// MCP Server Types
export interface MCPRequest {
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}