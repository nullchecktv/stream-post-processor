const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, DeleteItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const ddbMock = mockClient(DynamoDBClient);

// Mock the utilities
jest.mock('../../../functions/utils/api.mjs', () => ({
  formatResponse: (statusCode, body) => ({ statusCode, body }),
  formatEmptyResponse: () => ({ statusCode: 204, body: '' })
}));

jest.mock('../../../functions/utils/notifications.mjs', () => ({
  deleteNotification: jest.fn(),
  markNotificationAsRead: jest.fn()
}));

const { handler } = require('../../../functions/notifications/delete-notification.mjs');
const { deleteNotification, markNotificationAsRead } = require('../../../functions/utils/notifications.mjs');

describe('De Notification Handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Authentication and authorization', () => {
    test('should require valid userId in authorizer context', async () => {
      const event = {
        requestContext: { authorizer: {} },
        pathParameters: { notificationId: 'notif-123' }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(result.body.message).toBe('Unauthorized');
      expect(deleteNotification).not.toHaveBeenCalled();
      expect(markNotificationAsRead).not.toHaveBeenCalled();
    });

    test('should accept valid userId', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' }
      };

      deleteNotification.mockResolvedValueOnce(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(deleteNotification).toHaveBeenCalledWith('user-123', 'notif-456');
    });
  });

  describe('Path parameter validation', () => {
    test('should require notificationId parameter', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: {}
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body.message).toBe('Notification ID is required');
      expect(deleteNotification).not.toHaveBeenCalled();
    });

    test('should handle missing pathParameters', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body.message).toBe('Notification ID is required');
    });

    test('should accept valid notificationId', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' }
      };

      deleteNotification.mockResolvedValueOnce(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(deleteNotification).toHaveBeenCalledWith('user-123', 'notif-456');
    });
  });

  describe('Delete operation', () => {
    test('should delete notification successfully', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' }
      };

      deleteNotification.mockResolvedValueOnce(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(result.body).toBe('');
      expect(deleteNotification).toHaveBeenCalledWith('user-123', 'notif-456');
      expect(markNotificationAsRead).not.toHaveBeenCalled();
    });

    test('should handle non-existent notification', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'nonexistent' }
      };

      deleteNotification.mockResolvedValueOnce(false);

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body.message).toBe('Notification not found');
    });

    test('should handle delete service errors', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' }
      };

      deleteNotification.mockRejectedValueOnce(new Error('Database error'));

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Failed to process notification');
    });
  });

  describe('Mark as read operation', () => {
    test('should mark notification as read when isRead=true', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' },
        queryStringParameters: { isRead: 'true' }
      };

      markNotificationAsRead.mockResolvedValueOnce(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(result.body).toBe('');
      expect(markNotificationAsRead).toHaveBeenCalledWith('user-123', 'notif-456');
      expect(deleteNotification).not.toHaveBeenCalled();
    });

    test('should handle non-existent notification when marking as read', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'nonexistent' },
        queryStringParameters: { isRead: 'true' }
      };

      markNotificationAsRead.mockResolvedValueOnce(false);

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body.message).toBe('Notification not found');
    });

    test('should handle mark as read service errors', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' },
        queryStringParameters: { isRead: 'true' }
      };

      markNotificationAsRead.mockRejectedValueOnce(new Error('Database error'));

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Failed to process notification');
    });

    test('should ignore other isRead values and default to delete', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' },
        queryStringParameters: { isRead: 'false' }
      };

      deleteNotification.mockResolvedValueOnce(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(deleteNotification).toHaveBeenCalledWith('user-123', 'notif-456');
      expect(markNotificationAsRead).not.toHaveBeenCalled();
    });
  });

  describe('Query parameter handling', () => {
    test('should handle missing queryStringParameters', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' }
      };

      deleteNotification.mockResolvedValueOnce(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(deleteNotification).toHaveBeenCalledWith('user-123', 'notif-456');
    });

    test('should handle null queryStringParameters', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' },
        queryStringParameters: null
      };

      deleteNotification.mockResolvedValueOnce(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(deleteNotification).toHaveBeenCalledWith('user-123', 'notif-456');
    });

    test('should handle empty queryStringParameters', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' },
        queryStringParameters: {}
      };

      deleteNotification.mockResolvedValueOnce(true);

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(deleteNotification).toHaveBeenCalledWith('user-123', 'notif-456');
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle malformed request context', async () => {
      const event = {
        requestContext: null,
        pathParameters: { notificationId: 'notif-456' }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(result.body.message).toBe('Unauthorized');
    });

    test('should handle unexpected errors', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' }
      };

      deleteNotification.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Failed to process notification');
    });

    test('should handle concurrent delete requests', async () => {
      const events = Array(5).fill().map((_, i) => ({
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: `notif-${i}` }
      }));

      deleteNotification.mockResolvedValue(true);

      const promises = events.map(event => handler(event));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.statusCode).toBe(204);
      });

      expect(deleteNotification).toHaveBeenCalledTimes(5);
    });

    test('should handle mixed operations (delete and mark as read)', async () => {
      const deleteEvent = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-delete' }
      };

      const markReadEvent = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-read' },
        queryStringParameters: { isRead: 'true' }
      };

      deleteNotification.mockResolvedValueOnce(true);
      markNotificationAsRead.mockResolvedValueOnce(true);

      const [deleteResult, markReadResult] = await Promise.all([
        handler(deleteEvent),
        handler(markReadEvent)
      ]);

      expect(deleteResult.statusCode).toBe(204);
      expect(markReadResult.statusCode).toBe(204);
      expect(deleteNotification).toHaveBeenCalledWith('user-123', 'notif-delete');
      expect(markNotificationAsRead).toHaveBeenCalledWith('user-123', 'notif-read');
    });
  });

  describe('Performance considerations', () => {
    test('should complete operations quickly', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' }
      };

      deleteNotification.mockResolvedValueOnce(true);

      const startTime = Date.now();
      const result = await handler(event);
      const endTime = Date.now();

      expect(result.statusCode).toBe(204);
      expect(endTime - startTime).toBeLessThan(50); // Should complete very quickly
    });

    test('should handle rapid successive requests', async () => {
      const event = {
        requestContext: {
          authorizer: { userId: 'user-123' }
        },
        pathParameters: { notificationId: 'notif-456' }
      };

      deleteNotification.mockResolvedValue(true);

      const promises = Array(10).fill().map(() => handler(event));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.statusCode).toBe(204);
      });
    });
  });
});
