jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Update Quote Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'quotes' });
  });

  describe('Request Validation', () => {
    const validateUpdateRequest = (pathParams, body, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId || !pathParams?.quoteId) {
        throw new Error('Episode ID and Quote ID are required');
      }

      if (!body || Object.keys(body).length === 0) {
        throw new Error('Update data is required');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId,
        quoteId: pathParams.quoteId,
        data: body
      };
    };

    test('should validate correct update request', () => {
      const pathParams = { episodeId: 'episode-123', quoteId: 'quote-456' };
      const body = { text: 'Updated quote' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validateUpdateRequest(pathParams, body, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
      expect(result.quoteId).toBe('quote-456');
      expect(result.data.text).toBe('Updated quote');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123', quoteId: 'quote-456' };
      const body = { text: 'Updated quote' };
      const requestContext = { authorizer: {} };

      expect(() => validateUpdateRequest(pathParams, body, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = { quoteId: 'quote-456' };
      const body = { text: 'Updated quote' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateUpdateRequest(pathParams, body, requestContext))
        .toThrow('Episode ID and Quote ID are required');
    });

    test('should reject missing quoteId', () => {
      const pathParams = { episodeId: 'episode-123' };
      const body = { text: 'Updated quote' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateUpdateRequest(pathParams, body, requestContext))
        .toThrow('Episode ID and Quote ID are required');
    });

    test('should reject empty update data', () => {
      const pathParams = { episodeId: 'episode-123', quoteId: 'quote-456' };
      const body = {};
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateUpdateRequest(pathParams, body, requestContext))
        .toThrow('Update data is required');
    });
  });

  describe('Quote Merging', () => {
    const mergeQuoteUpdates = (existingQuote, updates) => {
      const now = new Date().toISOString();
      return {
        ...existingQuote,
        ...updates,
        updatedAt: now
      };
    };

    test('should merge text update', () => {
      const existing = {
        quoteId: 'quote-789',
        text: 'Original text',
        speaker: 'John Doe',
        timestamp: '00:15:30',
        status: 'proposed',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const updates = { text: 'Updated text' };
      const result = mergeQuoteUpdates(existing, updates);

      expect(result.text).toBe('Updated text');
      expect(result.speaker).toBe('John Doe');
      expect(result.updatedAt).not.toBe(existing.updatedAt);
    });

    test('should merge speaker update', () => {
      const existing = {
        quoteId: 'quote-789',
        text: 'Quote text',
        speaker: 'John Doe',
        timestamp: '00:15:30',
        status: 'proposed',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const updates = { speaker: 'Jane Smith' };
      const result = mergeQuoteUpdates(existing, updates);

      expect(result.speaker).toBe('Jane Smith');
      expect(result.text).toBe('Quote text');
    });

    test('should merge multiple fields', () => {
      const existing = {
        quoteId: 'quote-789',
        text: 'Original text',
        speaker: 'John Doe',
        showSpeaker: true,
        showEpisodeTitle: true,
        status: 'proposed',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const updates = {
        text: 'Updated text',
        showSpeaker: false,
        showEpisodeTitle: false
      };

      const result = mergeQuoteUpdates(existing, updates);

      expect(result.text).toBe('Updated text');
      expect(result.showSpeaker).toBe(false);
      expect(result.showEpisodeTitle).toBe(false);
      expect(result.speaker).toBe('John Doe');
    });

    test('should preserve fields not in updates', () => {
      const existing = {
        quoteId: 'quote-789',
        text: 'Quote text',
        speaker: 'John Doe',
        timestamp: '00:15:30',
        relevanceScore: 85,
        status: 'proposed',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const updates = { text: 'Updated text' };
      const result = mergeQuoteUpdates(existing, updates);

      expect(result.quoteId).toBe('quote-789');
      expect(result.speaker).toBe('John Doe');
      expect(result.timestamp).toBe('00:15:30');
      expect(result.relevanceScore).toBe(85);
      expect(result.createdAt).toBe('2025-01-15T10:30:00Z');
    });
  });

  describe('Regeneration Logic', () => {
    const shouldRegenerateGraphic = (updates, existingQuote) => {
      return (
        (updates.text !== undefined && updates.text !== existingQuote.text) ||
        (updates.speaker !== undefined && updates.speaker !== existingQuote.speaker) ||
        (updates.showSpeaker !== undefined && updates.showSpeaker !== existingQuote.showSpeaker) ||
        (updates.showEpisodeTitle !== undefined && updates.showEpisodeTitle !== existingQuote.showEpisodeTitle)
      );
    };

    test('should regenerate when text changes', () => {
      const existing = { text: 'Original', speaker: 'John', showSpeaker: true, showEpisodeTitle: true };
      const updates = { text: 'Updated' };

      expect(shouldRegenerateGraphic(updates, existing)).toBe(true);
    });

    test('should regenerate when speaker changes', () => {
      const existing = { text: 'Quote', speaker: 'John', showSpeaker: true, showEpisodeTitle: true };
      const updates = { speaker: 'Jane' };

      expect(shouldRegenerateGraphic(updates, existing)).toBe(true);
    });

    test('should regenerate when showSpeaker changes', () => {
      const existing = { text: 'Quote', speaker: 'John', showSpeaker: true, showEpisodeTitle: true };
      const updates = { showSpeaker: false };

      expect(shouldRegenerateGraphic(updates, existing)).toBe(true);
    });

    test('should regenerate when showEpisodeTitle changes', () => {
      const existing = { text: 'Quote', speaker: 'John', showSpeaker: true, showEpisodeTitle: true };
      const updates = { showEpisodeTitle: false };

      expect(shouldRegenerateGraphic(updates, existing)).toBe(true);
    });

    test('should not regenerate when only status changes', () => {
      const existing = { text: 'Quote', speaker: 'John', showSpeaker: true, showEpisodeTitle: true, status: 'proposed' };
      const updates = { status: 'approved' };

      expect(shouldRegenerateGraphic(updates, existing)).toBe(false);
    });

    test('should not regenerate when only relevanceScore changes', () => {
      const existing = { text: 'Quote', speaker: 'John', showSpeaker: true, showEpisodeTitle: true, relevanceScore: 50 };
      const updates = { relevanceScore: 85 };

      expect(shouldRegenerateGraphic(updates, existing)).toBe(false);
    });

    test('should not regenerate when text is same', () => {
      const existing = { text: 'Quote', speaker: 'John', showSpeaker: true, showEpisodeTitle: true };
      const updates = { text: 'Quote' };

      expect(shouldRegenerateGraphic(updates, existing)).toBe(false);
    });
  });

  describe('EventBridge Event Creation', () => {
    const createRegenerateEvent = (tenantId, episodeId, quoteId, quote, episode) => ({
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

    test('should create correct regenerate event', () => {
      const quote = {
        text: 'Updated quote',
        speaker: 'John Doe',
        timestamp: '00:15:30',
        showSpeaker: false,
        showEpisodeTitle: true,
        status: 'proposed'
      };
      const episode = { title: 'Episode Title' };

      const event = createRegenerateEvent('tenant-123', 'episode-456', 'quote-789', quote, episode);

      expect(event.Source).toBe('nullcheck');
      expect(event.DetailType).toBe('Generate Quote Graphic');

      const detail = JSON.parse(event.Detail);
      expect(detail.tenantId).toBe('tenant-123');
      expect(detail.episodeId).toBe('episode-456');
      expect(detail.quoteId).toBe('quote-789');
      expect(detail.quote.text).toBe('Updated quote');
      expect(detail.quote.showSpeaker).toBe(false);
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

    test('should format 204 response correctly', () => {
      const response = formatResponse(204);

      expect(response.statusCode).toBe(204);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.body).toBeUndefined();
    });

    test('should format 404 response correctly', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: "Quote with ID 'quote-456' was not found"
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toContain('quote-456');
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

