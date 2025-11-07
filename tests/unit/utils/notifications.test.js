const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const ddbMock = mockClient(DynamoDBClient);



const {
  createNotification,
  listNotifications,
  deleteNotification,
  markNotificationAsRead,
  createTeamInvitationNotification,
  removeNotificationsByInvitation
} = require('../../../functions/utils/notifications.mjs');

describe('Notification Utilities', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-table';
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    test('should create notification successfully', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const result = await createNotification(
        'user-123',
        'team_invitation',
        'Team Invitation',
        'You have been invited to join Test Team',
        { teamId: 'team-456', invitationId: 'inv-789' }
      );

      expect(result).toMatchObject({
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Test Team',
        data: { teamId: 'team-456', invitationId: 'inv-789' },
        isRead: false
      });

      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.ttl).toBeDefined();

      expect(ddbMock.calls()).toHaveLength(1);
      const putCall = ddbMock.calls()[0];
      expect(putCall.args[0].input.TableName).toBe('test-table');
      expect(putCall.args[0].input.ConditionExpression).toBe('attribute_not_exists(pk) AND attribute_not_exists(sk)');
    });

    test('should handle DynamoDB errors', async () => {
      ddbMock.on(PutItemCommand).rejects(new Error('DynamoDB error'));

      await expect(createNotification(
        'user-123',
        'team_invitation',
        'Test',
        'Test message'
      )).rejects.toThrow('Failed to create notification');
    });

    test('should set correct TTL (30 days)', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const beforeTime = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

      const result = await createNotification('user-123', 'test', 'Test', 'Test');

      const afterTime = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

      expect(result.ttl).toBeGreaterThanOrEqual(beforeTime);
      expect(result.ttl).toBeLessThanOrEqual(afterTime);
    });

    test('should create correct DynamoDB keys', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const result = await createNotification('user-123', 'test', 'Test', 'Test');

      const putCall = ddbMock.calls()[0];
      const item = unmarshall(putCall.args[0].input.Item);

      expect(item.pk).toBe('user#user-123');
      expect(item.sk).toMatch(/^notification#/);
      expect(item.GSI1PK).toBe('user#user-123');
      expect(item.GSI1SK).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z#/);
    });
  });

  describe('listNotifications', () => {
    test('should list notifications successfully', async () => {
      const mockNotifications = [
        {
          pk: marshall('user#user-123'),
          sk: marshall('notification#notif-1'),
          GSI1PK: marshall('user#user-123'),
          GSI1SK: marshall('2025-01-15T10:30:00Z#notif-1'),
          id: marshall('notif-1'),
          type: marshall('team_invitation'),
          title: marshall('Team Invitation'),
          message: marshall('Test message'),
          isRead: marshall(false),
          createdAt: marshall('2025-01-15T10:30:00Z'),
          ttl: marshall(1642248000)
        }
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockNotifications,
        LastEvaluatedKey: null
      });

      const result = await listNotifications('user-123');

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]).toMatchObject({
        id: 'notif-1',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'Test message',
        isRead: false
      });

      // Should not include internal DynamoDB fields
      expect(result.notifications[0].pk).toBeUndefined();
      expect(result.notifications[0].sk).toBeUndefined();
      expect(result.notifications[0].GSI1PK).toBeUndefined();
      expect(result.notifications[0].GSI1SK).toBeUndefined();
      expect(result.notifications[0].ttl).toBeUndefined();

      expect(result.hasMore).toBe(false);
      expect(result.lastEvaluatedKey).toBeNull();
    });

    test('should handle pagination correctly', async () => {
      const cursor = { pk: marshall('user#user-123'), sk: marshall('notification#last') };

      ddbMock.on(QueryCommand).resolves({
        Items: [],
        LastEvaluatedKey: cursor
      });

      const result = await listNotifications('user-123', { cursor, limit: 10 });

      expect(result.hasMore).toBe(true);
      expect(result.lastEvaluatedKey).toEqual(cursor);

      const queryCall = ddbMock.calls()[0];
      expect(queryCall.args[0].input.ExclusiveStartKey).toEqual(cursor);
      expect(queryCall.args[0].input.Limit).toBe(10);
    });

    test('should filter by read status', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      await listNotifications('user-123', { isRead: true });

      const queryCall = ddbMock.calls()[0];
      expect(queryCall.args[0].input.FilterExpression).toBe('isRead = :isRead');
      expect(queryCall.args[0].input.ExpressionAttributeValues[':isRead']).toEqual(marshall(true));
    });

    test('should use correct GSI and sort order', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      await listNotifications('user-123');

      const queryCall = ddbMock.calls()[0];
      expect(queryCall.args[0].input.IndexName).toBe('GSI1');
      expect(queryCall.args[0].input.KeyConditionExpression).toBe('GSI1PK = :pk');
      expect(queryCall.args[0].input.ScanIndexForward).toBe(false); // Newest first
    });

    test('should handle DynamoDB errors', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      await expect(listNotifications('user-123')).rejects.toThrow('Failed to list notifications');
    });

    test('should handle empty results', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: null });

      const result = await listNotifications('user-123');

      expect(result.notifications).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('deleteNotification', () => {
    test('should delete notification successfully', async () => {
      ddbMock.on(DeleteItemCommand).resolves({});

      const result = await deleteNotification('user-123', 'notif-456');

      expect(result).toBe(true);

      const deleteCall = ddbMock.calls()[0];
      expect(deleteCall.args[0].input.TableName).toBe('test-table');
      expect(deleteCall.args[0].input.ConditionExpression).toBe('attribute_exists(pk) AND attribute_exists(sk)');

      const key = unmarshall(deleteCall.args[0].input.Key);
      expect(key.pk).toBe('user#user-123');
      expect(key.sk).toBe('notification#notif-456');
    });

    test('should handle non-existent notification', async () => {
      const conditionalError = new Error('Conditional check failed');
      conditionalError.name = 'ConditionalCheckFailedException';
      ddbMock.on(DeleteItemCommand).rejects(conditionalError);

      const result = await deleteNotification('user-123', 'nonexistent');

      expect(result).toBe(false);
    });

    test('should handle other DynamoDB errors', async () => {
      ddbMock.on(DeleteItemCommand).rejects(new Error('DynamoDB error'));

      await expect(deleteNotification('user-123', 'notif-456')).rejects.toThrow('Failed to delete notification');
    });
  });

  describe('markNotificationAsRead', () => {
    test('should mark notification as read successfully', async () => {
      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await markNotificationAsRead('user-123', 'notif-456');

      expect(result).toBe(true);

      const updateCall = ddbMock.calls()[0];
      expect(updateCall.args[0].input.UpdateExpression).toBe('SET isRead = :isRead');
      expect(updateCall.args[0].input.ExpressionAttributeValues[':isRead']).toEqual(marshall(true));
      expect(updateCall.args[0].input.ConditionExpression).toBe('attribute_exists(pk) AND attribute_exists(sk)');
    });

    test('should handle non-existent notification', async () => {
      const conditionalError = new Error('Conditional check failed');
      conditionalError.name = 'ConditionalCheckFailedException';
      ddbMock.on(UpdateItemCommand).rejects(conditionalError);

      const result = await markNotificationAsRead('user-123', 'nonexistent');

      expect(result).toBe(false);
    });

    test('should handle other DynamoDB errors', async () => {
      ddbMock.on(UpdateItemCommand).rejects(new Error('DynamoDB error'));

      await expect(markNotificationAsRead('user-123', 'notif-456')).rejects.toThrow('Failed to mark notification as read');
    });
  });

  describe('createTeamInvitationNotification', () => {
    test('should create team invitation notification with correct data', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const result = await createTeamInvitationNotification(
        'user-123',
        'team-456',
        'Test Team',
        'John Doe',
        'inv-789'
      );

      expect(result.type).toBe('team_invitation');
      expect(result.title).toBe('Team Invitation');
      expect(result.message).toBe('You have been invited to join Test Team');
      expect(result.data).toEqual({
        teamId: 'team-456',
        teamName: 'Test Team',
        inviterName: 'John Doe',
        invitationId: 'inv-789'
      });
    });
  });

  describe('removeNotificationsByInvitation', () => {
    test('should remove notifications by invitation ID successfully', async () => {
      const mockNotifications = [
        marshall({
          pk: 'user#user-123',
          sk: 'notification#notif-1',
          id: 'notif-1',
          data: { invitationId: 'inv-789' }
        }),
        marshall({
          pk: 'user#user-123',
          sk: 'notification#notif-2',
          id: 'notif-2',
          data: { invitationId: 'inv-789' }
        })
      ];

      ddbMock.on(QueryCommand).resolves({ Items: mockNotifications });
      ddbMock.on(DeleteItemCommand).resolves({}); // Both deletes succeed

      const result = await removeNotificationsByInvitation('user-123', 'inv-789');

      expect(result).toBe(true);
      expect(ddbMock.calls()).toHaveLength(3); // 1 query + 2 deletes

      const queryCall = ddbMock.calls()[0];
      expect(queryCall.args[0].input.FilterExpression).toBe('#data.invitationId = :invitationId');
      expect(queryCall.args[0].input.ExpressionAttributeNames['#data']).toBe('data');
    });

    test('should handle no matching notifications', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await removeNotificationsByInvitation('user-123', 'inv-nonexistent');

      expect(result).toBe(true);
      expect(ddbMock.calls()).toHaveLength(1); // Only query, no deletes
    });

    test('should handle partial deletion failures', async () => {
      const mockNotifications = [
        marshall({
          pk: 'user#user-123',
          sk: 'notification#notif-1',
          id: 'notif-1',
          data: { invitationId: 'inv-789' }
        }),
        marshall({
          pk: 'user#user-123',
          sk: 'notification#notif-2',
          id: 'notif-2',
          data: { invitationId: 'inv-789' }
        })
      ];

      ddbMock.on(QueryCommand).resolves({ Items: mockNotifications });
      ddbMock.on(DeleteItemCommand)
        .resolvesOnce({}) // First delete succeeds
        .rejectsOnce(new Error('Delete failed')); // Second delete fails

      const result = await removeNotificationsByInvitation('user-123', 'inv-789');

      expect(result).toBe(true); // Should still return true even with partial failures
    });

    test('should handle query errors', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('Query failed'));

      await expect(removeNotificationsByInvitation('user-123', 'inv-789'))
        .rejects.toThrow('Failed to remove invitation notifications');
    });
  });

  describe('TTL and cleanup operations', () => {
    test('should set TTL correctly for automatic cleanup', async () => {
      ddbMock.on(PutItemCommand).resolves({});

      const beforeTime = Math.floor(Date.now() / 1000);
      await createNotification('user-123', 'test', 'Test', 'Test');
      const afterTime = Math.floor(Date.now() / 1000);

      const putCall = ddbMock.calls()[0];
      const item = unmarshall(putCall.args[0].input.Item);

      const expectedMinTTL = beforeTime + (30 * 24 * 60 * 60); // 30 days
      const expectedMaxTTL = afterTime + (30 * 24 * 60 * 60);

      expect(item.ttl).toBeGreaterThanOrEqual(expectedMinTTL);
      expect(item.ttl).toBeLessThanOrEqual(expectedMaxTTL);
    });


  });

  describe('Performance and edge cases', () => {
    test('should handle large notification lists efficiently', async () => {
      const largeNotificationList = Array(100).fill().map((_, i) => ({
        pk: marshall(`user#user-123`),
        sk: marshall(`notification#notif-${i}`),
        id: marshall(`notif-${i}`),
        type: marshall('test'),
        title: marshall(`Notification ${i}`),
        message: marshall(`Message ${i}`),
        isRead: marshall(false),
        createdAt: marshall('2025-01-15T10:30:00Z')
      }));

      ddbMock.on(QueryCommand).resolves({
        Items: largeNotificationList,
        LastEvaluatedKey: null
      });

      const startTime = Date.now();
      const result = await listNotifications('user-123', { limit: 100 });
      const endTime = Date.now();

      expect(result.notifications).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    test('should handle concurrent notification operations', async () => {
      ddbMock.on(PutItemCommand).resolves({});
      ddbMock.on(DeleteItemCommand).resolves({});

      const operations = [
        createNotification('user-1', 'test', 'Test 1', 'Message 1'),
        createNotification('user-2', 'test', 'Test 2', 'Message 2'),
        deleteNotification('user-3', 'notif-3'),
        markNotificationAsRead('user-4', 'notif-4')
      ];

      ddbMock.on(UpdateItemCommand).resolves({});

      const results = await Promise.allSettled(operations);

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(4);
    });

    test('should handle malformed notification data gracefully', async () => {
      const malformedNotifications = [
        {
          pk: marshall('user#user-123'),
          sk: marshall('notification#notif-1'),
          // Missing required fields
        }
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: malformedNotifications
      });

      const result = await listNotifications('user-123');

      expect(result.notifications).toHaveLength(1);
      // Should handle missing fields gracefully
      expect(result.notifications[0]).toBeDefined();
    });
  });
});
