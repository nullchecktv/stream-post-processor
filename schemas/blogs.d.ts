import { z } from 'zod';

export {
  BlogStatus,
  BLOG_STATUS,
  BLOG_STATUS_TRANSITIONS,
  BlogUpdateSchema,
  BlogRegenerateSchema
} from './blogs.mjs';

import type {
  BlogStatus,
  BlogUpdateSchema,
  BlogRegenerateSchema
} from './blogs.mjs';

export type BlogStatusType = z.infer<typeof BlogStatus>;
export type BlogUpdate = z.infer<typeof BlogUpdateSchema>;
export type BlogRegenerate = z.infer<typeof BlogRegenerateSchema>;
