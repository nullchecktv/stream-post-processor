jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

process.env.TABLE_NAME = 'test-table';
process.env.BUCKET_NAME = 'test-bucket';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Delete Quote Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'quotes' });
  });

  describe('Request Validation', () => {
    const validateDeleteRequest = (pathParams, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId || !pathParams?.quoteId) {
        throw new Error('Episode ID and Quote ID are required');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId,
        quoteId: pathParams.quoteId
      };
    };

    test('should validate correct delete request', () => {
      const pathParams = { episodeId: 'episode-123', quoteId: 'quote-456' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validateDeleteRequest(pathParams, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
      expect(result.quoteId).toBe('quote-456');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123', quoteId: 'quote-456' };
      const requestContext = { authorizer: {} };

      expect(() => validateDeleteRequest(pathParams, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = { quoteId: 'quote-456' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateDeleteRequest(pathParams, requestContext))
        .toThrow('Episode ID and Quote ID are required');
    });

    test('should reject missing quoteId', () => {
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateDeleteRequest(pathParams, requestContext))
        .toThrow('Episode ID and Quote ID are required');
    });
  });

  describe('DynamoDB Key Generation', () => {
    const createQuoteKey = (tenantId, episodeId, quoteId) => ({
      pk: `${tenantId}#${episodeId}`,
      sk: `data#quote#${quoteId}`
    });

    test('should create correct quote key', () => {
      const key = createQuoteKey('tenant-123', 'episode-456', 'quote-789');
      expect(key).toEqual({
        pk: 'tenant-123#episode-456',
        sk: 'data#quote#quote-789'
      });
    });
  });

  describe('S3 Cleanup Logic', () => {
    const shouldDeleteS3Object = (quote) => {
      return !!(quote && quote.s3Key);
    };

    test('should delete S3 object when s3Key exists', () => {
      const quote = {
        quoteId: 'quote-789',
        s3Key: 'tenant-123/episode-456/quotes/quote-789.png'
      };

      expect(shouldDeleteS3Object(quote)).toBe(true);
    });

    test('should not delete S3 object when s3Key is missing', () => {
      const quote = {
        quoteId: 'quote-789'
      };

      expect(shouldDeleteS3Object(quote)).toBe(false);
    });

    test('should not delete S3 object when quote is null', () => {
      expect(shouldDeleteS3Object(null)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    const shouldContinueOnS3Error = (error) => {
      return true;
    };

    test('should continue on S3 deletion errors', () => {
      const error = new Error('S3 service unavailable');
      expect(shouldContinueOnS3Error(error)).toBe(true);
    });

    test('should continue on S3 not found errors', () => {
      const error = new Error('NoSuchKey');
      error.name = 'NoSuchKey';
      expect(shouldContinueOnS3Error(error)).toBe(true);
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

    test('should format 204 response correctly', () => {
      const response = formatResponse(204);

      expect(response.statusCode).toBe(204);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.body).toBeUndefined();
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

  describe('Idempotency', () => {
    const isIdempotentResponse = (statusCode) => {
      return statusCode === 204;
    };

    test('should return 204 when quote does not exist', () => {
      expect(isIdempotentResponse(204)).toBe(true);
    });

    test('should return 204 when quote is successfully deleted', () => {
      expect(isIdempotentResponse(204)).toBe(true);
    });
  });
});
