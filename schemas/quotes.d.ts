import { z } from 'zod';

export {
  QuoteStatus,
  QUOTE_STATUS,
  QUOTE_STATUS_TRANSITIONS,
  QuoteCreateSchema,
  QuoteUpdateSchema,
  QuotePathParamsSchema
} from './quotes.mjs';

import type {
  QuoteStatus,
  QuoteCreateSchema,
  QuoteUpdateSchema,
  QuotePathParamsSchema
} from './quotes.mjs';

export type QuoteStatusType = z.infer<typeof QuoteStatus>;
export type QuoteCreate = z.infer<typeof QuoteCreateSchema>;
export type QuoteUpdate = z.infer<typeof QuoteUpdateSchema>;
export type QuotePathParams = z.infer<typeof QuotePathParamsSchema>;
