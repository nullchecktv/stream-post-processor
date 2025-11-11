const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

const ddbMock = mockClient(DynamoDBClient);

jest.mock('../../../functions/utils/api.mjs', () => ({
  formatResponse: (statusCode, body) => ({ statusCode, body })
}));

jest.mock('../../../functions/utils/validation.mjs', () => ({
  validatePathParameters: jest.fn()
}));

const { handler } = require('../../../functions/episodes/get-blog.mjs');
const { validatePathParameters } = require('../../../functions/utils/validation.mjs');
const { Logger } = require('@aws-lambda-powertools/logger');

describe('Get Blog Function', () => {
  let mockLogger;

  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
    mockLogger = new Logger({ serviceName: 'episodes' });
  });

  describe('Handler Integration', () => {
    test('should successfully get blog with both outline and content', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      ddbMock.on(GetItemCommand).resolvesOnce({
        Item: marshall({
          pk: 'tenant-123#episode-123',
          sk: 'data#blog#outline',
          outline: '# Blog Title\n\n## Introduction',
          status: 'outline_created',
          createdAt: '2025-01-15T10:30:00Z',
          updatedAt: '2025-01-15T10:30:00Z'
        })
      }).resolvesOnce({
        Item: marshall({
          pk: 'tenant-123#episode-123',
          sk: 'data#blog#content',
          content: '# Full Blog Post\n\nContent here...',
          status: 'content_generated',
          wordCount: 1847,
          createdAt: '2025-01-15T10:30:00Z',
          updatedAt: '2025-01-15T10:35:00Z'
        })
      });

      const event = {
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.episodeId).toBe('episode-123');
      expect(result.body.outline).toBe('# Blog Title\n\n## Introduction');
      expect(result.body.content).toBe('# Full Blog Post\n\nContent here...');
      expect(result.body.status).toBe('content_generated');
      expect(result.body.wordCount).toBe(1847);
    });

    test('should successfully get blog with only outline', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      ddbMock.on(GetItemCommand).resolvesOnce({
        Item: marshall({
          pk: 'tenant-123#episode-123',
          sk: 'data#blog#outline',
          outline: '# Blog Title\n\n## Introduction',
          status: 'outline_created',
          createdAt: '2025-01-15T10:30:00Z',
          updatedAt: '2025-01-15T10:30:00Z'
        })
      }).resolvesOnce({});

      const event = {
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.episodeId).toBe('episode-123');
      expect(result.body.outline).toBe('# Blog Title\n\n## Introduction');
      expect(result.body.content).toBeNull();
      expect(result.body.status).toBe('outline_created');
      expect(result.body.wordCount).toBeNull();
    });

    test('should return 404 when no blog exists', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      ddbMock.on(GetItemCommand).resolvesOnce({}).resolvesOnce({});

      const event = {
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body.message).toBe('No blog found for episode');
    });

    test('should return 401 when tenantId is missing', async () => {
      const event = {
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: {}
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(result.body.error).toBe('Unauthorized');
    });

    test('should return validation error for invalid path parameters', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: false,
        error: { statusCode: 400, body: { error: 'ValidationError' } }
      });

      const event = {
        pathParameters: {},
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    test('should handle DynamoDB errors', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

      const event = {
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.error).toBe('InternalError');
      expect(result.body.message).toBe('Something went wrong');
    });
  });
});
