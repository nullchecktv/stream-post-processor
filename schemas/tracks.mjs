import { z } from 'zod';

export const TrackStatus = z.enum([
  'Uploading',
  'Uploaded',
  'Processing',
  'Processed',
  'Failed'
]);

export const TRACK_STATUS = {
  UPLOADING: 'Uploading',
  UPLOADED: 'Uploaded',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  FAILED: 'Failed'
};

export const TRACK_STATUS_TRANSITIONS = {
  [TRACK_STATUS.UPLOADING]: [TRACK_STATUS.UPLOADED, TRACK_STATUS.FAILED],
  [TRACK_STATUS.UPLOADED]: [TRACK_STATUS.PROCESSING],
  [TRACK_STATUS.PROCESSING]: [TRACK_STATUS.PROCESSED, TRACK_STATUS.FAILED],
  [TRACK_STATUS.PROCESSED]: [],
  [TRACK_STATUS.FAILED]: [TRACK_STATUS.UPLOADING]
};

export const TrackCreateSchema = z.object({
  filename: z.string().min(1).max(255),
  trackName: z.string().min(1).max(150).regex(/^[a-zA-Z0-9_-]+$/),
  speakers: z.array(z.string().min(1)).optional()
});

export const TrackUpdateSchema = z.object({
  speakers: z.array(z.string().min(1)).optional()
});

export const TrackPathParamsSchema = z.object({
  episodeId: z.string().uuid(),
  trackName: z.string().min(1).max(50)
});

export const TrackSignPartsSchema = z.object({
  uploadId: z.string().min(1),
  partNumbers: z.array(z.number().int().positive())
});

export const TrackCompleteSchema = z.object({
  uploadId: z.string().min(1),
  parts: z.array(z.object({
    ETag: z.string().min(1),
    PartNumber: z.number().int().positive()
  }))
});
