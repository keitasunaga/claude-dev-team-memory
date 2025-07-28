// Sample data for testing

export const sampleGlobalPreferences = [
  {
    category: 'user_preferences',
    key: 'language',
    value: 'ja',
    type: 'string',
  },
  {
    category: 'user_preferences',
    key: 'commit_style',
    value: 'conventional',
    type: 'string',
  },
  {
    category: 'development_style',
    key: 'branch_strategy',
    value: 'feature-branch',
    type: 'string',
  },
  {
    category: 'communication_style',
    key: 'response',
    value: 'concise',
    type: 'string',
  },
];

export const sampleProjectContext = {
  path: '/home/user/test-project',
  current_issue: {
    number: 42,
    title: 'Implement user authentication',
    requirements: [
      'Support email/password login',
      'Implement JWT tokens',
      'Add password reset functionality',
    ],
    design_decisions: ['Use bcrypt for password hashing', 'JWT tokens expire after 24 hours'],
  },
  tasks: {
    completed: [
      {
        id: 'task-1',
        description: 'Set up project structure',
        status: 'completed',
        priority: 1,
        created_at: new Date('2024-01-01T10:00:00Z'),
        completed_at: new Date('2024-01-01T11:00:00Z'),
      },
    ],
    in_progress: {
      id: 'task-2',
      description: 'Implement login endpoint',
      status: 'in_progress',
      priority: 2,
      created_at: new Date('2024-01-01T11:30:00Z'),
    },
    pending: [
      {
        id: 'task-3',
        description: 'Add password reset',
        status: 'pending',
        priority: 3,
        created_at: new Date('2024-01-01T12:00:00Z'),
      },
    ],
  },
  checkpoint: {
    id: 'checkpoint-1',
    name: 'Authentication MVP',
    timestamp: new Date('2024-01-01T15:00:00Z'),
    branch: 'feature/auth',
    last_command: 'npm test',
    next_action: 'Implement password validation',
  },
  session: {
    current_task: 'task-2',
    branch: 'feature/auth',
    modified_files: ['src/auth/login.ts', 'src/auth/types.ts', 'tests/auth.test.ts'],
    last_checkpoint: new Date('2024-01-01T14:30:00Z'),
  },
};

export const sampleCheckpoints = [
  {
    id: 'checkpoint-1',
    project_id: 1,
    name: 'Initial setup complete',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    branch: 'main',
    last_command: 'npm install',
    next_action: 'Start implementing core features',
    snapshot_data: JSON.stringify({
      files: ['package.json', 'tsconfig.json'],
      dependencies_installed: true,
    }),
  },
  {
    id: 'checkpoint-2',
    project_id: 1,
    name: 'Authentication foundation',
    timestamp: new Date('2024-01-01T14:00:00Z'),
    branch: 'feature/auth',
    last_command: 'npm run test:auth',
    next_action: 'Add password reset functionality',
    snapshot_data: JSON.stringify({
      files: ['src/auth/login.ts', 'src/auth/types.ts'],
      tests_passing: true,
      coverage: 85,
    }),
  },
];

export const sampleTasks = [
  {
    id: 'task-1',
    description: 'Set up project structure and dependencies',
    status: 'completed',
    priority: 1,
    created_at: new Date('2024-01-01T09:00:00Z'),
    completed_at: new Date('2024-01-01T10:30:00Z'),
  },
  {
    id: 'task-2',
    description: 'Implement user login endpoint',
    status: 'in_progress',
    priority: 2,
    created_at: new Date('2024-01-01T10:30:00Z'),
  },
  {
    id: 'task-3',
    description: 'Add JWT token validation middleware',
    status: 'pending',
    priority: 2,
    created_at: new Date('2024-01-01T11:00:00Z'),
  },
  {
    id: 'task-4',
    description: 'Implement password reset flow',
    status: 'pending',
    priority: 3,
    created_at: new Date('2024-01-01T11:30:00Z'),
  },
];

export const sampleProjectInfo = {
  id: 1,
  project_path: '/home/user/test-project',
  project_name: 'Test Project',
  created_at: new Date('2024-01-01T09:00:00Z'),
  last_accessed: new Date('2024-01-01T15:00:00Z'),
};

export const sampleSessionState = {
  id: 1,
  project_id: 1,
  current_task: 'task-2',
  branch: 'feature/auth',
  modified_files: JSON.stringify(['src/auth/login.ts', 'src/auth/types.ts', 'tests/auth.test.ts']),
  last_checkpoint: new Date('2024-01-01T14:30:00Z').toISOString(),
  updated_at: new Date('2024-01-01T15:00:00Z').toISOString(),
};

// Utility functions for creating test data
export const createSampleGlobalPreference = (overrides?: Partial<any>) => ({
  category: 'test_category',
  key: 'test_key',
  value: 'test_value',
  type: 'string',
  ...overrides,
});

export const createSampleTask = (overrides?: Partial<any>) => ({
  id: `task-${Date.now()}`,
  description: 'Sample task description',
  status: 'pending',
  priority: 1,
  created_at: new Date(),
  ...overrides,
});

export const createSampleCheckpoint = (overrides?: Partial<any>) => ({
  id: `checkpoint-${Date.now()}`,
  project_id: 1,
  name: 'Sample checkpoint',
  timestamp: new Date(),
  branch: 'main',
  last_command: 'npm test',
  next_action: 'Continue development',
  snapshot_data: JSON.stringify({ test: true }),
  ...overrides,
});
