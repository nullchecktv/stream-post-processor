import { z } from 'zod';

export {
  EpisodeStatus,
  EPISODE_STATUS,
  EPISODE_STATUS_TRANSITIONS,
  EpisodeCreateSchema,
  EpisodeUpdateSchema,
  EpisodeStatusUpdateSchema,
  EpisodePathParamsSchema
} from './episodes.mjs';

import type {
  EpisodeStatus,
  EpisodeCreateSchema,
  EpisodeUpdateSchema,
  EpisodeStatusUpdateSchema,
  EpisodePathParamsSchema
} from './episodes.mjs';

export type EpisodeStatusType = z.infer<typeof EpisodeStatus>;
export type EpisodeCreate = z.infer<typeof EpisodeCreateSchema>;
export type EpisodeUpdate = z.infer<typeof EpisodeUpdateSchema>;
export type EpisodeStatusUpdate = z.infer<typeof EpisodeStatusUpdateSchema>;
export type EpisodePathParams = z.infer<typeof EpisodePathParamsSchema>;
