const { mockClient } = require('aws-sdk-client-mock');

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

// Mock AWS Lambda Powertools validation BEFORE importing the module
jest.mock('@aws-lambda-powertools/validation', () => ({
  validate: jest.fn()
}));

jest.mock('@aws-lambda-powertools/validation/errors', () => ({
  SchemaValidationError: class SchemaValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'SchemaValidationError';
    }
  }
}));

// Mock the API utilities
jest.mock('../../../functions/utils/api.mjs', () => ({
  formatResponse: (statusCode, body) => ({
    statusCode,
    body: typeof body === 'string' ? JSON.stringify({ message: body }) : JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  }),
  parseBody: (event) => {
    if (!event.body) return {};
    try {
      return JSON.parse(event.body);
    } catch {
      return null;
    }
  }
}));

const { validate } = require('@aws-lambda-powertools/validation');
const { SchemaValidationError } = require('@aws-lambda-powertools/validation/errors');
const { validateRequest, validatePathParameters, validateQueryParameters } = require('../../../functions/utils/validation.mjs');

describe('Powertools Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    const testSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' }
      },
      required: ['name', 'email']
    };

    test('should validate successful request with valid data', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com'
        })
      };

      validate.mockReturnValueOnce();

      const result = validateRequest(event, testSchema);

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.userId).toBe('user-123');
      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(validate).toHaveBeenCalledWith({
        payload: { name: 'John Doe', email: 'john@example.com' },
        schema: testSchema
      });
    });

    test('should handle missing tenantId and userId in authorizer', () => {
      const event = {
        requestContext: { authorizer: {} },
        body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' })
      };

      const result = validateRequest(event, testSchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(401);
      expect(JSON.parse(result.error.body).message).toBe('Unauthorized');
      expect(validate).not.toHaveBeenCalled();
    });

    test('should handle invalid JSON in request body', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        },
        body: 'invalid json'
      };

      const result = validateRequest(event, testSchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      expect(JSON.parse(result.error.body).message).toBe('Invalid JSON format');
      expect(validate).not.toHaveBeenCalled();
    });

    test('should handle schema validation errors', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email'
        })
      };

      const validationError = new SchemaValidationError('Validation failed: name is required');
      validationError.cause = [
        { path: ['name'], message: 'String must contain at least 1 character(s)', code: 'too_small' },
        { path: ['email'], message: 'Invalid email format', code: 'invalid_string' }
      ];
      validate.mockImplementationOnce(() => {
        throw validationError;
      });

      const result = validateRequest(event, testSchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toHaveLength(2);
      expect(body.errors[0]).toEqual({
        field: 'name',
        message: 'String must contain at least 1 character(s)',
        code: 'too_small'
      });
      expect(body.errors[1]).toEqual({
        field: 'email',
        message: 'Invalid email format',
        code: 'invalid_string'
      });
    });

    test('should handle empty request body', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        }
      };

      validate.mockReturnValueOnce();

      const result = validateRequest(event, testSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(validate).toHaveBeenCalledWith({
        payload: {},
        schema: testSchema
      });
    });

    test('should propagate non-validation errors', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        },
        body: JSON.stringify({ name: 'John', email: 'john@example.com' })
      };

      const unexpectedError = new Error('Database connection failed');
      validate.mockImplementationOnce(() => {
        throw unexpectedError;
      });

      expect(() => validateRequest(event, testSchema)).toThrow('Database connection failed');
    });
  });

  describe('validatePathParameters', () => {
    const pathSchema = {
      type: 'object',
      properties: {
        episodeId: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
        clipId: { type: 'string', minLength: 1 }
      },
      required: ['episodeId']
    };

    test('should validate path parameters successfully', async () => {
      const event = {
        pathParameters: {
          episodeId: '123e4567-e89b-12d3-a456-426614174000',
          clipId: 'clip-001'
        }
      };

      validate.mockResolvedValueOnce();

      const result = await validatePathParameters(event, pathSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        clipId: 'clip-001'
      });
    });

    test('should handle missing path parameters', async () => {
      const event = {};

      const result = await validatePathParameters(event, pathSchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      expect(JSON.parse(result.error.body).message).toBe('Missing path parameters');
      expect(validate).not.toHaveBeenCalled();
    });

    test('should handle path parameter validation errors', async () => {
      const event = {
        pathParameters: {
          episodeId: 'invalid-uuid'
        }
      };

      const validationError = new SchemaValidationError('Invalid UUID format');
      validationError.cause = [
        { path: ['episodeId'], message: 'Invalid UUID format', code: 'invalid_string' }
      ];
      validate.mockRejectedValueOnce(validationError);

      const result = await validatePathParameters(event, pathSchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].field).toBe('episodeId');
    });
  });

  describe('validateQueryParameters', () => {
    const querySchema = {
      type: 'object',
      properties: {
        limit: { type: 'string', pattern: '^[1-9][0-9]?$|^100$' },
        isRead: { enum: ['true', 'false'] }
      }
    };

    test('should validate query parameters successfully', async () => {
      const event = {
        queryStringParameters: {
          limit: '20',
          isRead: 'false'
        }
      };

      validate.mockResolvedValueOnce();

      const result = await validateQueryParameters(event, querySchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        limit: '20',
        isRead: 'false'
      });
    });

    test('should handle missing query parameters', async () => {
      const event = {};

      validate.mockResolvedValueOnce();

      const result = await validateQueryParameters(event, querySchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    test('should handle query parameter validation errors', async () => {
      const event = {
        queryStringParameters: {
          limit: '200', // Exceeds maximum
          isRead: 'maybe' // Invalid enum value
        }
      };

      const validationError = new SchemaValidationError('Limit exceeds maximum value');
      validationError.cause = [
        { path: ['limit'], message: 'Limit exceeds maximum value', code: 'invalid_string' }
      ];
      validate.mockRejectedValueOnce(validationError);

      const result = await validateQueryParameters(event, querySchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toHaveLength(1);
    });
  });

  describe('Error handling and response formatting', () => {
    test('should format validation error responses consistently', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        },
        body: JSON.stringify({ invalid: 'data' })
      };

      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      };

      const validationError = new SchemaValidationError('Missing required field: name');
      validationError.cause = [
        { path: ['name'], message: 'Required', code: 'invalid_type' }
      ];
      validate.mockImplementationOnce(() => {
        throw validationError;
      });

      const result = validateRequest(event, schema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toBeDefined();
      expect(Array.isArray(body.errors)).toBe(true);
    });

    test('should handle edge cases in validation', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        },
        body: JSON.stringify({})
      };

      validate.mockReturnValueOnce();

      const result = validateRequest(event, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });
  });

  describe('Performance considerations', () => {
    test('should handle large payloads efficiently', () => {
      const largePayload = {
        data: 'x'.repeat(10000), // 10KB string
        items: Array(1000).fill().map((_, i) => ({ id: i, name: `Item ${i}` }))
      };

      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        },
        body: JSON.stringify(largePayload)
      };

      validate.mockReturnValueOnce();

      const startTime = Date.now();
      const result = validateRequest(event, {});
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(largePayload);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    test('should handle concurrent validation requests', () => {
      const events = Array(10).fill().map((_, i) => ({
        requestContext: {
          authorizer: {
            tenantId: `tenant-${i}`,
            userId: `user-${i}`
          }
        },
        body: JSON.stringify({ name: `User ${i}`, email: `user${i}@example.com` })
      }));

      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' }
        }
      };

      validate.mockReturnValue();

      const results = events.map(event => validateRequest(event, schema));

      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.tenantId).toBe(`tenant-${i}`);
        expect(result.userId).toBe(`user-${i}`);
        expect(result.data.name).toBe(`User ${i}`);
      });

      expect(validate).toHaveBeenCalledTimes(10);
    });
  });
});
