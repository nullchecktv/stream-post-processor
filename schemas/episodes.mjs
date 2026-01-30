import { z } from 'zod';
import { Platform, StatusHistoryEntrySchema } from './common.mjs';

export const EpisodeStatus = z.enum([
  'Draft',
  'Planning',
  'Ready',
  'Processing',
  'Published',
  'Archived'
]);

export const EPISODE_STATUS = {
  DRAFT: 'Draft',
  PLANNING: 'Planning',
  READY: 'Ready',
  PROCESSING: 'Processing',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived'
};

export const EPISODE_STATUS_TRANSITIONS = {
  [EPISODE_STATUS.DRAFT]: [EPISODE_STATUS.PLANNING, EPISODE_STATUS.ARCHIVED],
  [EPISODE_STATUS.PLANNING]: [EPISODE_STATUS.READY, EPISODE_STATUS.DRAFT],
  [EPISODE_STATUS.READY]: [EPISODE_STATUS.PROCESSING, EPISODE_STATUS.PLANNING],
  [EPISODE_STATUS.PROCESSING]: [EPISODE_STATUS.PUBLISHED, EPISODE_STATUS.READY],
  [EPISODE_STATUS.PUBLISHED]: [EPISODE_STATUS.ARCHIVED],
  [EPISODE_STATUS.ARCHIVED]: []
};

export const WorkflowStepStatus = z.enum([
  'Not Started',
  'In Progress',
  'Completed',
  'Failed',
  'Skipped'
]);

export const WORKFLOW_STEP_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  SKIPPED: 'Skipped'
};

export const WORKFLOW_STEP_TRANSITIONS = {
  [WORKFLOW_STEP_STATUS.NOT_STARTED]: [
    WORKFLOW_STEP_STATUS.IN_PROGRESS,
    WORKFLOW_STEP_STATUS.SKIPPED
  ],
  [WORKFLOW_STEP_STATUS.IN_PROGRESS]: [
    WORKFLOW_STEP_STATUS.COMPLETED,
    WORKFLOW_STEP_STATUS.FAILED
  ],
  [WORKFLOW_STEP_STATUS.FAILED]: [
    WORKFLOW_STEP_STATUS.IN_PROGRESS
  ],
  [WORKFLOW_STEP_STATUS.SKIPPED]: [
    WORKFLOW_STEP_STATUS.IN_PROGRESS
  ],
  [WORKFLOW_STEP_STATUS.COMPLETED]: []
};

export const WorkflowStepSchema = z.object({
  status: WorkflowStepStatus,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional()
});

export const WorkflowStepsSchema = z.object({
  generatePlan: WorkflowStepSchema,
  uploadTranscript: WorkflowStepSchema,
  uploadTracks: WorkflowStepSchema
});

export const EpisodeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  episodeNumber: z.number().int().positive(),
  description: z.string().max(1000).optional(),
  airDate: z.iso.datetime().optional(),
  platforms: z.array(Platform).optional(),
  themes: z.array(z.string()).optional(),
  seriesName: z.string().max(100).optional(),
  speakers: z.array(z.string().min(1).max(100)).optional(),
  workflowSteps: WorkflowStepsSchema.optional(),
  trackCount: z.number().int().min(0).default(0).optional(),
  hasSpeakers: z.boolean().default(false).optional()
});

export const EpisodeUpdateSchema = EpisodeCreateSchema.partial();

export const EpisodeStatusUpdateSchema = z.object({
  status: EpisodeStatus
});

export const EpisodePathParamsSchema = z.object({
  episodeId: z.string()
});
