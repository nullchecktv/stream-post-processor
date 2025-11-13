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
      expect(CLIP_STATUS.PROPOSED).toBe('Proposed');
      expect(CLIP_STATUS.PROCESSING).toBe('Processing');
      expect(CLIP_STATUS.CREATED).toBe('Created');
      expect(CLIP_STATUS.FAILED).toBe('Failed');
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => validateStatusTransition('Proposed', 'Processing')).not.toThrow();
      expect(() => validateStatusTransition('Processing', 'Created')).not.toThrow();
      expect(() => validateStatusTransition('Processing', 'Failed')).not.toThrow();
    });

    it('should reject invalid transitions', () => {
      expect(() => validateStatusTransition('Proposed', 'Created')).toThrow();
      expect(() => validateStatusTransition('Created', 'Processing')).toThrow();
      expect(() => validateStatusTransition('Created', 'Failed')).toThrow();
    });

    it('should allow retry from failed status', () => {
      expect(() => validateStatusTransition('Failed', 'Processing')).not.toThrow();
    });
  });

  describe('getCurrentClipStatus', () => {
    it('should return status from statusHistory if available', () => {
      const clip = {
        status: 'Proposed',
        statusHistory: [
          { status: 'Proposed', timestamp: '2025-01-01T00:00:00Z' },
          { status: 'Processing', timestamp: '2025-01-01T00:01:00Z' },
          { status: 'Created', timestamp: '2025-01-01T00:02:00Z' }
        ]
      };

      expect(getCurrentClipStatus(clip)).toBe('Created');
    });

    it('should fallback to status field if no statusHistory', () => {
      const clip = {
        status: 'Proposed'
      };

      expect(getCurrentClipStatus(clip)).toBe('Proposed');
    });

    it('should return null if no status information', () => {
      const clip = {};
      expect(getCurrentClipStatus(clip)).toBeNull();
    });
  });

  describe('createStatusUpdateParams', () => {
    it('should create correct DynamoDB update parameters', () => {
      const params = createStatusUpdateParams('Created');

      expect(params.UpdateExpression).toContain('statusHistory');
      expect(params.UpdateExpression).toContain('#status = :status');
      expect(params.ExpressionAttributeNames['#status']).toBe('status');
      expect(params.ExpressionAttributeValues[':status']).toBe('Created');
      expect(params.ExpressionAttributeValues[':newStatus']).toHaveLength(1);
      expect(params.ExpressionAttributeValues[':newStatus'][0].status).toBe('Created');
    });

    it('should include s3Key when status is created', () => {
      const params = createStatusUpdateParams('Created', null, { s3Key: 'test-key' });

      expect(params.UpdateExpression).toContain('#s3Key = :s3Key');
      expect(params.ExpressionAttributeValues[':s3Key']).toBe('test-key');
    });

    it('should include error information when status is failed', () => {
      const params = createStatusUpdateParams('Failed', null, {
        error: 'Test error',
        errorType: 'TestError'
      });

      expect(params.UpdateExpression).toContain('#processingError = :processingError');
      expect(params.ExpressionAttributeValues[':processingError'].message).toBe('Test error');
      expect(params.ExpressionAttributeValues[':processingError'].errorType).toBe('TestError');
    });
  });
});
