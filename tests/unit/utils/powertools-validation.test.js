const { mockClient } = require('aws-sdk-client-mock');
const { z } = require('zod');

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

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

const { validateRequest, validatePathParameters, validateQueryParameters } = require('../../../functions/utils/validation.mjs');

describe('Powertools Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      email: z.string().email()
    });

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

      const result = validateRequest(event, testSchema);

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.userId).toBe('user-123');
      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
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

      const result = validateRequest(event, testSchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toBeDefined();
      expect(Array.isArray(body.errors)).toBe(true);
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

      const result = validateRequest(event, testSchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
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

      const badSchema = {
        parse: () => {
          throw new Error('Database connection failed');
        }
      };

      expect(() => validateRequest(event, badSchema)).toThrow('Database connection failed');
    });
  });

  describe('validatePathParameters', () => {
    const pathSchema = z.object({
      episodeId: z.string().uuid(),
      clipId: z.string().min(1).optional()
    });

    test('should validate path parameters successfully', async () => {
      const event = {
        pathParameters: {
          episodeId: '123e4567-e89b-12d3-a456-426614174000',
          clipId: 'clip-001'
        }
      };

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
    });

    test('should handle path parameter validation errors', async () => {
      const event = {
        pathParameters: {
          episodeId: 'invalid-uuid'
        }
      };

      const result = await validatePathParameters(event, pathSchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toBeDefined();
      expect(Array.isArray(body.errors)).toBe(true);
    });
  });

  describe('validateQueryParameters', () => {
    const querySchema = z.object({
      limit: z.string().regex(/^[1-9][0-9]?$|^100$/).optional(),
      isRead: z.enum(['true', 'false']).optional()
    });

    test('should validate query parameters successfully', async () => {
      const event = {
        queryStringParameters: {
          limit: '20',
          isRead: 'false'
        }
      };

      const result = await validateQueryParameters(event, querySchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        limit: '20',
        isRead: 'false'
      });
    });

    test('should handle missing query parameters', async () => {
      const event = {};

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

      const result = await validateQueryParameters(event, querySchema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.message).toBe('Validation failed');
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

      const schema = z.object({
        name: z.string()
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

      const schema = z.object({}).passthrough();

      const result = validateRequest(event, schema);

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

      const schema = z.object({
        data: z.string(),
        items: z.array(z.object({ id: z.number(), name: z.string() }))
      });

      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant-123',
            userId: 'user-123'
          }
        },
        body: JSON.stringify(largePayload)
      };

      const startTime = Date.now();
      const result = validateRequest(event, schema);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(largePayload);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
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

      const schema = z.object({
        name: z.string(),
        email: z.string().email()
      });

      const results = events.map(event => validateRequest(event, schema));

      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.tenantId).toBe(`tenant-${i}`);
        expect(result.userId).toBe(`user-${i}`);
        expect(result.data.name).toBe(`User ${i}`);
      });
    });
  });
});
