const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
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
  validatePathParameters: jest.fn(),
  validateBody: jest.fn()
}));

const { handler } = require('../../../functions/episodes/update-blog.mjs');
const { validatePathParameters, validateBody } = require('../../../functions/utils/validation.mjs');
const { Logger } = require('@aws-lambda-powertools/logger');

describe('Update Blog Function', () => {
  let mockLogger;

  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
    mockLogger = new Logger({ serviceName: 'episodes' });
  });

  describe('Handler Integration', () => {
    test('should update outline successfully', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { outline: 'New outline' }
      });

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#outline',
            outline: 'Old outline',
            status: 'outline_created',
            createdAt: '2025-01-15T10:00:00Z'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#outline',
            outline: 'New outline',
            status: 'outline_edited',
            updatedAt: '2025-01-15T11:00:00Z'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#content',
            content: 'Existing content',
            status: 'content_generated',
            wordCount: 100
          })
        });

      ddbMock.on(UpdateItemCommand).resolves({});

      const event = {
        body: JSON.stringify({ outline: 'New outline' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.episodeId).toBe('episode-123');
      expect(result.body.outline).toBe('New outline');
      expect(result.body.status).toBe('content_generated');
    });

    test('should update content successfully', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { content: 'New content with more words' }
      });

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#content',
            content: 'Old content',
            status: 'content_generated',
            wordCount: 50
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#outline',
            outline: 'Existing outline',
            status: 'outline_created'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#content',
            content: 'New content with more words',
            status: 'content_edited',
            wordCount: 5
          })
        });

      ddbMock.on(UpdateItemCommand).resolves({});

      const event = {
        body: JSON.stringify({ content: 'New content with more words' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.content).toBe('New content with more words');
      expect(result.body.status).toBe('content_edited');
    });

    test('should update both outline and content', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { outline: 'New outline', content: 'New content' }
      });

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#outline',
            outline: 'Old outline',
            status: 'outline_created'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#content',
            content: 'Old content',
            status: 'content_generated',
            wordCount: 50
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#outline',
            outline: 'New outline',
            status: 'outline_edited'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-123#episode-123',
            sk: 'data#blog#content',
            content: 'New content',
            status: 'content_edited',
            wordCount: 2
          })
        });

      ddbMock.on(UpdateItemCommand).resolves({});

      const event = {
        body: JSON.stringify({ outline: 'New outline', content: 'New content' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.outline).toBe('New outline');
      expect(result.body.content).toBe('New content');
    });

    test('should return 401 when tenantId is missing', async () => {
      const event = {
        body: JSON.stringify({ outline: 'New outline' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: {}
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(result.body.error).toBe('Unauthorized');
    });

    test('should return 400 when neither outline nor content provided', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: {}
      });

      const event = {
        body: JSON.stringify({}),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body.message).toContain('At least one of outline or content must be provided');
    });

    test('should return 404 when blog outline does not exist', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { outline: 'New outline' }
      });

      ddbMock.on(GetItemCommand).resolves({});

      const event = {
        body: JSON.stringify({ outline: 'New outline' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body.message).toBe("Blog was not found for episode 'episode-123'");
    });

    test('should return 404 when blog content does not exist', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { content: 'New content' }
      });

      ddbMock.on(GetItemCommand).resolves({});

      const event = {
        body: JSON.stringify({ content: 'New content' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body.message).toBe("Blog was not found for episode 'episode-123'");
    });

    test('should return validation error for invalid path parameters', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: false,
        error: { statusCode: 400, body: { error: 'ValidationError' } }
      });

      const event = {
        body: JSON.stringify({ outline: 'New outline' }),
        pathParameters: {},
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    test('should return validation error for invalid body', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: false,
        error: { statusCode: 400, body: { message: 'Invalid request body' } }
      });

      const event = {
        body: 'invalid json',
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
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

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { outline: 'New outline' }
      });

      ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

      const event = {
        body: JSON.stringify({ outline: 'New outline' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.error).toBe('InternalError');
      expect(result.body.message).toBe('Something went wrong');
    });
  });
});
