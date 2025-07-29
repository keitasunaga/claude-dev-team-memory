import { z } from 'zod';

// Request schemas
export const saveGlobalPreferenceSchema = z.object({
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.string()
});

export const getGlobalPreferenceSchema = z.object({
  category: z.string().min(1),
  key: z.string().optional()
});

export const deleteGlobalPreferenceSchema = z.object({
  category: z.string().min(1),
  key: z.string().optional()
});

export const saveProjectContextSchema = z.object({
  project_path: z.string().min(1),
  context: z.object({
    current_issue: z.object({
      number: z.number(),
      title: z.string(),
      requirements: z.array(z.string()),
      design_decisions: z.array(z.string())
    }).optional(),
    tasks: z.object({
      completed: z.array(z.object({
        id: z.string(),
        description: z.string(),
        status: z.literal('completed'),
        priority: z.number(),
        created_at: z.string().or(z.date()),
        completed_at: z.string().or(z.date()).optional()
      })),
      in_progress: z.object({
        id: z.string(),
        description: z.string(),
        status: z.literal('in_progress'),
        priority: z.number(),
        created_at: z.string().or(z.date())
      }).nullable(),
      pending: z.array(z.object({
        id: z.string(),
        description: z.string(),
        status: z.literal('pending'),
        priority: z.number(),
        created_at: z.string().or(z.date())
      }))
    }).optional(),
    session: z.object({
      current_task: z.string(),
      branch: z.string(),
      modified_files: z.array(z.string()),
      last_checkpoint: z.string().or(z.date())
    }).optional()
  })
});

export const getProjectContextSchema = z.object({
  project_path: z.string().min(1)
});

export const deleteProjectSchema = z.object({
  project_path: z.string().min(1)
});

export const saveIssueContextSchema = z.object({
  project_path: z.string().min(1),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    requirements: z.array(z.string()),
    design_decisions: z.array(z.string())
  })
});

export const saveTasksSchema = z.object({
  project_path: z.string().min(1),
  tasks: z.object({
    completed: z.array(z.any()),
    in_progress: z.any().nullable(),
    pending: z.array(z.any())
  })
});

export const updateTaskStatusSchema = z.object({
  project_path: z.string().min(1),
  task_id: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'completed'])
});

export const saveSessionStateSchema = z.object({
  project_path: z.string().min(1),
  session: z.object({
    current_task: z.string(),
    branch: z.string(),
    modified_files: z.array(z.string()),
    last_checkpoint: z.string().or(z.date())
  })
});

export const createCheckpointSchema = z.object({
  project_path: z.string().min(1),
  name: z.string().optional()
});

export const listCheckpointsSchema = z.object({
  project_path: z.string().min(1)
});

export const restoreCheckpointSchema = z.object({
  project_path: z.string().min(1),
  checkpoint_id: z.string().min(1)
});

export const deleteCheckpointSchema = z.object({
  project_path: z.string().min(1),
  checkpoint_id: z.string().min(1)
});

export const compareCheckpointsSchema = z.object({
  project_path: z.string().min(1),
  checkpoint_id1: z.string().min(1),
  checkpoint_id2: z.string().min(1)
});

export const exportMemorySchema = z.object({
  format: z.enum(['json', 'yaml'])
});

export const exportProjectMemorySchema = z.object({
  project_path: z.string().min(1),
  format: z.enum(['json', 'yaml'])
});

// Auto-save schemas
export const registerAutoSaveSchema = z.object({
  project_path: z.string().min(1),
  config: z.object({
    enabled: z.boolean(),
    interval: z.number().min(1), // minutes
    triggers: z.array(z.enum(['task_complete', 'test_pass'])),
    maxRetries: z.number().optional(),
    retryDelay: z.number().optional()
  })
});

export const triggerAutoSaveSchema = z.object({
  project_path: z.string().min(1),
  event: z.object({
    type: z.enum(['task_complete', 'test_pass', 'manual', 'interval']),
    projectPath: z.string(),
    metadata: z.record(z.any()).optional()
  })
});

// Response type definitions
export type SaveGlobalPreferenceParams = z.infer<typeof saveGlobalPreferenceSchema>;
export type GetGlobalPreferenceParams = z.infer<typeof getGlobalPreferenceSchema>;
export type DeleteGlobalPreferenceParams = z.infer<typeof deleteGlobalPreferenceSchema>;
export type SaveProjectContextParams = z.infer<typeof saveProjectContextSchema>;
export type GetProjectContextParams = z.infer<typeof getProjectContextSchema>;
export type DeleteProjectParams = z.infer<typeof deleteProjectSchema>;
export type SaveIssueContextParams = z.infer<typeof saveIssueContextSchema>;
export type SaveTasksParams = z.infer<typeof saveTasksSchema>;
export type UpdateTaskStatusParams = z.infer<typeof updateTaskStatusSchema>;
export type SaveSessionStateParams = z.infer<typeof saveSessionStateSchema>;
export type CreateCheckpointParams = z.infer<typeof createCheckpointSchema>;
export type ListCheckpointsParams = z.infer<typeof listCheckpointsSchema>;
export type RestoreCheckpointParams = z.infer<typeof restoreCheckpointSchema>;
export type DeleteCheckpointParams = z.infer<typeof deleteCheckpointSchema>;
export type CompareCheckpointsParams = z.infer<typeof compareCheckpointsSchema>;
export type ExportMemoryParams = z.infer<typeof exportMemorySchema>;
export type ExportProjectMemoryParams = z.infer<typeof exportProjectMemorySchema>;
export type RegisterAutoSaveParams = z.infer<typeof registerAutoSaveSchema>;
export type TriggerAutoSaveParams = z.infer<typeof triggerAutoSaveSchema>;