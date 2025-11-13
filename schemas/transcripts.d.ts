import { z } from 'zod';

export {
  TranscriptUploadSchema
} from './transcripts.mjs';

import type {
  TranscriptUploadSchema
} from './transcripts.mjs';

export type TranscriptUpload = z.infer<typeof TranscriptUploadSchema>;
