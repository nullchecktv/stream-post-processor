import { z } from 'zod';

export {
  TrackStatus,
  TRACK_STATUS,
  TRACK_STATUS_TRANSITIONS,
  TrackCreateSchema,
  TrackUpdateSchema,
  TrackPathParamsSchema,
  TrackSignPartsSchema,
  TrackCompleteSchema
} from './tracks.mjs';

import type {
  TrackStatus,
  TrackCreateSchema,
  TrackUpdateSchema,
  TrackPathParamsSchema,
  TrackSignPartsSchema,
  TrackCompleteSchema
} from './tracks.mjs';

export type TrackStatusType = z.infer<typeof TrackStatus>;
export type TrackCreate = z.infer<typeof TrackCreateSchema>;
export type TrackUpdate = z.infer<typeof TrackUpdateSchema>;
export type TrackPathParams = z.infer<typeof TrackPathParamsSchema>;
export type TrackSignParts = z.infer<typeof TrackSignPartsSchema>;
export type TrackComplete = z.infer<typeof TrackCompleteSchema>;
