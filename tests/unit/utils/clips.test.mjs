import { describe, it, expect } from '@jest/globals';
import {
  CLIP_STATUS,
  validateStatusTransition,
  getCurrentClipStatus,
  createStatusUpdateParams
} from '../../../functions/utils/clips.mjs';

describe('Clip Status Management', () => {
  describe('CLIP_STATUS constants', () => {
    it('should have correct status values matching data model', () => {
      expect(CLIP_STATUS.DETECTED).toBe('detected');
      expect(CLIP_STATUS.PROCESSING).toBe('processing');
      expect(CLIP_STATUS.PROCESSED).toBe('processed');
      expect(CLIP_STATUS.FAILED).toBe('failed');
      expect(CLIP_STATUS.REVIEWED).toBe('reviewed');
      expect(CLIP_STATUS.APPROVED).toBe('approved');
      expect(CLIP_STATUS.REJECTED).toBe('rejected');
      expect(CLIP_STATUS.PUBLISHED).toBe('published');
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => validateStatusTransition('detected', 'processing')).not.toThrow();
      expect(() => validateStatusTransition('processing', 'processed')).not.toThrow();
      expect(() => validateStatusTransition('processing', 'failed')).not.toThrow();
      expect(() => validateStatusTransition('processed', 'reviewed')).not.toThrow();
      expect(() => validateStatusTransition('processed', 'approved')).not.toThrow();
      expect(() => validateStatusTransition('reviewed', 'approved')).not.toThrow();
      expect(() => validateStatusTransition('reviewed', 'rejected')).not.toThrow();
      expect(() => validateStatusTransition('approved', 'published')).not.toThrow();
    });

    it('should reject invalid transitions', () => {
      expect(() => validateStatusTransition('detected', 'processed')).toThrow();
      expect(() => validateStatusTransition('processed', 'processing')).toThrow();
      expect(() => validateStatusTransition('rejected', 'approved')).toThrow();
      expect(() => validateStatusTransition('published', 'reviewed')).toThrow();
    });

    it('should allow retry from failed status', () => {
      expect(() => validateStatusTransition('failed', 'processing')).not.toThrow();
    });
  });

  describe('getCurrentClipStatus', () => {
    it('should return status from statusHistory if available', () => {
      const clip = {
        status: 'detected',
        statusHistory: [
          { status: 'detected', timestamp: '2025-01-01T00:00:00Z' },
          { status: 'processing', timestamp: '2025-01-01T00:01:00Z' },
          { status: 'processed', timestamp: '2025-01-01T00:02:00Z' }
        ]
      };

      expect(getCurrentClipStatus(clip)).toBe('processed');
    });

    it('should fallback to status field if no statusHistory', () => {
      const clip = {
        status: 'detected'
      };

      expect(getCurrentClipStatus(clip)).toBe('detected');
    });

    it('should return null if no status information', () => {
      const clip = {};
      expect(getCurrentClipStatus(clip)).toBeNull();
    });
  });

  describe('createStatusUpdateParams', () => {
    it('should create correct DynamoDB update parameters', () => {
      const params = createStatusUpdateParams('processed');

      expect(params.UpdateExpression).toContain('statusHistory');
      expect(params.UpdateExpression).toContain('#status = :status');
      expect(params.ExpressionAttributeNames['#status']).toBe('status');
      expect(params.ExpressionAttributeValues[':status']).toBe('processed');
      expect(params.ExpressionAttributeValues[':newStatus']).toHaveLength(1);
      expect(params.ExpressionAttributeValues[':newStatus'][0].status).toBe('processed');
    });

    it('should include s3Key when status is processed', () => {
      const params = createStatusUpdateParams('processed', null, { s3Key: 'test-key' });

      expect(params.UpdateExpression).toContain('#s3Key = :s3Key');
      expect(params.ExpressionAttributeValues[':s3Key']).toBe('test-key');
    });

    it('should include error information when status is failed', () => {
      const params = createStatusUpdateParams('failed', null, {
        error: 'Test error',
        errorType: 'TestError'
      });

      expect(params.UpdateExpression).toContain('#processingError = :processingError');
      expect(params.ExpressionAttributeValues[':processingError'].message).toBe('Test error');
      expect(params.ExpressionAttributeValues[':processingError'].errorType).toBe('TestError');
    });
  });
});
