import { describe, it, expect } from '@jest/globals';
import {
  QUOTE_STATUS,
  createQuoteKey,
  createQuoteGSIKey,
  generateQuoteS3Key,
  validateQuoteStatus,
  validateQuoteEntity
} from '../../../functions/utils/quotes.mjs';

describe('Quote Utilities', () => {
  describe('QUOTE_STATUS constants', () => {
    it('should have correct status values matching data model', () => {
      expect(QUOTE_STATUS.PROPOSED).toBe('proposed');
      expect(QUOTE_STATUS.CREATED).toBe('created');
      expect(QUOTE_STATUS.FAILED).toBe('failed');
      expect(QUOTE_STATUS.APPROVED).toBe('approved');
      expect(QUOTE_STATUS.REJECTED).toBe('rejected');
    });
  });

  describe('createQuoteKey', () => {
    it('should create correct DynamoDB key structure', () => {
      const key = createQuoteKey('tenant123', 'episode456', 'quote789');

      expect(key.pk).toBe('tenant123#episode456');
      expect(key.sk).toBe('data#quote#quote789');
    });
  });

  describe('createQuoteGSIKey', () => {
    it('should create correct GSI key structure', () => {
      const timestamp = '00:15:30';
      const key = createQuoteGSIKey('tenant123', timestamp, 'episode456', 'quote789');

      expect(key.GSI1PK).toBe('tenant123#quotes');
      expect(key.GSI1SK).toBe('00:15:30#episode456#quote789');
    });
  });

  describe('generateQuoteS3Key', () => {
    it('should generate correct S3 key pattern', () => {
      const s3Key = generateQuoteS3Key('tenant123', 'episode456', 'quote789');

      expect(s3Key).toBe('tenant123/episode456/quotes/quote789.png');
    });

    it('should throw error when tenantId is missing', () => {
      expect(() => generateQuoteS3Key(null, 'episode456', 'quote789')).toThrow('tenantId is required');
    });

    it('should throw error when episodeId is missing', () => {
      expect(() => generateQuoteS3Key('tenant123', null, 'quote789')).toThrow('episodeId is required');
    });

    it('should throw error when quoteId is missing', () => {
      expect(() => generateQuoteS3Key('tenant123', 'episode456', null)).toThrow('quoteId is required');
    });
  });

  describe('validateQuoteStatus', () => {
    it('should validate correct status values', () => {
      expect(() => validateQuoteStatus('proposed')).not.toThrow();
      expect(() => validateQuoteStatus('created')).not.toThrow();
      expect(() => validateQuoteStatus('failed')).not.toThrow();
      expect(() => validateQuoteStatus('approved')).not.toThrow();
      expect(() => validateQuoteStatus('rejected')).not.toThrow();
    });

    it('should reject invalid status values', () => {
      expect(() => validateQuoteStatus('invalid')).toThrow('Invalid quote status');
      expect(() => validateQuoteStatus(null)).toThrow('Invalid quote status');
      expect(() => validateQuoteStatus('')).toThrow('Invalid quote status');
    });
  });

  describe('validateQuoteEntity', () => {
    const validQuote = {
      pk: 'tenant123#episode456',
      sk: 'data#quote#quote789',
      quoteId: 'quote789',
      text: 'This is a memorable quote',
      speaker: 'John Doe',
      timestamp: '00:15:30'
    };

    it('should validate a complete quote entity', () => {
      expect(() => validateQuoteEntity(validQuote)).not.toThrow();
    });

    it('should reject quote missing required fields', () => {
      const invalidQuote = { ...validQuote };
      delete invalidQuote.text;

      expect(() => validateQuoteEntity(invalidQuote)).toThrow('Missing required quote fields: text');
    });

    it('should reject quote with text exceeding 280 characters', () => {
      const longQuote = {
        ...validQuote,
        text: 'a'.repeat(281)
      };

      expect(() => validateQuoteEntity(longQuote)).toThrow('Quote text must not exceed 280 characters');
    });

    it('should reject quote with invalid timestamp format', () => {
      const invalidTimestamp = {
        ...validQuote,
        timestamp: '15:30'
      };

      expect(() => validateQuoteEntity(invalidTimestamp)).toThrow('Quote timestamp must be in format HH:MM:SS');
    });

    it('should reject quote with invalid relevance score', () => {
      const invalidScore = {
        ...validQuote,
        relevanceScore: 150
      };

      expect(() => validateQuoteEntity(invalidScore)).toThrow('Quote relevance score must be a number between 0 and 100');
    });

    it('should accept quote with valid relevance score', () => {
      const validScore = {
        ...validQuote,
        relevanceScore: 85
      };

      expect(() => validateQuoteEntity(validScore)).not.toThrow();
    });
  });
});
