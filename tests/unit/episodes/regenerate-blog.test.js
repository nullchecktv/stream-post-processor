const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { marshall } = require('@aws-sdk/util-dynamodb');

jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

jest.mock('../../../functions/utils/api.mjs', () => ({
  formatResponse: (statusCode, body) => ({ statusCode, body })
}));

jest.mock('../../../functions/utils/validation.mjs', () => ({
  validatePathParameters: jest.fn(),
  validateBody: jest.fn()
}));

const { handler } = require('../../../functions/episodes/regenerate-blog.mjs');
const { validatePathParameters, validateBody } = require('../../../functions/utils/validation.mjs');
const { Logger } = require('@aws-lambda-powertools/logger');

describe('Regenerate Blog Function', () => {
  let mockLogger;

  beforeEach(() => {
    ddbMock.reset();
    eventBridgeMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
    mockLogger = new Logger({ serviceName: 'episodes' });
  });

  describe('Handler Integration', () => {
    test('should regenerate blog successfully', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { outline: 'Updated outline for regeneration' }
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'tenant-123#episode-123',
          sk: 'data#blog#outline',
          outline: 'Old outline',
          status: 'outline_created',
          createdAt: '2025-01-15T10:00:00Z'
        })
      });

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const event = {
        body: JSON.stringify({ outline: 'Updated outline for regeneration' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(202);
      expect(result.body.episodeId).toBe('episode-123');
      expect(result.body.status).toBe('Processing');
      expect(result.body.message).toBe('Blog content regeneration started');

      expect(ddbMock.calls()).toHaveLength(2);
      expect(eventBridgeMock.calls()).toHaveLength(1);

      const putItemCall = ddbMock.commandCalls(PutItemCommand)[0];
      expect(putItemCall.args[0].input.Item.outline.S).toBe('Updated outline for regeneration');
      expect(putItemCall.args[0].input.Item.status.S).toBe('Processing');

      const eventCall = eventBridgeMock.commandCalls(PutEventsCommand)[0];
      const eventDetail = JSON.parse(eventCall.args[0].input.Entries[0].Detail);
      expect(eventDetail.episodeId).toBe('episode-123');
      expect(eventDetail.tenantId).toBe('tenant-123');
      expect(eventCall.args[0].input.Entries[0].DetailType).toBe('BlogOutlineCreated');
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
      expect(ddbMock.calls()).toHaveLength(0);
      expect(eventBridgeMock.calls()).toHaveLength(0);
    });

    test('should return 404 when blog does not exist', async () => {
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
      expect(ddbMock.calls()).toHaveLength(1);
      expect(eventBridgeMock.calls()).toHaveLength(0);
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
      expect(ddbMock.calls()).toHaveLength(0);
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
      expect(ddbMock.calls()).toHaveLength(0);
    });

    test('should return validation error when outline is missing', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: false,
        error: { statusCode: 400, body: { message: 'outline is required' } }
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

    test('should handle EventBridge errors gracefully', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { outline: 'New outline' }
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'tenant-123#episode-123',
          sk: 'data#blog#outline',
          outline: 'Old outline',
          status: 'outline_created',
          createdAt: '2025-01-15T10:00:00Z'
        })
      });

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).rejects(new Error('EventBridge error'));

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
    });

    test('should preserve createdAt timestamp from existing outline', async () => {
      const originalCreatedAt = '2025-01-15T10:00:00Z';

      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { episodeId: 'episode-123' }
      });

      validateBody.mockResolvedValueOnce({
        success: true,
        data: { outline: 'New outline' }
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'tenant-123#episode-123',
          sk: 'data#blog#outline',
          outline: 'Old outline',
          status: 'outline_created',
          createdAt: originalCreatedAt
        })
      });

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const event = {
        body: JSON.stringify({ outline: 'New outline' }),
        pathParameters: { episodeId: 'episode-123' },
        requestContext: {
          authorizer: { tenantId: 'tenant-123', userId: 'user-123' }
        }
      };

      await handler(event);

      const putItemCall = ddbMock.commandCalls(PutItemCommand)[0];
      expect(putItemCall.args[0].input.Item.createdAt.S).toBe(originalCreatedAt);
    });
  });
});
