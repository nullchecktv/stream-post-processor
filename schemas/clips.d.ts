import { z } from 'zod';

export {
  ClipStatus,
  CLIP_STATUS,
  CLIP_STATUS_TRANSITIONS,
  ClipOrientation,
  ClipSegmentSchema,
  ClipStatusUpdateSchema,
  ClipGenerateSchema,
  ClipPathParamsSchema
} from './clips.mjs';

import type {
  ClipStatus,
  ClipOrientation,
  ClipSegmentSchema,
  ClipStatusUpdateSchema,
  ClipGenerateSchema,
  ClipPathParamsSchema
} from './clips.mjs';

export type ClipStatusType = z.infer<typeof ClipStatus>;
export type ClipOrientationType = z.infer<typeof ClipOrientation>;
export type ClipSegment = z.infer<typeof ClipSegmentSchema>;
export type ClipStatusUpdate = z.infer<typeof ClipStatusUpdateSchema>;
export type ClipGenerate = z.infer<typeof ClipGenerateSchema>;
export type ClipPathParams = z.infer<typeof ClipPathParamsSchema>;
