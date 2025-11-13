import { z } from 'zod';

export {
  Platform,
  BrandingSchema,
  TimestampSchema,
  StatusHistoryEntrySchema
} from './common.mjs';

import type {
  Platform,
  BrandingSchema,
  TimestampSchema,
  StatusHistoryEntrySchema
} from './common.mjs';

export type PlatformType = z.infer<typeof Platform>;
export type Branding = z.infer<typeof BrandingSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type StatusHistoryEntry = z.infer<typeof StatusHistoryEntrySchema>;
