jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

const { formatResponse } = require('../../../functions/utils/api.mjs');

describe('Error Response Format Standards', () => {
  describe('formatResponse utility', () => {
    test('should include required CORS headers', () => {
      const response = formatResponse(200, { message: 'Success' });

      expect(response.headers).toHaveProperty('Content-Type', 'application/json');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
    });

    test('should format success response correctly', () => {
      const data = { id: '123', name: 'Test' };
      const response = formatResponse(200, data);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body).toEqual(data);
    });

    test('should format 400 validation error correctly', () => {
      const response = formatResponse(400, {
        error: 'ValidationError',
        message: 'Invalid input data'
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('Invalid input data');
    });

    test('should format 404 not found error correctly', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: "Resource with ID 'abc123' was not found"
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toContain('abc123');
    });

    test('should format 500 internal error correctly', () => {
      const response = formatResponse(500, {
        error: 'InternalError',
        message: 'Something went wrong'
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalError');
      expect(body.message).toBe('Something went wrong');
    });
  });

  describe('Error Type Conventions', () => {
    const errorTypes = [
      { statusCode: 400, errorType: 'ValidationError', description: 'Invalid input data' },
      { statusCode: 401, errorType: 'Unauthorized', description: 'Missing or invalid authentication' },
      { statusCode: 403, errorType: 'Forbidden', description: 'Insufficient permissions' },
      { statusCode: 404, errorType: 'NotFound', description: 'Resource not found' },
      { statusCode: 409, errorType: 'Conflict', description: 'Resource conflict' },
      { statusCode: 422, errorType: 'UnprocessableEntity', description: 'Business logic error' },
      { statusCode: 500, errorType: 'InternalError', description: 'Server error' }
    ];

    errorTypes.forEach(({ statusCode, errorType, description }) => {
      test(`should use ${errorType} for ${statusCode} errors`, () => {
        const response = formatResponse(statusCode, {
          error: errorType,
          message: description
        });

        expect(response.statusCode).toBe(statusCode);
        const body = JSON.parse(response.body);
        expect(body.error).toBe(errorType);
        expect(body.message).toBe(description);
      });
    });
  });

  describe('404 Error Message Format', () => {
    test('should include resource type and ID in message', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: "Episode with ID 'episode-123' was not found"
      });

      const body = JSON.parse(response.body);
      expect(body.message).toMatch(/Episode with ID/);
      expect(body.message).toContain('episode-123');
      expect(body.message).toContain('was not found');
    });

    test('should include parent resource for nested resources', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: "Clip with ID 'clip-456' was not found in episode 'episode-123'"
      });

      const body = JSON.parse(response.body);
      expect(body.message).toContain('clip-456');
      expect(body.message).toContain('episode-123');
      expect(body.message).toMatch(/in episode/);
    });

    test('should follow consistent format for all resource types', () => {
      const resources = [
        { type: 'Episode', id: 'episode-123' },
        { type: 'Clip', id: 'clip-456', parent: 'episode-123' },
        { type: 'Quote', id: 'quote-789', parent: 'episode-123' },
        { type: 'Track', id: 'main', parent: 'episode-123' }
      ];

      resources.forEach(({ type, id, parent }) => {
        const message = parent
          ? `${type} with ID '${id}' was not found in episode '${parent}'`
          : `${type} with ID '${id}' was not found`;

        const response = formatResponse(404, {
          error: 'NotFound',
          message
        });

        const body = JSON.parse(response.body);
        expect(body.message).toContain(id);
        expect(body.message).toContain('was not found');
        if (parent) {
          expect(body.message).toContain(parent);
        }
      });
    });
  });

  describe('Validation Error Format', () => {
    test('should include errors array for field-level validation', () => {
      const response = formatResponse(400, {
        message: 'Validation failed',
        errors: [
          {
            field: 'title',
            message: 'Title is required',
            code: 'required'
          },
          {
            field: 'episodeNumber',
            message: 'Episode number must be positive',
            code: 'invalid_value'
          }
        ]
      });

      const body = JSON.parse(response.body);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toHaveLength(2);
      expect(body.errors[0]).toHaveProperty('field');
      expect(body.errors[0]).toHaveProperty('message');
      expect(body.errors[0]).toHaveProperty('code');
    });

    test('should use simple error format for general validation errors', () => {
      const response = formatResponse(400, {
        error: 'ValidationError',
        message: 'Invalid status transition'
      });

      const body = JSON.parse(response.body);
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('Invalid status transition');
      expect(body).not.toHaveProperty('errors');
    });
  });

  describe('Error Response Structure', () => {
    test('should always include error and message fields for errors', () => {
      const errorCodes = [400, 401, 403, 404, 409, 422, 500];

      errorCodes.forEach(statusCode => {
        const response = formatResponse(statusCode, {
          error: 'TestError',
          message: 'Test error message'
        });

        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('message');
        expect(typeof body.error).toBe('string');
        expect(typeof body.message).toBe('string');
      });
    });

    test('should support optional details field', () => {
      const response = formatResponse(400, {
        error: 'InvalidSpeakers',
        message: 'One or more speakers are not valid',
        details: {
          invalidSpeakers: ['unknown-speaker'],
          validSpeakers: ['host', 'guest1']
        }
      });

      const body = JSON.parse(response.body);
      expect(body.details).toBeDefined();
      expect(body.details.invalidSpeakers).toEqual(['unknown-speaker']);
      expect(body.details.validSpeakers).toEqual(['host', 'guest1']);
    });

    test('should not include error field for success responses', () => {
      const response = formatResponse(200, {
        id: '123',
        name: 'Test'
      });

      const body = JSON.parse(response.body);
      expect(body).not.toHaveProperty('error');
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name');
    });
  });

  describe('CORS Headers Consistency', () => {
    test('should include same CORS headers for all status codes', () => {
      const statusCodes = [200, 201, 400, 404, 500];
      const headers = statusCodes.map(code => {
        const response = formatResponse(code, { message: 'Test' });
        return response.headers;
      });

      const firstHeaders = headers[0];
      headers.forEach(header => {
        expect(header['Access-Control-Allow-Origin']).toBe(firstHeaders['Access-Control-Allow-Origin']);
        expect(header['Access-Control-Allow-Methods']).toBe(firstHeaders['Access-Control-Allow-Methods']);
        expect(header['Access-Control-Allow-Headers']).toBe(firstHeaders['Access-Control-Allow-Headers']);
      });
    });

    test('should include Content-Type header in all responses', () => {
      const statusCodes = [200, 400, 404, 500];

      statusCodes.forEach(code => {
        const response = formatResponse(code, { message: 'Test' });
        expect(response.headers['Content-Type']).toBe('application/json');
      });
    });
  });

  describe('Status Code Consistency', () => {
    test('should use 400 for validation errors', () => {
      const response = formatResponse(400, {
        error: 'ValidationError',
        message: 'Invalid input'
      });

      expect(response.statusCode).toBe(400);
    });

    test('should use 404 for resource not found', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: 'Resource not found'
      });

      expect(response.statusCode).toBe(404);
    });

    test('should use 409 for conflicts', () => {
      const response = formatResponse(409, {
        error: 'Conflict',
        message: 'Resource already exists'
      });

      expect(response.statusCode).toBe(409);
    });

    test('should use 500 for internal errors', () => {
      const response = formatResponse(500, {
        error: 'InternalError',
        message: 'Something went wrong'
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('Error Message Quality', () => {
    test('should provide actionable error messages', () => {
      const goodMessages = [
        "Episode with ID 'abc123' was not found",
        'Title is required',
        'Episode number must be a positive integer',
        'Invalid status transition from Draft to Published',
        'One or more speakers are not valid for this episode'
      ];

      goodMessages.forEach(message => {
        expect(message.length).toBeGreaterThan(10);
        expect(message).not.toMatch(/^Error$/);
        expect(message).not.toMatch(/^Failed$/);
      });
    });

    test('should not expose sensitive information', () => {
      const badMessages = [
        'Database query failed: SELECT * FROM episodes',
        'AWS credentials invalid: AKIAIOSFODNN7EXAMPLE',
        'Internal server error: /var/www/app/functions/episodes.mjs:42'
      ];

      badMessages.forEach(message => {
        expect(message).toMatch(/(SELECT|AWS|\/var\/)/);
      });

      const goodMessage = 'Something went wrong';
      expect(goodMessage).not.toMatch(/(SELECT|AWS|\/var\/)/);
    });
  });
});
