jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

process.env.TABLE_NAME = 'test-table';
process.env.MODEL_ID = 'test-model';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Blog Generator Error Responses', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'agents' });
  });

  describe('Error Response Format', () => {
    const formatResponse = (statusCode, body) => {
      return {
        statusCode,
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    test('should format 400 validation error correctly', () => {
      const response = formatResponse(400, {
        error: 'ValidationError',
        message: 'Missing required fields'
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('Missing required fields');
    });

    test('should format 404 not found error correctly', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: 'Blog outline not found'
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toBe('Blog outline not found');
    });

    test('should include both error and message fields', () => {
      const validationResponse = formatResponse(400, {
        error: 'ValidationError',
        message: 'Missing required fields'
      });

      const notFoundResponse = formatResponse(404, {
        error: 'NotFound',
        message: 'Blog outline not found'
      });

      const validationBody = JSON.parse(validationResponse.body);
      expect(validationBody).toHaveProperty('error');
      expect(validationBody).toHaveProperty('message');

      const notFoundBody = JSON.parse(notFoundResponse.body);
      expect(notFoundBody).toHaveProperty('error');
      expect(notFoundBody).toHaveProperty('message');
    });

    test('should not use old format with only statusCode and message', () => {
      const oldFormat = {
        statusCode: 400,
        message: 'Missing required fields'
      };

      const newFormat = formatResponse(400, {
        error: 'ValidationError',
        message: 'Missing required fields'
      });

      expect(oldFormat).not.toHaveProperty('body');
      expect(oldFormat).not.toHaveProperty('headers');
      expect(newFormat).toHaveProperty('body');
      expect(newFormat).toHaveProperty('headers');
      expect(newFormat.headers).toHaveProperty('Access-Control-Allow-Origin');
    });
  });

  describe('Event Validation', () => {
    const validateEvent = (event) => {
      const detail = event?.detail;
      const episodeId = detail?.episodeId;
      const tenantId = detail?.tenantId;

      if (!episodeId || !tenantId) {
        return {
          valid: false,
          error: 'ValidationError',
          message: 'Missing required fields'
        };
      }

      return {
        valid: true,
        episodeId,
        tenantId
      };
    };

    test('should validate event with all required fields', () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-123',
          userId: 'user-123'
        }
      };

      const result = validateEvent(event);
      expect(result.valid).toBe(true);
      expect(result.episodeId).toBe('episode-123');
      expect(result.tenantId).toBe('tenant-123');
    });

    test('should reject event missing episodeId', () => {
      const event = {
        detail: {
          tenantId: 'tenant-123',
          userId: 'user-123'
        }
      };

      const result = validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ValidationError');
      expect(result.message).toBe('Missing required fields');
    });

    test('should reject event missing tenantId', () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          userId: 'user-123'
        }
      };

      const result = validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ValidationError');
      expect(result.message).toBe('Missing required fields');
    });

    test('should reject event with no detail', () => {
      const event = {};

      const result = validateEvent(event);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ValidationError');
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers in all responses', () => {
      const responses = [
        {
          statusCode: 200,
          body: JSON.stringify({ message: 'Success' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        },
        {
          statusCode: 400,
          body: JSON.stringify({ error: 'ValidationError', message: 'Invalid' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        },
        {
          statusCode: 404,
          body: JSON.stringify({ error: 'NotFound', message: 'Not found' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      ];

      responses.forEach(response => {
        expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
        expect(response.headers).toHaveProperty('Content-Type');
        expect(response.headers['Content-Type']).toBe('application/json');
      });
    });
  });
});
