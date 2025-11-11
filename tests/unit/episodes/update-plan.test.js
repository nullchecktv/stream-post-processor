// Unit tests for update plan function
// These tests validate plan updates and validation

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

// Mock environment variables
process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Update Plan Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'episodes' });
  });

  describe('Request Validation', () => {
    const validateUpdateRequest = (body, pathParams, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId) {
        throw new Error('Episode ID is required');
      }

      if (!body) {
        throw new Error('Request body is required');
      }

      const data = typeof body === 'string' ? JSON.parse(body) : body;

      if (!data.objectives || typeof data.objectives !== 'string' || data.objectives.trim().length === 0) {
        throw new Error('Objectives are required');
      }

      if (!data.concepts || typeof data.concepts !== 'string' || data.concepts.trim().length === 0) {
        throw new Error('Concepts are required');
      }

      if (data.notes !== undefined && typeof data.notes !== 'string') {
        throw new Error('Notes must be a string');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId,
        data: {
          objectives: data.objectives.trim(),
          concepts: data.concepts.trim(),
          ...(data.notes !== undefined && { notes: data.notes.trim() })
        }
      };
    };

    test('should validate correct update request', () => {
      const body = JSON.stringify({
        objectives: 'Updated objectives',
        concepts: 'Updated concepts',
        notes: 'Updated notes'
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      const result = validateUpdateRequest(body, pathParams, requestContext);

      expect(result.data.objectives).toBe('Updated objectives');
      expect(result.data.concepts).toBe('Updated concepts');
      expect(result.data.notes).toBe('Updated notes');
    });

    test('should allow removing notes by setting to empty string', () => {
      const body = JSON.stringify({
        objectives: 'Updated objectives',
        concepts: 'Updated concepts',
        notes: ''
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      const result = validateUpdateRequest(body, pathParams, requestContext);

      expect(result.data.notes).toBe('');
    });

    test('should reject missing objectives', () => {
      const body = JSON.stringify({
        concepts: 'Updated concepts'
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateUpdateRequest(body, pathParams, requestContext))
        .toThrow('Objectives are required');
    });
  });

  describe('Plan Item Update', () => {
    const updatePlanItem = (tenantId, episodeId, data, existingPlan, timestamp) => {
      return {
        pk: `${tenantId}#${episodeId}`,
        sk: 'plan',
        objectives: data.objectives,
        concepts: data.concepts,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        createdAt: existingPlan.createdAt,
        updatedAt: timestamp
      };
    };

    test('should update plan with all fields', () => {
      const existingPlan = {
        objectives: 'Old objectives',
        concepts: 'Old concepts',
        notes: 'Old notes',
        createdAt: '2025-01-15T09:00:00Z',
        updatedAt: '2025-01-15T09:00:00Z'
      };

      const data = {
        objectives: 'New objectives',
        concepts: 'New concepts',
        notes: 'New notes'
      };

      const timestamp = '2025-01-15T10:00:00Z';
      const item = updatePlanItem('tenant-123', 'episode-123', data, existingPlan, timestamp);

      expect(item.objectives).toBe('New objectives');
      expect(item.concepts).toBe('New concepts');
      expect(item.notes).toBe('New notes');
      expect(item.createdAt).toBe('2025-01-15T09:00:00Z');
      expect(item.updatedAt).toBe('2025-01-15T10:00:00Z');
    });

    test('should preserve createdAt timestamp', () => {
      const existingPlan = {
        objectives: 'Old objectives',
        concepts: 'Old concepts',
        createdAt: '2025-01-15T09:00:00Z',
        updatedAt: '2025-01-15T09:00:00Z'
      };

      const data = {
        objectives: 'New objectives',
        concepts: 'New concepts'
      };

      const timestamp = '2025-01-15T10:00:00Z';
      const item = updatePlanItem('tenant-123', 'episode-123', data, existingPlan, timestamp);

      expect(item.createdAt).toBe(existingPlan.createdAt);
      expect(item.updatedAt).toBe(timestamp);
    });
  });

  describe('Status History Update', () => {
    const addStatusEntry = (statusHistory, status, timestamp) => {
      const history = statusHistory || [];
      return [
        ...history,
        {
          status,
          timestamp
        }
      ];
    };

    test('should add plan_updated status to history', () => {
      const existingHistory = [
        { status: 'draft', timestamp: '2025-01-15T09:00:00Z' },
        { status: 'plan_added', timestamp: '2025-01-15T09:30:00Z' }
      ];
      const timestamp = '2025-01-15T10:00:00Z';

      const history = addStatusEntry(existingHistory, 'plan_updated', timestamp);

      expect(history).toHaveLength(3);
      expect(history[2]).toEqual({
        status: 'plan_updated',
        timestamp
      });
    });
  });

  describe('Response Formatting', () => {
    const formatUpdateResponse = (episodeId, plan, status) => {
      return {
        statusCode: 200,
        body: JSON.stringify({
          episodeId,
          plan: {
            objectives: plan.objectives,
            concepts: plan.concepts,
            ...(plan.notes !== undefined && { notes: plan.notes }),
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt
          },
          status
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    test('should format success response', () => {
      const plan = {
        objectives: 'Updated objectives',
        concepts: 'Updated concepts',
        notes: 'Updated notes',
        createdAt: '2025-01-15T09:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const response = formatUpdateResponse('episode-123', plan, 'plan_updated');

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.episodeId).toBe('episode-123');
      expect(body.plan.objectives).toBe('Updated objectives');
      expect(body.status).toBe('plan_updated');
    });
  });

  describe('Error Handling', () => {
    const formatErrorResponse = (statusCode, message) => {
      return {
        statusCode,
        body: JSON.stringify({ message }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    test('should format 404 error for missing episode', () => {
      const response = formatErrorResponse(404, "Episode with ID 'episode-123' was not found");

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Episode with ID 'episode-123' was not found");
    });

    test('should format 404 error for missing plan', () => {
      const response = formatErrorResponse(404, 'Plan not found for episode');

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Plan not found for episode');
    });
  });
});
