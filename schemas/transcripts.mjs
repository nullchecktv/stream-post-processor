import { z } from 'zod';

export const TranscriptUploadSchema = z.object({
  filename: z.string().min(1).max(255)
});

