import { z } from 'zod';
import { TimestampSchema } from './common.mjs';

export const QuoteStatus = z.enum([
  'Proposed',
  'Processing',
  'Created',
  'Failed',
  'Edited'
]);

export const QUOTE_STATUS = {
  PROPOSED: 'Proposed',
  PROCESSING: 'Processing',
  CREATED: 'Created',
  FAILED: 'Failed',
  EDITED: 'Edited'
};

export const QUOTE_STATUS_TRANSITIONS = {
  [QUOTE_STATUS.PROPOSED]: [QUOTE_STATUS.PROCESSING],
  [QUOTE_STATUS.PROCESSING]: [QUOTE_STATUS.CREATED, QUOTE_STATUS.FAILED],
  [QUOTE_STATUS.CREATED]: [QUOTE_STATUS.EDITED],
  [QUOTE_STATUS.FAILED]: [QUOTE_STATUS.PROCESSING],
  [QUOTE_STATUS.EDITED]: []
};

export const QuoteOrientation = z.enum(['landscape', 'portrait']);

export const QUOTE_ORIENTATION = {
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait'
};

export const QuoteCreateSchema = z.object({
  text: z.string().min(5).max(280),
  speaker: z.string().min(1).max(100),
  timestamp: TimestampSchema,
  relevanceScore: z.number().min(0).max(100).optional(),
  context: z.string().max(500).optional(),
  showSpeaker: z.boolean().default(true),
  showEpisodeTitle: z.boolean().default(true),
  orientation: QuoteOrientation.default('landscape')
});

export const QuoteUpdateSchema = z.object({
  text: z.string().min(5).max(280).optional(),
  speaker: z.string().min(1).max(100).optional(),
  showSpeaker: z.boolean().optional(),
  showEpisodeTitle: z.boolean().optional(),
  status: QuoteStatus.optional(),
  orientation: QuoteOrientation.optional()
});

export const QuotePathParamsSchema = z.object({
  episodeId: z.string().uuid(),
  quoteId: z.string().uuid()
});
