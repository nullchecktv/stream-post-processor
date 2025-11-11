const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
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

const { handler } = require('../../../functions/episodes/delete-blog.mjs');
const { validatePathParameters } = require('../../../functions/utils/validation.mjs');
const { Logger } = require('@aws-lambda-powertools/logger');

describe('Delete Blog Function', () => {
  let mockLogger;

  const mockEvent = {
    pathParameters: {
      episodeId: 'episode-123'
    },
    requestContext: {
      authorizer: {
        tenantId: 'tenant-456'
      }
    }
  };

  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
    mockLogger = new Logger({ serviceName: 'episodes' });
  });

  test('should delete both outline and content when both exist', async () => {
    validatePathParameters.mockResolvedValueOnce({
      success: true,
      data: { episodeId: 'episode-123' }
    });

    ddbMock.on(GetItemCommand).resolvesOnce({
      Item: marshall({
        pk: 'tenant-456#episode-123',
        sk: 'data#blog#outline',
        outline: '# Test Outline',
        status: 'outline_created'
      })
    }).resolvesOnce({
      Item: marshall({
        pk: 'tenant-456#episode-123',
        sk: 'data#blog#content',
        content: '# Test Content',
        status: 'content_generated'
      })
    });

    ddbMock.on(BatchWriteItemCommand).resolves({});

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(204);
    expect(result.body).toBeNull();

    const batchWriteCalls = ddbMock.commandCalls(BatchWriteItemCommand);
    expect(batchWriteCalls).toHaveLength(1);
    expect(batchWriteCalls[0].args[0].input.RequestItems['test-table']).toHaveLength(2);
  });

  test('should delete only outline when content does not exist', async () => {
    validatePathParameters.mockResolvedValueOnce({
      success: true,
      data: { episodeId: 'episode-123' }
    });

    ddbMock.on(GetItemCommand).resolvesOnce({
      Item: marshall({
        pk: 'tenant-456#episode-123',
        sk: 'data#blog#outline',
        outline: '# Test Outline',
        status: 'outline_created'
      })
    }).resolvesOnce({});

    ddbMock.on(BatchWriteItemCommand).resolves({});

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(204);

    const batchWriteCalls = ddbMock.commandCalls(BatchWriteItemCommand);
    expect(batchWriteCalls).toHaveLength(1);
    expect(batchWriteCalls[0].args[0].input.RequestItems['test-table']).toHaveLength(1);
  });

  test('should delete only content when outline does not exist', async () => {
    validatePathParameters.mockResolvedValueOnce({
      success: true,
      data: { episodeId: 'episode-123' }
    });

    ddbMock.on(GetItemCommand).resolvesOnce({}).resolvesOnce({
      Item: marshall({
        pk: 'tenant-456#episode-123',
        sk: 'data#blog#content',
        content: '# Test Content',
        status: 'content_generated'
      })
    });

    ddbMock.on(BatchWriteItemCommand).resolves({});

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(204);

    const batchWriteCalls = ddbMock.commandCalls(BatchWriteItemCommand);
    expect(batchWriteCalls).toHaveLength(1);
    expect(batchWriteCalls[0].args[0].input.RequestItems['test-table']).toHaveLength(1);
  });

  test('should return 404 when neither outline nor content exist', async () => {
    validatePathParameters.mockResolvedValueOnce({
      success: true,
      data: { episodeId: 'episode-123' }
    });

    ddbMock.on(GetItemCommand).resolves({});

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(404);
    expect(result.body.message).toBe('No blog found for episode');

    const batchWriteCalls = ddbMock.commandCalls(BatchWriteItemCommand);
    expect(batchWriteCalls).toHaveLength(0);
  });

  test('should return 401 when tenantId is missing', async () => {
    const eventWithoutTenant = {
      ...mockEvent,
      requestContext: {
        authorizer: {}
      }
    };

    const result = await handler(eventWithoutTenant);

    expect(result.statusCode).toBe(401);
    expect(result.body.error).toBe('Unauthorized');
  });

  test('should return 400 when episodeId is invalid', async () => {
    validatePathParameters.mockResolvedValueOnce({
      success: false,
      error: { statusCode: 400, body: { error: 'ValidationError' } }
    });

    const eventWithInvalidId = {
      ...mockEvent,
      pathParameters: {
        episodeId: 'not-a-uuid'
      }
    };

    const result = await handler(eventWithInvalidId);

    expect(result.statusCode).toBe(400);
  });

  test('should return 500 on DynamoDB error', async () => {
    validatePathParameters.mockResolvedValueOnce({
      success: true,
      data: { episodeId: 'episode-123' }
    });

    ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(500);
    expect(result.body.error).toBe('InternalError');
  });
});
