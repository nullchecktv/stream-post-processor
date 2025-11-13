import { z } from 'zod';

export const BlogStatus = z.enum([
  'Proposed',
  'Processing',
  'Created',
  'Failed',
  'Edited'
]);

export const BLOG_STATUS = {
  PROPOSED: 'Proposed',
  PROCESSING: 'Processing',
  CREATED: 'Created',
  FAILED: 'Failed',
  EDITED: 'Edited'
};

export const BLOG_STATUS_TRANSITIONS = {
  [BLOG_STATUS.PROPOSED]: [BLOG_STATUS.PROCESSING],
  [BLOG_STATUS.PROCESSING]: [BLOG_STATUS.CREATED, BLOG_STATUS.FAILED],
  [BLOG_STATUS.CREATED]: [BLOG_STATUS.EDITED, BLOG_STATUS.PROCESSING],
  [BLOG_STATUS.FAILED]: [BLOG_STATUS.PROCESSING],
  [BLOG_STATUS.EDITED]: [BLOG_STATUS.PROCESSING]
};

export const BlogUpdateSchema = z.object({
  outline: z.string().min(1).optional(),
  content: z.string().min(1).optional()
});

export const BlogRegenerateSchema = z.object({
  outline: z.string().min(1)
});
