import { z } from 'zod';

export const WorkflowStepStatus = z.enum([
  'Locked',
  'Ready',
  'In Progress',
  'Complete',
  'Skipped',
  'Failed'
]);

export const WORKFLOW_STEP_STATUS = {
  LOCKED: 'Locked',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  SKIPPED: 'Skipped',
  FAILED: 'Failed'
};

export const WORKFLOW_STEP_TRANSITIONS = {
  [WORKFLOW_STEP_STATUS.LOCKED]: [WORKFLOW_STEP_STATUS.READY],
  [WORKFLOW_STEP_STATUS.READY]: [WORKFLOW_STEP_STATUS.IN_PROGRESS, WORKFLOW_STEP_STATUS.SKIPPED],
  [WORKFLOW_STEP_STATUS.IN_PROGRESS]: [WORKFLOW_STEP_STATUS.COMPLETE, WORKFLOW_STEP_STATUS.FAILED, WORKFLOW_STEP_STATUS.READY],
  [WORKFLOW_STEP_STATUS.COMPLETE]: [],
  [WORKFLOW_STEP_STATUS.SKIPPED]: [WORKFLOW_STEP_STATUS.READY],
  [WORKFLOW_STEP_STATUS.FAILED]: [WORKFLOW_STEP_STATUS.READY]
};

export const ContentGenerationStatus = z.enum([
  'Pending',
  'Processing',
  'Complete',
  'Failed'
]);

export const CONTENT_GENERATION_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETE: 'Complete',
  FAILED: 'Failed'
};

export const CONTENT_GENERATION_TRANSITIONS = {
  [CONTENT_GENERATION_STATUS.PENDING]: [CONTENT_GENERATION_STATUS.PROCESSING],
  [CONTENT_GENERATION_STATUS.PROCESSING]: [CONTENT_GENERATION_STATUS.COMPLETE, CONTENT_GENERATION_STATUS.FAILED],
  [CONTENT_GENERATION_STATUS.COMPLETE]: [],
  [CONTENT_GENERATION_STATUS.FAILED]: [CONTENT_GENERATION_STATUS.PENDING]
};

export const WorkflowStepName = z.enum(['generate-plan', 'upload-transcript', 'upload-tracks']);

export const ContentType = z.enum(['blog', 'quotes', 'clips']);

export const WorkflowStepSchema = z.object({
  stepName: WorkflowStepName,
  status: WorkflowStepStatus,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const ContentGenerationSchema = z.object({
  contentType: ContentType,
  status: ContentGenerationStatus,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  itemCount: z.number().int().nonnegative().optional(),
  errorMessage: z.string().optional()
});

export const WorkflowStateSchema = z.object({
  steps: z.array(WorkflowStepSchema),
  contentGeneration: z.array(ContentGenerationSchema)
});
