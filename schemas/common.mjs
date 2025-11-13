import { z } from 'zod';

export const Platform = z.enum([
  'linkedin live',
  'X',
  'twitch',
  'youtube'
]);

export const BrandingSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
  }),
  fontFamily: z.string().min(1).max(100),
  voice: z.object({
    tone: z.string().min(1).max(200),
    writingStyle: z.string().min(1).max(200),
    perspective: z.enum(['first_person', 'third_person']).default('first_person')
  }).optional()
});

export const TimestampSchema = z.string().regex(/^\d{2}:\d{2}:\d{2}$/);

export const StatusHistoryEntrySchema = z.object({
  status: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});
