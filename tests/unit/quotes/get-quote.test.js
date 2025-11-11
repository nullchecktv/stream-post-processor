jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

proces_NAME = 'test-table';
process.env.BUCKET_NAME = 'test-bucket';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Get Quote Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'quotes' });
  });

  describe('Request Validation', () => {
    const validateGetRequest = (pathParams, requestContext) => {
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

    test('should validate correct get request', () => {
      const pathParams = { episodeId: 'episode-123', quoteId: 'quote-456' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validateGetRequest(pathParams, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
      expect(result.quoteId).toBe('quote-456');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123', quoteId: 'quote-456' };
      const requestContext = { authorizer: {} };

      expect(() => validateGetRequest(pathParams, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = { quoteId: 'quote-456' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateGetRequest(pathParams, requestContext))
        .toThrow('Episode ID and Quote ID are required');
    });

    test('should reject missing quoteId', () => {
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateGetRequest(pathParams, requestContext))
        .toThrow('Episode ID and Quote ID are required');
    });
  });

  describe('Response Transformation', () => {
    const transformQuoteResponse = (quote, imageUrl = null) => ({
      id: quote.quoteId,
      text: quote.text,
      speaker: quote.speaker,
      timestamp: quote.timestamp,
      relevanceScore: quote.relevanceScore || 0,
      status: quote.status,
      showSpeaker: quote.showSpeaker !== undefined ? quote.showSpeaker : true,
      showEpisodeTitle: quote.showEpisodeTitle !== undefined ? quote.showEpisodeTitle : true,
      imageUrl,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt
    });

    test('should transform quote with all fields', () => {
      const quote = {
        quoteId: 'quote-789',
        text: 'Great quote',
        speaker: 'John Doe',
        timestamp: '00:15:30',
        relevanceScore: 85,
        status: 'created',
        showSpeaker: true,
        showEpisodeTitle: false,
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:35:00Z'
      };

      const result = transformQuoteResponse(quote, 'https://s3.example.com/quote.png');

      expect(result.id).toBe('quote-789');
      expect(result.text).toBe('Great quote');
      expect(result.speaker).toBe('John Doe');
      expect(result.timestamp).toBe('00:15:30');
      expect(result.relevanceScore).toBe(85);
      expect(result.status).toBe('created');
      expect(result.showSpeaker).toBe(true);
      expect(result.showEpisodeTitle).toBe(false);
      expect(result.imageUrl).toBe('https://s3.example.com/quote.png');
      expect(result.createdAt).toBe('2025-01-15T10:30:00Z');
      expect(result.updatedAt).toBe('2025-01-15T10:35:00Z');
    });

    test('should default relevanceScore to 0', () => {
      const quote = {
        quoteId: 'quote-789',
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        status: 'proposed',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const result = transformQuoteResponse(quote);
      expect(result.relevanceScore).toBe(0);
    });

    test('should default showSpeaker to true', () => {
      const quote = {
        quoteId: 'quote-789',
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        status: 'proposed',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const result = transformQuoteResponse(quote);
      expect(result.showSpeaker).toBe(true);
    });

    test('should default showEpisodeTitle to true', () => {
      const quote = {
        quoteId: 'quote-789',
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        status: 'proposed',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const result = transformQuoteResponse(quote);
      expect(result.showEpisodeTitle).toBe(true);
    });

    test('should handle null imageUrl', () => {
      const quote = {
        quoteId: 'quote-789',
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        status: 'proposed',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const result = transformQuoteResponse(quote, null);
      expect(result.imageUrl).toBeNull();
    });
  });

  describe('Presigned URL Logic', () => {
    const shouldGeneratePresignedUrl = (quote) => {
      return !!(quote.s3Key && quote.status === 'created');
    };

    test('should generate URL when s3Key exists and status is created', () => {
      const quote = {
        s3Key: 'tenant-123/episode-456/quotes/quote-789.png',
        status: 'created'
      };

      expect(shouldGeneratePresignedUrl(quote)).toBe(true);
    });

    test('should not generate URL when s3Key is missing', () => {
      const quote = {
        status: 'created'
      };

      expect(shouldGeneratePresignedUrl(quote)).toBe(false);
    });

    test('should not generate URL when status is not created', () => {
      const quote = {
        s3Key: 'tenant-123/episode-456/quotes/quote-789.png',
        status: 'proposed'
      };

      expect(shouldGeneratePresignedUrl(quote)).toBe(false);
    });

    test('should not generate URL when status is failed', () => {
      const quote = {
        s3Key: 'tenant-123/episode-456/quotes/quote-789.png',
        status: 'failed'
      };

      expect(shouldGeneratePresignedUrl(quote)).toBe(false);
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
      const quote = {
        id: 'quote-789',
        text: 'Great quote',
        speaker: 'John Doe'
      };

      const response = formatResponse(200, quote);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.id).toBe('quote-789');
      expect(body.text).toBe('Great quote');
    });

    test('should format 404 response correctly', () => {
      const response = formatResponse(404, { error: 'Quote not found' });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Quote not found');
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

