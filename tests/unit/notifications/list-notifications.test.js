const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddbMock = mockClient(DynamoDBClient);

// Mock the utilities
jest.mock('../../../functions/utils/api.mjs', () => ({
  formatResponse: (statusCode, body) => ({ statusCode, body }),
  getPagingParams: (event) => {
    const query = event?.queryStringParameters || {};
    const rawLimit = query.limit;
    let limit;

    if (rawLimit !== null && rawLimit !== undefined && rawLimit !== '') {
      const parsed = parseInt(rawLimit, 10);
      limit = Math.max(1, Math.min(25, Number.isFinite(parsed) ? parsed : 10));
    } else {
      limit = 10;
    }

    return {
      limit,
      nextToken: query?.nextToken || undefined
    };
  },
  buildPagingParams: (items, lastKey, hasMore = null) => {
    const includeNextToken = hasMore !== null ? hasMore : !!lastKey;
    const response = { items };

    if (includeNextToken && lastKey) {
      response.nextToken = 'encoded-cursor';
    }

    return response;
  }
}));

jest.mock('../../../functions/utils/notifications.mjs', () => ({
  listNotifications: jest.fn()
}));

const { handler } = require('../../../functions/notifications/list-notifications.mjs');
const { listNotifications } = require('../../../functions/utils/notifications.mjs');

describe('List Notifications Handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Authentication and authorization', () => {
    test('should require valid tenantId in authorizer context', async () => {
      const event = {
        requestContext: { authorizer: {} }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(result.body.message).toBe('Unauthorized');
      expect(listNotifications).not.toHaveBeenCalled();
    });

    test('should accept valid tenantId', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(listNotifications).toHaveBeenCalledWith('tenant-123', {
        cursor: undefined,
        limit: 10,
        isRead: undefined
      });
    });
  });

  describe('Query parameter handling', () => {
    test('should handle default pagination parameters', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      await handler(event);

      expect(listNotifications).toHaveBeenCalledWith('tenant-123', {
        cursor: undefined,
        limit: 10,
        isRead: undefined
      });
    });

    test('should handle custom limit parameter', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        },
        queryStringParameters: {
          limit: '50'
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      await handler(event);

      expect(listNotifications).toHaveBeenCalledWith('tenant-123', {
        cursor: undefined,
        limit: 25,
        isRead: undefined
      });
    });

    test('should handle nextToken parameter', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        },
        queryStringParameters: {
          nextToken: 'encoded-cursor-123'
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      await handler(event);

      expect(listNotifications).toHaveBeenCalledWith('tenant-123', {
        cursor: 'encoded-cursor-123',
        limit: 10,
        isRead: undefined
      });
    });

    test('should handle isRead filter parameter', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        },
        queryStringParameters: {
          isRead: 'true'
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      await handler(event);

      expect(listNotifications).toHaveBeenCalledWith('tenant-123', {
        cursor: undefined,
        limit: 10,
        isRead: true
      });
    });

    test('should handle isRead=false filter', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        },
        queryStringParameters: {
          isRead: 'false'
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      await handler(event);

      expect(listNotifications).toHaveBeenCalledWith('tenant-123', {
        cursor: undefined,
        limit: 10,
        isRead: false
      });
    });

    test('should ignore invalid isRead values', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        },
        queryStringParameters: {
          isRead: 'maybe'
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      await handler(event);

      expect(listNotifications).toHaveBeenCalledWith('tenant-123', {
        cursor: undefined,
        limit: 10,
        isRead: undefined
      });
    });
  });

  describe('Response formatting', () => {
    test('should return notifications with pagination info', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'team_invitation',
          title: 'Team Invitation',
          message: 'You have been invited to join Test Team',
          isRead: false,
          createdAt: '2025-01-15T10:30:00Z'
        },
        {
          id: 'notif-2',
          type: 'team_member_added',
          title: 'Team Member Added',
          message: 'You have been added to Test Team',
          isRead: true,
          createdAt: '2025-01-15T09:30:00Z'
        }
      ];

      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: mockNotifications,
        lastEvaluatedKey: { pk: 'tenant#tenant-123', sk: 'notification#notif-2' },
        hasMore: true
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toEqual({
        items: mockNotifications,
        nextToken: 'encoded-cursor'
      });
    });

    test('should handle empty notification list', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toEqual({
        items: []
      });
    });

    test('should handle missing query parameters gracefully', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        },
        queryStringParameters: null
      };

      listNotifications.mockResolvedValueOnce({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(listNotifications).toHaveBeenCalledWith('tenant-123', {
        cursor: undefined,
        limit: 10,
        isRead: undefined
      });
    });
  });

  describe('Error handling', () => {
    test('should handle notification service errors', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      listNotifications.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Failed to list notifications');
    });

    test('should handle unexpected errors gracefully', async () => {
      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        }
      };

      listNotifications.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Failed to list notifications');
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle large notification lists', async () => {
      const largeNotificationList = Array(100).fill().map((_, i) => ({
        id: `notif-${i}`,
        type: 'test',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        isRead: i % 2 === 0,
        createdAt: '2025-01-15T10:30:00Z'
      }));

      const event = {
        requestContext: {
          authorizer: { tenantId: 'tenant-123' }
        },
        queryStringParameters: {
          limit: '25'
        }
      };

      listNotifications.mockResolvedValueOnce({
        notifications: largeNotificationList,
        lastEvaluatedKey: null,
        hasMore: false
      });

      const startTime = Date.now();
      const result = await handler(event);
      const endTime = Date.now();

      expect(result.statusCode).toBe(200);
      expect(result.body.items).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    test('should handle concurrent requests', async () => {
      const events = Array(5).fill().map((_, i) => ({
        requestContext: {
          authorizer: { tenantId: `tenant-${i}` }
        }
      }));

      listNotifications.mockResolvedValue({
        notifications: [],
        lastEvaluatedKey: null,
        hasMore: false
      });

      const promises = events.map(event => handler(event));
      const results = await Promise.all(promises);

      results.forEach((result, i) => {
        expect(result.statusCode).toBe(200);
      });

      expect(listNotifications).toHaveBeenCalledTimes(5);
    });

    test('should handle malformed request context', async () => {
      const event = {
        requestContext: null
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(result.body.message).toBe('Unauthorized');
    });
  });
});
