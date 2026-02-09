jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Update Clip Status Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'clips' });
  });

  describe('DynamoDB Key Pattern', () => {
    const createClipKey = (tenantId, episodeId, clipId) => ({
      pk: `${tenantId}#${episodeId}`,
      sk: `data#clip#${clipId}`
    });

    test('should use correct key pattern with data#clip# prefix', () => {
      const key = createClipKey('tenant-123', 'episode-456', 'clip-789');
      expect(key).toEqual({
        pk: 'tenant-123#episode-456',
        sk: 'data#clip#clip-789'
      });
    });

    test('should not use old clip# pattern', () => {
      const correctKey = createClipKey('tenant-123', 'episode-456', 'clip-789');
      const incorrectKey = {
        pk: 'tenant-123#episode-456',
        sk: 'clip#clip-789'
      };

      expect(correctKey.sk).not.toBe(incorrectKey.sk);
      expect(correctKey.sk).toContain('data#clip#');
    });
  });

  describe('Request Validation', () => {
    const validateUpdateRequest = (pathParams, body, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId || !pathParams?.clipId) {
        throw new Error('Episode ID and Clip ID are required');
      }

      if (!body?.status) {
        throw new Error('Status is required');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId,
        clipId: pathParams.clipId,
        status: body.status
      };
    };

    test('should validate correct update request', () => {
      const pathParams = { episodeId: 'episode-123', clipId: 'clip-456' };
      const body = { status: 'Processing' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validateUpdateRequest(pathParams, body, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
      expect(result.clipId).toBe('clip-456');
      expect(result.status).toBe('Processing');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123', clipId: 'clip-456' };
      const body = { status: 'Processing' };
      const requestContext = { authorizer: {} };

      expect(() => validateUpdateRequest(pathParams, body, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing status', () => {
      const pathParams = { episodeId: 'episode-123', clipId: 'clip-456' };
      const body = {};
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateUpdateRequest(pathParams, body, requestContext))
        .toThrow('Status is required');
    });
  });

  describe('Response Formatting', () => {
    const formatResponse = (statusCode, body) => {
      const response = {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
        },
        body: JSON.stringify(body)
      };

      return response;
    };

    test('should format 200 success response correctly', () => {
      const response = formatResponse(200, {
        clipId: 'clip-456',
        episodeId: 'episode-123',
        status: 'Processing',
        updatedAt: '2025-01-15T10:00:00Z'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.clipId).toBe('clip-456');
      expect(body.status).toBe('Processing');
    });

    test('should format 404 error response correctly', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: "Clip with ID 'clip-456' was not found in episode 'episode-123'"
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toContain('clip-456');
      expect(body.message).toContain('episode-123');
    });

    test('should format 400 validation error response correctly', () => {
      const response = formatResponse(400, {
        error: 'ValidationError',
        message: 'Invalid status transition'
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('Invalid status transition');
    });
  });

  describe('Status Update Logic', () => {
    const createStatusUpdateParams = (status) => {
      const now = new Date().toISOString();
      return {
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newHistory)',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
          '#statusHistory': 'statusHistory'
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': now,
          ':emptyList': [],
          ':newHistory': [{
            status,
            timestamp: now
          }]
        }
      };
    };

    test('should create correct update parameters', () => {
      const params = createStatusUpdateParams('Processing');

      expect(params.UpdateExpression).toContain('SET #status = :status');
      expect(params.ExpressionAttributeNames['#status']).toBe('status');
      expect(params.ExpressionAttributeValues[':status']).toBe('Processing');
      expect(params.ExpressionAttributeValues[':newHistory']).toHaveLength(1);
      expect(params.ExpressionAttributeValues[':newHistory'][0].status).toBe('Processing');
    });
  });
});
