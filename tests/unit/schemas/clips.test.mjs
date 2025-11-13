import { describe, it, expect } from '@jest/globals';
import {
  ClipStatus,
  CLIP_STATUS,
  CLIP_STATUS_TRANSITIONS,
  ClipOrientation,
  ClipSegmentSchema,
  ClipStatusUpdateSchema,
  ClipGenerateSchema,
  ClipPathParamsSchema
} from '../../../schemas/clips.mjs';

describe('Clip Schemas', () => {
  describe('ClipStatus enum', () => {
    it('should validate correct status values', () => {
      const validStatuses = ['Proposed', 'Processing', 'Created', 'Failed'];

      validStatuses.forEach(status => {
        const result = ClipStatus.safeParse(status);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(status);
        }
      });
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['proposed', 'PROPOSED', 'detected', 'invalid', '', null, undefined];

      invalidStatuses.forEach(status => {
        const result = ClipStatus.safeParse(status);
        expect(result.success).toBe(false);
      });
    });

    it('should have correct CLIP_STATUS constants', () => {
      expect(CLIP_STATUS.PROPOSED).toBe('Proposed');
      expect(CLIP_STATUS.PROCESSING).toBe('Processing');
      expect(CLIP_STATUS.CREATED).toBe('Created');
      expect(CLIP_STATUS.FAILED).toBe('Failed');
    });
  });

  describe('CLIP_STATUS_TRANSITIONS', () => {
    it('should define valid transitions from Proposed', () => {
      expect(CLIP_STATUS_TRANSITIONS[CLIP_STATUS.PROPOSED]).toEqual([
        CLIP_STATUS.PROCESSING
      ]);
    });

    it('should define valid transitions from Proceing', () => {
      expect(CLIP_STATUS_TRANSITIONS[CLIP_STATUS.PROCESSING]).toEqual([
        CLIP_STATUS.CREATED,
        CLIP_STATUS.FAILED
      ]);
    });

    it('should define no transitions from Created', () => {
      expect(CLIP_STATUS_TRANSITIONS[CLIP_STATUS.CREATED]).toEqual([]);
    });

    it('should define valid transitions from Failed', () => {
      expect(CLIP_STATUS_TRANSITIONS[CLIP_STATUS.FAILED]).toEqual([
        CLIP_STATUS.PROCESSING
      ]);
    });
  });

  describe('ClipOrientation enum', () => {
    it('should validate landscape orientation', () => {
      const result = ClipOrientation.safeParse('landscape');
      expect(result.success).toBe(true);
    });

    it('should validate portrait orientation', () => {
      const result = ClipOrientation.safeParse('portrait');
      expect(result.success).toBe(true);
    });

    it('should reject invalid orientation', () => {
      const invalidOrientations = ['square', 'vertical', 'horizontal', '', null];

      invalidOrientations.forEach(orientation => {
        const result = ClipOrientation.safeParse(orientation);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('ClipSegmentSchema', () => {
    const validSegment = {
      startTime: '00:15:30',
      endTime: '00:17:45',
      speaker: 'John Doe',
      transcript: 'This is the transcript text',
      order: 1
    };

    it('should validate a complete valid segment', () => {
      const result = ClipSegmentSchema.safeParse(validSegment);
      expect(result.success).toBe(true);
    });

    it('should reject segment with invalid startTime format', () => {
      const invalidSegment = { ...validSegment, startTime: '15:30' };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it('should reject segment with invalid endTime format', () => {
      const invalidSegment = { ...validSegment, endTime: '17:45:00:00' };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it('should reject segment with empty speaker', () => {
      const invalidSegment = { ...validSegment, speaker: '' };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it('should reject segment with speaker exceeding 100 characters', () => {
      const invalidSegment = { ...validSegment, speaker: 'a'.repeat(101) };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it('should reject segment with empty transcript', () => {
      const invalidSegment = { ...validSegment, transcript: '' };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it('should reject segment with non-positive order', () => {
      const invalidSegment = { ...validSegment, order: 0 };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it('should reject segment with negative order', () => {
      const invalidSegment = { ...validSegment, order: -1 };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it('should reject segment with non-integer order', () => {
      const invalidSegment = { ...validSegment, order: 1.5 };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });

    it('should reject segment missing required fields', () => {
      const invalidSegment = { startTime: '00:15:30' };
      const result = ClipSegmentSchema.safeParse(invalidSegment);
      expect(result.success).toBe(false);
    });
  });

  describe('ClipStatusUpdateSchema', () => {
    it('should validate status update with valid status', () => {
      const update = { status: 'Processing' };
      const result = ClipStatusUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject status update with invalid status', () => {
      const update = { status: 'invalid' };
      const result = ClipStatusUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject status update missing status field', () => {
      const update = {};
      const result = ClipStatusUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('ClipGenerateSchema', () => {
    it('should validate generate request with landscape orientation', () => {
      const request = { orientation: 'landscape' };
      const result = ClipGenerateSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should validate generate request with portrait orientation', () => {
      const request = { orientation: 'portrait' };
      const result = ClipGenerateSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject generate request with invalid orientation', () => {
      const request = { orientation: 'square' };
      const result = ClipGenerateSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject generate request missing orientation', () => {
      const request = {};
      const result = ClipGenerateSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('ClipPathParamsSchema', () => {
    it('should validate path params with both IDs', () => {
      const params = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        clipId: '987e6543-e21b-12d3-a456-426614174999'
      };
      const result = ClipPathParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate path params with any string IDs', () => {
      const params = {
        episodeId: 'episode-id',
        clipId: 'clip-id'
      };
      const result = ClipPathParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject path params missing episodeId', () => {
      const params = { clipId: 'clip-id' };
      const result = ClipPathParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject path params missing clipId', () => {
      const params = { episodeId: 'episode-id' };
      const result = ClipPathParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('TypeScript type inference', () => {
    it('should infer correct types from schemas', () => {
      const segment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'John Doe',
        transcript: 'Test transcript',
        order: 1
      };

      const result = ClipSegmentSchema.safeParse(segment);
      if (result.success) {
        expect(typeof result.data.startTime).toBe('string');
        expect(typeof result.data.speaker).toBe('string');
        expect(typeof result.data.order).toBe('number');
      }
    });
  });
});

