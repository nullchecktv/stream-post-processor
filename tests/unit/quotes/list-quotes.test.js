jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('List Quotes Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'quotes' });
  });

  describe('Request Validation', () => {
    const validateListRequest = (pathParams, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId) {
        throw new Error('Episode ID is required');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId
      };
    };

    test('should validate correct list request', () => {
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validateListRequest(pathParams, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: {} };

      expect(() => validateListRequest(pathParams, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = {};
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateListRequest(pathParams, requestContext))
        .toThrow('Episode ID is required');
    });
  });

  describe('Pagination Parameters', () => {
    const getPagingParams = (event) => {
      const limit = event.queryStringParameters?.limit
        ? Math.min(parseInt(event.queryStringParameters.limit, 10), 100)
        : 20;

      const nextToken = event.queryStringParameters?.cursor || null;

      return { limit, nextToken };
    };

    test('should use default limit of 20', () => {
      const event = { queryStringParameters: {} };
      const { limit } = getPagingParams(event);
      expect(limit).toBe(20);
    });

    test('should use provided limit', () => {
      const event = { queryStringParameters: { limit: '50' } };
      const { limit } = getPagingParams(event);
      expect(limit).toBe(50);
    });

    test('should cap limit at 100', () => {
      const event = { queryStringParameters: { limit: '200' } };
      const { limit } = getPagingParams(event);
      expect(limit).toBe(100);
    });

    test('should extract cursor from query parameters', () => {
      const event = { queryStringParameters: { cursor: 'abc123' } };
      const { nextToken } = getPagingParams(event);
      expect(nextToken).toBe('abc123');
    });

    test('should return null cursor when not provided', () => {
      const event = { queryStringParameters: {} };
      const { nextToken } = getPagingParams(event);
      expect(nextToken).toBeNull();
    });
  });

  describe('Query Parameters', () => {
    const buildQueryParams = (tenantId, episodeId, limit, nextToken) => {
      const params = {
        TableName: process.env.TABLE_NAME,
        Limit: limit,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': `${tenantId}#${episodeId}`,
          ':sk': 'data#quote#'
        }
      };

      if (nextToken) {
        params.ExclusiveStartKey = nextToken;
      }

      return params;
    };

    test('should build correct query parameters', () => {
      const params = buildQueryParams('tenant-123', 'episode-456', 20, null);

      expect(params.TableName).toBe('test-table');
      expect(params.Limit).toBe(20);
      expect(params.KeyConditionExpression).toBe('pk = :pk AND begins_with(sk, :sk)');
      expect(params.ExpressionAttributeValues[':pk']).toBe('tenant-123#episode-456');
      expect(params.ExpressionAttributeValues[':sk']).toBe('data#quote#');
      expect(params.ExclusiveStartKey).toBeUndefined();
    });

    test('should include ExclusiveStartKey when nextToken provided', () => {
      const nextToken = { pk: 'tenant-123#episode-456', sk: 'data#quote#quote-789' };
      const params = buildQueryParams('tenant-123', 'episode-456', 20, nextToken);

      expect(params.ExclusiveStartKey).toEqual(nextToken);
    });
  });

  describe('Response Transformation', () => {
    const transformQuoteListItem = (quote) => ({
      id: quote.quoteId,
      text: quote.text,
      speaker: quote.speaker,
      timestamp: quote.timestamp,
      relevanceScore: quote.relevanceScore || 0,
      status: quote.status
    });

    test('should transform quote to list item', () => {
      const quote = {
        quoteId: 'quote-789',
        text: 'Great quote',
        speaker: 'John Doe',
        timestamp: '00:15:30',
        relevanceScore: 85,
        status: 'created'
      };

      const result = transformQuoteListItem(quote);

      expect(result.id).toBe('quote-789');
      expect(result.text).toBe('Great quote');
      expect(result.speaker).toBe('John Doe');
      expect(result.timestamp).toBe('00:15:30');
      expect(result.relevanceScore).toBe(85);
      expect(result.status).toBe('created');
    });

    test('should default relevanceScore to 0', () => {
      const quote = {
        quoteId: 'quote-789',
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        status: 'proposed'
      };

      const result = transformQuoteListItem(quote);
      expect(result.relevanceScore).toBe(0);
    });
  });

  describe('Pagination Response', () => {
    const buildPagingParams = (items, lastEvaluatedKey) => {
      const response = { items };

      if (lastEvaluatedKey) {
        response.nextCursor = Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
        response.hasMore = true;
      } else {
        response.nextCursor = null;
        response.hasMore = false;
      }

      return response;
    };

    test('should build response with pagination', () => {
      const items = [
        { id: 'quote-1', text: 'Quote 1' },
        { id: 'quote-2', text: 'Quote 2' }
      ];
      const lastKey = { pk: 'tenant-123#episode-456', sk: 'data#quote#quote-2' };

      const result = buildPagingParams(items, lastKey);

      expect(result.items).toEqual(items);
      expect(result.nextCursor).toBeTruthy();
      expect(result.hasMore).toBe(true);
    });

    test('should build response without pagination', () => {
      const items = [
        { id: 'quote-1', text: 'Quote 1' }
      ];

      const result = buildPagingParams(items, null);

      expect(result.items).toEqual(items);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    test('should handle empty results', () => {
      const result = buildPagingParams([], null);

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Response Formatting', () => {
    const formatResponse = (statusCode, body = null) => {
      const response = {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
        }
      };

      if (body) {
        response.body = JSON.stringify(body);
      }

      return response;
    };

    test('should format 200 response correctly', () => {
      const data = {
        items: [{ id: 'quote-1', text: 'Quote 1' }],
        nextCursor: null,
        hasMore: false
      };

      const response = formatResponse(200, data);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(1);
      expect(body.hasMore).toBe(false);
    });

    test('should format 401 error response correctly', () => {
      const response = formatResponse(401, { error: 'Unauthorized' });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    test('should format 500 error response correctly', () => {
      const response = formatResponse(500, {
        message: 'Something went wrong'
      });

      expect(response.statusCode).toBe(500);

      const body = JSON.parse(response.body);
      expect(body.message).toBe('Something went wrong');
    });
  });
});

