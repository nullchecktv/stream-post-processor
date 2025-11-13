import { z } from 'zod';
import { TimestampSchema } from './common.mjs';

export const ClipStatus = z.enum([
  'Proposed',
  'Processing',
  'Created',
  'Failed'
]);

export const CLIP_STATUS = {
  PROPOSED: 'Proposed',
  PROCESSING: 'Processing',
  CREATED: 'Created',
  FAILED: 'Failed'
};

export const CLIP_STATUS_TRANSITIONS = {
  [CLIP_STATUS.PROPOSED]: [CLIP_STATUS.PROCESSING],
  [CLIP_STATUS.PROCESSING]: [CLIP_STATUS.CREATED, CLIP_STATUS.FAILED],
  [CLIP_STATUS.CREATED]: [],
  [CLIP_STATUS.FAILED]: [CLIP_STATUS.PROCESSING]
};

export const ClipOrientation = z.enum(['landscape', 'portrait']);

export const ClipSegmentSchema = z.object({
  startTime: TimestampSchema,
  endTime: TimestampSchema,
  speaker: z.string().min(1).max(100),
  transcript: z.string().min(1),
  order: z.number().int().positive()
});

export const ClipStatusUpdateSchema = z.object({
  status: ClipStatus
});

export const ClipGenerateSchema = z.object({
  orientation: ClipOrientation
});

export const ClipPathParamsSchema = z.object({
  episodeId: z.string(),
  clipId: z.string()
});
