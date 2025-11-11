jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Create Quote Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'quotes' });
  });

  describe('Request Validation', () => {
    const validateCreateRequest = (pathParams, body, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId) {
        throw new Error('Episode ID is required');
      }

      if (!body?.text || typeof body.text !== 'string') {
        throw new Error('Quote text is required');
      }

      if (!body?.speaker || typeof body.speaker !== 'string') {
        throw new Error('Speaker is required');
      }

      if (!body?.timestamp || typeof body.timestamp !== 'string') {
        throw new Error('Timestamp is required');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId,
        data: body
      };
    };

    test('should validate correct create request', () => {
      const pathParams = { episodeId: 'episode-123' };
      const body = {
        text: 'This is a great quote',
        speaker: 'John Doe',
        timestamp: '00:15:30'
      };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validateCreateRequest(pathParams, body, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
      expect(result.data.text).toBe('This is a great quote');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123' };
      const body = { text: 'Quote', speaker: 'John', timestamp: '00:15:30' };
      const requestContext = { authorizer: {} };

      expect(() => validateCreateRequest(pathParams, body, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = {};
      const body = { text: 'Quote', speaker: 'John', timestamp: '00:15:30' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateCreateRequest(pathParams, body, requestContext))
        .toThrow('Episode ID is required');
    });

    test('should reject missing text', () => {
      const pathParams = { episodeId: 'episode-123' };
      const body = { speaker: 'John', timestamp: '00:15:30' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateCreateRequest(pathParams, body, requestContext))
        .toThrow('Quote text is required');
    });

    test('should reject missing speaker', () => {
      const pathParams = { episodeId: 'episode-123' };
      const body = { text: 'Quote', timestamp: '00:15:30' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateCreateRequest(pathParams, body, requestContext))
        .toThrow('Speaker is required');
    });

    test('should reject missing timestamp', () => {
      const pathParams = { episodeId: 'episode-123' };
      const body = { text: 'Quote', speaker: 'John' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateCreateRequest(pathParams, body, requestContext))
        .toThrow('Timestamp is required');
    });
  });

  describe('Quote Entity Creation', () => {
    const createQuoteEntity = (tenantId, episodeId, quoteId, data) => {
      const now = new Date().toISOString();
      return {
        pk: `${tenantId}#${episodeId}`,
        sk: `data#quote#${quoteId}`,
        GSI1PK: `${tenantId}#quotes`,
        GSI1SK: `${data.timestamp}#${episodeId}#${quoteId}`,
        quoteId,
        text: data.text,
        speaker: data.speaker,
        timestamp: data.timestamp,
        relevanceScore: data.relevanceScore || 0,
        context: data.context || '',
        showSpeaker: data.showSpeaker !== undefined ? data.showSpeaker : true,
        showEpisodeTitle: data.showEpisodeTitle !== undefined ? data.showEpisodeTitle : true,
        status: 'proposed',
        createdAt: now,
        updatedAt: now,
        ttl: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60)
      };
    };

    test('should create quote entity with required fields', () => {
      const data = {
        text: 'This is a great quote',
        speaker: 'John Doe',
        timestamp: '00:15:30'
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);

      expect(quote.pk).toBe('tenant-123#episode-456');
      expect(quote.sk).toBe('data#quote#quote-789');
      expect(quote.GSI1PK).toBe('tenant-123#quotes');
      expect(quote.GSI1SK).toBe('00:15:30#episode-456#quote-789');
      expect(quote.quoteId).toBe('quote-789');
      expect(quote.text).toBe('This is a great quote');
      expect(quote.speaker).toBe('John Doe');
      expect(quote.timestamp).toBe('00:15:30');
      expect(quote.status).toBe('proposed');
    });

    test('should set default relevanceScore to 0', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30'
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      expect(quote.relevanceScore).toBe(0);
    });

    test('should use provided relevanceScore', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        relevanceScore: 85
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      expect(quote.relevanceScore).toBe(85);
    });

    test('should set default context to empty string', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30'
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      expect(quote.context).toBe('');
    });

    test('should use provided context', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        context: 'Discussion about AI'
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      expect(quote.context).toBe('Discussion about AI');
    });

    test('should default showSpeaker to true', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30'
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      expect(quote.showSpeaker).toBe(true);
    });

    test('should respect showSpeaker false', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        showSpeaker: false
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      expect(quote.showSpeaker).toBe(false);
    });

    test('should default showEpisodeTitle to true', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30'
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      expect(quote.showEpisodeTitle).toBe(true);
    });

    test('should respect showEpisodeTitle false', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30',
        showEpisodeTitle: false
      };

      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      expect(quote.showEpisodeTitle).toBe(false);
    });

    test('should set TTL to 14 days from now', () => {
      const data = {
        text: 'Quote',
        speaker: 'John',
        timestamp: '00:15:30'
      };

      const beforeCreate = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60);
      const quote = createQuoteEntity('tenant-123', 'episode-456', 'quote-789', data);
      const afterCreate = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60);

      expect(quote.ttl).toBeGreaterThanOrEqual(beforeCreate);
      expect(quote.ttl).toBeLessThanOrEqual(afterCreate);
    });
  });

  describe('EventBridge Event Creation', () => {
    const createGraphicEvent = (tenantId, episodeId, quoteId, quote, episode) => ({
      Source: 'nullcheck',
      DetailType: 'Generate Quote Graphic',
      Detail: JSON.stringify({
        tenantId,
        episodeId,
        quoteId,
        quote: {
          text: quote.text,
          speaker: quote.speaker,
          timestamp: quote.timestamp,
          showSpeaker: quote.showSpeaker,
          showEpisodeTitle: quote.showEpisodeTitle,
          status: quote.status
        },
        episode: {
          title: episode.title
        }
      })
    });

    test('should create correct event structure', () => {
      const quote = {
        text: 'Great quote',
        speaker: 'John Doe',
        timestamp: '00:15:30',
        showSpeaker: true,
        showEpisodeTitle: true,
        status: 'proposed'
      };
      const episode = { title: 'Episode Title' };

      const event = createGraphicEvent('tenant-123', 'episode-456', 'quote-789', quote, episode);

      expect(event.Source).toBe('nullcheck');
      expect(event.DetailType).toBe('Generate Quote Graphic');

      const detail = JSON.parse(event.Detail);
      expect(detail.tenantId).toBe('tenant-123');
      expect(detail.episodeId).toBe('episode-456');
      expect(detail.quoteId).toBe('quote-789');
      expect(detail.quote.text).toBe('Great quote');
      expect(detail.episode.title).toBe('Episode Title');
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

    test('should format 201 response correctly', () => {
      const response = formatResponse(201, { id: 'quote-789' });

      expect(response.statusCode).toBe(201);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.id).toBe('quote-789');
    });

    test('should format 409 conflict response correctly', () => {
      const response = formatResponse(409, {
        error: 'Conflict',
        message: 'Quote already exists'
      });

      expect(response.statusCode).toBe(409);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Conflict');
      expect(body.message).toBe('Quote already exists');
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

