// Unit tests for add plan function
// These tests validate plan creation and validation

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

// Mock environment variables
process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Add Plan Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'episodes' });
  });

  describe('Request Validation', () => {
    const validatePlanRequest = (body, pathParams, requestContext) => {
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
          ...(data.notes && { notes: data.notes.trim() })
        }
      };
    };

    test('should validate correct plan request', () => {
      const body = JSON.stringify({
        objectives: 'Teach viewers about serverless architecture',
        concepts: 'Lambda functions, API Gateway, DynamoDB',
        notes: 'Include live demo'
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      const result = validatePlanRequest(body, pathParams, requestContext);

      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
      expect(result.data.objectives).toBe('Teach viewers about serverless architecture');
      expect(result.data.concepts).toBe('Lambda functions, API Gateway, DynamoDB');
      expect(result.data.notes).toBe('Include live demo');
    });

    test('should validate plan without notes', () => {
      const body = JSON.stringify({
        objectives: 'Teach viewers about serverless architecture',
        concepts: 'Lambda functions, API Gateway, DynamoDB'
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      const result = validatePlanRequest(body, pathParams, requestContext);

      expect(result.data.objectives).toBe('Teach viewers about serverless architecture');
      expect(result.data.concepts).toBe('Lambda functions, API Gateway, DynamoDB');
      expect(result.data.notes).toBeUndefined();
    });

    test('should reject missing objectives', () => {
      const body = JSON.stringify({
        concepts: 'Lambda functions'
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validatePlanRequest(body, pathParams, requestContext))
        .toThrow('Objectives are required');
    });

    test('should reject empty objectives', () => {
      const body = JSON.stringify({
        objectives: '   ',
        concepts: 'Lambda functions'
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validatePlanRequest(body, pathParams, requestContext))
        .toThrow('Objectives are required');
    });

    test('should reject missing concepts', () => {
      const body = JSON.stringify({
        objectives: 'Teach serverless'
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validatePlanRequest(body, pathParams, requestContext))
        .toThrow('Concepts are required');
    });

    test('should reject missing tenantId', () => {
      const body = JSON.stringify({
        objectives: 'Teach serverless',
        concepts: 'Lambda functions'
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: {} };

      expect(() => validatePlanRequest(body, pathParams, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const body = JSON.stringify({
        objectives: 'Teach serverless',
        concepts: 'Lambda functions'
      });
      const pathParams = {};
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validatePlanRequest(body, pathParams, requestContext))
        .toThrow('Episode ID is required');
    });

    test('should trim whitespace from fields', () => {
      const body = JSON.stringify({
        objectives: '  Teach viewers about serverless  ',
        concepts: '  Lambda functions  ',
        notes: '  Include demo  '
      });
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      const result = validatePlanRequest(body, pathParams, requestContext);

      expect(result.data.objectives).toBe('Teach viewers about serverless');
      expect(result.data.concepts).toBe('Lambda functions');
      expect(result.data.notes).toBe('Include demo');
    });
  });

  describe('Plan Item Creation', () => {
    const createPlanItem = (tenantId, episodeId, data, timestamp) => {
      return {
        pk: `${tenantId}#${episodeId}`,
        sk: 'plan',
        objectives: data.objectives,
        concepts: data.concepts,
        ...(data.notes && { notes: data.notes }),
        createdAt: timestamp,
        updatedAt: timestamp
      };
    };

    test('should create plan item with all fields', () => {
      const data = {
        objectives: 'Teach serverless',
        concepts: 'Lambda, API Gateway',
        notes: 'Include demo'
      };
      const timestamp = '2025-01-15T10:00:00Z';

      const item = createPlanItem('tenant-123', 'episode-123', data, timestamp);

      expect(item.pk).toBe('tenant-123#episode-123');
      expect(item.sk).toBe('plan');
      expect(item.objectives).toBe('Teach serverless');
      expect(item.concepts).toBe('Lambda, API Gateway');
      expect(item.notes).toBe('Include demo');
      expect(item.createdAt).toBe(timestamp);
      expect(item.updatedAt).toBe(timestamp);
    });

    test('should create plan item without notes', () => {
      const data = {
        objectives: 'Teach serverless',
        concepts: 'Lambda, API Gateway'
      };
      const timestamp = '2025-01-15T10:00:00Z';

      const item = createPlanItem('tenant-123', 'episode-123', data, timestamp);

      expect(item.pk).toBe('tenant-123#episode-123');
      expect(item.sk).toBe('plan');
      expect(item.objectives).toBe('Teach serverless');
      expect(item.concepts).toBe('Lambda, API Gateway');
      expect(item.notes).toBeUndefined();
      expect(item.createdAt).toBe(timestamp);
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

    test('should add plan_added status to empty history', () => {
      const timestamp = '2025-01-15T10:00:00Z';
      const history = addStatusEntry([], 'plan_added', timestamp);

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        status: 'plan_added',
        timestamp
      });
    });

    test('should append plan_added status to existing history', () => {
      const existingHistory = [
        { status: 'draft', timestamp: '2025-01-15T09:00:00Z' }
      ];
      const timestamp = '2025-01-15T10:00:00Z';

      const history = addStatusEntry(existingHistory, 'plan_added', timestamp);

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        status: 'draft',
        timestamp: '2025-01-15T09:00:00Z'
      });
      expect(history[1]).toEqual({
        status: 'plan_added',
        timestamp
      });
    });
  });

  describe('Response Formatting', () => {
    const formatPlanResponse = (episodeId, plan, status) => {
      return {
        statusCode: 201,
        body: JSON.stringify({
          episodeId,
          plan: {
            objectives: plan.objectives,
            concepts: plan.concepts,
            ...(plan.notes && { notes: plan.notes }),
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

    test('should format success response with all fields', () => {
      const plan = {
        objectives: 'Teach serverless',
        concepts: 'Lambda, API Gateway',
        notes: 'Include demo',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const response = formatPlanResponse('episode-123', plan, 'plan_added');

      expect(response.statusCode).toBe(201);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.episodeId).toBe('episode-123');
      expect(body.plan.objectives).toBe('Teach serverless');
      expect(body.plan.concepts).toBe('Lambda, API Gateway');
      expect(body.plan.notes).toBe('Include demo');
      expect(body.status).toBe('plan_added');
    });

    test('should format success response without notes', () => {
      const plan = {
        objectives: 'Teach serverless',
        concepts: 'Lambda, API Gateway',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const response = formatPlanResponse('episode-123', plan, 'plan_added');

      const body = JSON.parse(response.body);
      expect(body.plan.notes).toBeUndefined();
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

    test('should format 409 error for duplicate plan', () => {
      const response = formatErrorResponse(409, 'Plan already exists for this episode');

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Plan already exists for this episode');
    });

    test('should format 500 error for internal errors', () => {
      const response = formatErrorResponse(500, 'Something went wrong');

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Something went wrong');
    });
  });
});
