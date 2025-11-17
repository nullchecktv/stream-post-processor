import { describe, it, expect } from '@jest/globals';
import {
  QuoteStatus,
  QUOTE_STATUS,
  QUOTE_STATUS_TRANSITIONS,
  QuoteOrientation,
  QUOTE_ORIENTATION,
  QuoteCreateSchema,
  QuoteUpdateSchema,
  QuotePathParamsSchema
} from '../../../schemas/quotes.mjs';

describe('Quote Schemas', () => {
  describe('QuoteStatus enum', () => {
    it('should validate correct status values', () => {
      const validStatuses = ['Proposed', 'Processing', 'Created', 'Failed', 'Edited'];

      validStatuses.forEach(status => {
        const result = QuoteStatus.safeParse(status);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(status);
        }
      });
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['proposed', 'PROPOSED', 'approved', 'invalid', '', null, undefined];

      invalidStatuses.forEach(status => {
        const result = QuoteStatus.safeParse(status);
        expect(result.success).toBe(false);
      });
    });

    it('should have correct QUOTE_STATUS constants', () => {
      expect(QUOTE_STATUS.PROPOSED).toBe('Proposed');
      expect(QUOTE_STATUS.PROCESSING).toBe('Processing');
      expect(QUOTE_STATUS.CREATED).toBe('Created');
      expect(QUOTE_STATUS.FAILED).toBe('Failed');
      expect(QUOTE_STATUS.EDITED).toBe('Edited');
    });
  });

  describe('QUOTE_STATUS_TRANSITIONS', () => {
    it('should define valid transitions from Proposed', () => {
      expect(QUOTE_STATUS_TRANSITIONS[QUOTE_STATUS.PROPOSED]).toEqual([
        QUOTE_STATUS.PROCESSING
      ]);
    });

    it('should define valid transitions from Processing', () => {
      expect(QUOTE_STATUS_TRANSITIONS[QUOTE_STATUS.PROCESSING]).toEqual([
        QUOTE_STATUS.CREATED,
        QUOTE_STATUS.FAILED
      ]);
    });

    it('should define valid transitions from Created', () => {
      expect(QUOTE_STATUS_TRANSITIONS[QUOTE_STATUS.CREATED]).toEqual([
        QUOTE_STATUS.EDITED
      ]);
    });

    it('should define valid transitions from Failed', () => {
      expect(QUOTE_STATUS_TRANSITIONS[QUOTE_STATUS.FAILED]).toEqual([
        QUOTE_STATUS.PROCESSING
      ]);
    });

    it('should define no transitions from Edited', () => {
      expect(QUOTE_STATUS_TRANSITIONS[QUOTE_STATUS.EDITED]).toEqual([]);
    });
  });

  describe('QuoteOrientation enum', () => {
    it('should validate correct orientation values', () => {
      const validOrientations = ['landscape', 'portrait'];

      validOrientations.forEach(orientation => {
        const result = QuoteOrientation.safeParse(orientation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(orientation);
        }
      });
    });

    it('should reject invalid orientation values', () => {
      const invalidOrientations = ['Landscape', 'Portrait', 'square', 'vertical', '', null, undefined];

      invalidOrientations.forEach(orientation => {
        const result = QuoteOrientation.safeParse(orientation);
        expect(result.success).toBe(false);
      });
    });

    it('should have correct QUOTE_ORIENTATION constants', () => {
      expect(QUOTE_ORIENTATION.LANDSCAPE).toBe('landscape');
      expect(QUOTE_ORIENTATION.PORTRAIT).toBe('portrait');
    });
  });

  describe('QuoteCreateSchema', () => {
    const validQuote = {
      text: 'This is a memorable quote',
      speaker: 'John Doe',
      timestamp: '00:15:30',
      relevanceScore: 85,
      context: 'Discussion about AI',
      showSpeaker: true,
      showEpisodeTitle: false
    };

    it('should validate a complete valid quote', () => {
      const result = QuoteCreateSchema.safeParse(validQuote);
      expect(result.success).toBe(true);
    });

    it('should validate quote with only required fields', () => {
      const minimalQuote = {
        text: 'Short quote',
        speaker: 'Speaker',
        timestamp: '00:15:30'
      };
      const result = QuoteCreateSchema.safeParse(minimalQuote);
      expect(result.success).toBe(true);
    });

    it('should apply default values for showSpeaker and showEpisodeTitle', () => {
      const minimalQuote = {
        text: 'Short quote',
        speaker: 'Speaker',
        timestamp: '00:15:30'
      };
      const result = QuoteCreateSchema.safeParse(minimalQuote);
      if (result.success) {
        expect(result.data.showSpeaker).toBe(true);
        expect(result.data.showEpisodeTitle).toBe(true);
      }
    });

    it('should apply default value of landscape for orientation', () => {
      const minimalQuote = {
        text: 'Short quote',
        speaker: 'Speaker',
        timestamp: '00:15:30'
      };
      const result = QuoteCreateSchema.safeParse(minimalQuote);
      if (result.success) {
        expect(result.data.orientation).toBe('landscape');
      }
    });

    it('should validate quote with portrait orientation', () => {
      const portraitQuote = {
        ...validQuote,
        orientation: 'portrait'
      };
      const result = QuoteCreateSchema.safeParse(portraitQuote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.orientation).toBe('portrait');
      }
    });

    it('should validate quote with landscape orientation', () => {
      const landscapeQuote = {
        ...validQuote,
        orientation: 'landscape'
      };
      const result = QuoteCreateSchema.safeParse(landscapeQuote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.orientation).toBe('landscape');
      }
    });

    it('should reject quote with invalid orientation', () => {
      const invalidQuote = {
        ...validQuote,
        orientation: 'square'
      };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote with text less than 5 characters', () => {
      const invalidQuote = { ...validQuote, text: 'Hi' };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote with text exceeding 280 characters', () => {
      const invalidQuote = { ...validQuote, text: 'a'.repeat(281) };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should validate quote with exactly 280 characters', () => {
      const validLongQuote = { ...validQuote, text: 'a'.repeat(280) };
      const result = QuoteCreateSchema.safeParse(validLongQuote);
      expect(result.success).toBe(true);
    });

    it('should reject quote with empty speaker', () => {
      const invalidQuote = { ...validQuote, speaker: '' };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote with speaker exceeding 100 characters', () => {
      const invalidQuote = { ...validQuote, speaker: 'a'.repeat(101) };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote with invalid timestamp format', () => {
      const invalidQuote = { ...validQuote, timestamp: '15:30' };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote with timestamp missing seconds', () => {
      const invalidQuote = { ...validQuote, timestamp: '00:15' };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote with relevanceScore below 0', () => {
      const invalidQuote = { ...validQuote, relevanceScore: -1 };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote with relevanceScore above 100', () => {
      const invalidQuote = { ...validQuote, relevanceScore: 101 };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should validate quote with relevanceScore of 0', () => {
      const validQuoteWithZeroScore = { ...validQuote, relevanceScore: 0 };
      const result = QuoteCreateSchema.safeParse(validQuoteWithZeroScore);
      expect(result.success).toBe(true);
    });

    it('should validate quote with relevanceScore of 100', () => {
      const validQuoteWithMaxScore = { ...validQuote, relevanceScore: 100 };
      const result = QuoteCreateSchema.safeParse(validQuoteWithMaxScore);
      expect(result.success).toBe(true);
    });

    it('should reject quote with context exceeding 500 characters', () => {
      const invalidQuote = { ...validQuote, context: 'a'.repeat(501) };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote missing required text', () => {
      const invalidQuote = { speaker: 'Speaker', timestamp: '00:15:30' };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote missing required speaker', () => {
      const invalidQuote = { text: 'Quote text', timestamp: '00:15:30' };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });

    it('should reject quote missing required timestamp', () => {
      const invalidQuote = { text: 'Quote text', speaker: 'Speaker' };
      const result = QuoteCreateSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });
  });

  describe('QuoteUpdateSchema', () => {
    it('should validate partial update with only text', () => {
      const update = { text: 'Updated quote text' };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate partial update with only speaker', () => {
      const update = { speaker: 'New Speaker' };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate partial update with only status', () => {
      const update = { status: 'Edited' };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate partial update with only orientation', () => {
      const update = { orientation: 'portrait' };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject update with invalid orientation', () => {
      const update = { orientation: 'square' };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should validate empty update object', () => {
      const update = {};
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject update with text less than 5 characters', () => {
      const update = { text: 'Hi' };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject update with text exceeding 280 characters', () => {
      const update = { text: 'a'.repeat(281) };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject update with empty speaker', () => {
      const update = { speaker: '' };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject update with invalid status', () => {
      const update = { status: 'invalid' };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should validate update with multiple fields', () => {
      const update = {
        text: 'Updated text',
        speaker: 'Updated Speaker',
        showSpeaker: false
      };
      const result = QuoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe('QuotePathParamsSchema', () => {
    it('should validate path params with valid UUIDs', () => {
      const params = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        quoteId: '987e6543-e21b-12d3-a456-426614174999'
      };
      const result = QuotePathParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject path params with invalid episodeId UUID', () => {
      const params = {
        episodeId: 'not-a-uuid',
        quoteId: '987e6543-e21b-12d3-a456-426614174999'
      };
      const result = QuotePathParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject path params with invalid quoteId UUID', () => {
      const params = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        quoteId: 'not-a-uuid'
      };
      const result = QuotePathParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject path params missing episodeId', () => {
      const params = { quoteId: '987e6543-e21b-12d3-a456-426614174999' };
      const result = QuotePathParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject path params missing quoteId', () => {
      const params = { episodeId: '123e4567-e89b-12d3-a456-426614174000' };
      const result = QuotePathParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('TypeScript type inference', () => {
    it('should infer correct types from schemas', () => {
      const quote = {
        text: 'Test quote',
        speaker: 'Speaker',
        timestamp: '00:15:30'
      };

      const result = QuoteCreateSchema.safeParse(quote);
      if (result.success) {
        expect(typeof result.data.text).toBe('string');
        expect(typeof result.data.speaker).toBe('string');
        expect(typeof result.data.showSpeaker).toBe('boolean');
      }
    });
  });
});
