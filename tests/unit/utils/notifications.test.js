const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, QueryCommand, DeleteItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

const {
  listNotifications,
  deleteNotification,
  markNotificationAsRead,
  createTeamInvitationNotification,
  removeNotificationsByInvitation,
  publishNotificationEvent
} = require('../../../functions/utils/notifications.mjs');

describe('Notification Utilities', () => {
  beforeEach(() => {
    ddbMock.reset();
    eventBridgeMock.reset();
    process.env.TABLE_NAME = 'test-table';
    jest.clearAllMocks();
  });

  describe('publishNotificationEvent', () => {
    test('should publish notification event to EventBridge', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      await publishNotificationEvent({
        type: 'team_invitation',
        tenantId: 'tenant-123',
        title: 'Team Invitation',
        message: 'You have been invited to join Test Team',
        url: '/teams/team-456',
        persist: true,
        metadata: { teamId: 'team-456' }
      });

      const eventCall = eventBridgeMock.calls()[0];
      expect(eventCall.args[0].input.Entries).toHaveLength(1);
      expect(eventCall.args[0].input.Entries[0].Source).toBe('nullcheck');
      expect(eventCall.args[0].input.Entries[0].DetailType).toBe('Notification');

      const detail = JSON.parse(eventCall.args[0].input.Entries[0].Detail);
      expect(detail.type).toBe('team_invitation');
      expect(detail.tenantId).toBe('tenant-123');
      expect(detail.persist).toBe(true);
    });

    test('should handle EventBridge errors', async () => {
      eventBridgeMock.on(PutEventsCommand).rejects(new Error('EventBridge error'));

      await expect(publishNotificationEvent({
        type: 'test',
        tenantId: 'tenant-123',
        title: 'Test',
        message: 'Test message'
      })).rejects.toThrow('Failed to publish notification event');
    });
  });

  describe('listNotifications', () => {
    test('should list notifications successfully', async () => {
      const mockNotifications = [
        {
          pk: 'tenant-123',
          sk: 'notification#notif-1',
          GSI1PK: 'tenant-123',
          GSI1SK: 'notification#2025-01-15T10:30:00.000Z',
          id: 'notif-1',
          type: 'team_invitation',
          title: 'Team Invitation',
          message: 'Test message',
          isRead: false,
          createdAt: '2025-01-15T10:30:00.000Z',
          ttl: 1234567890
        }
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockNotifications.map(n => marshall(n)),
        LastEvaluatedKey: undefined
      });

      const result = await listNotifications('tenant-123');

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]).toMatchObject({
        id: 'notif-1',
        type: 'team_invitation',
        title: 'Team Invitation',
        isRead: false
      });
      expect(result.hasMore).toBe(false);

      const queryCall = ddbMock.calls()[0];
      expect(queryCall.args[0].input.IndexName).toBe('GSI1');
      expect(queryCall.args[0].input.KeyConditionExpression).toBe('GSI1PK = :pk AND begins_with(GSI1SK, :sk)');
    });

    test('should filter by isRead status', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [],
        LastEvaluatedKey: undefined
      });

      await listNotifications('tenant-123', { isRead: true });

      const queryCall = ddbMock.calls()[0];
      expect(queryCall.args[0].input.FilterExpression).toBe('isRead = :isRead');
    });

    test('should handle pagination', async () => {
      const mockKey = {
        pk: 'tenant-123',
        sk: 'notification#notif-1',
        GSI1PK: 'tenant-123',
        GSI1SK: 'notification#2025-01-15T10:30:00.000Z'
      };

      ddbMock.on(QueryCommand).resolves({
        Items: [],
        LastEvaluatedKey: marshall(mockKey)
      });

      const result = await listNotifications('tenant-123');

      expect(result.hasMore).toBe(true);
      expect(result.lastEvaluatedKey).toBeDefined();
    });
  });

  describe('deleteNotification', () => {
    test('should delete notification successfully', async () => {
      ddbMock.on(DeleteItemCommand).resolves({});

      const result = await deleteNotification('tenant-123', 'notif-456');

      expect(result).toBe(true);
      expect(ddbMock.calls()).toHaveLength(1);

      const deleteCall = ddbMock.calls()[0];
      const key = unmarshall(deleteCall.args[0].input.Key);
      expect(key.pk).toBe('tenant-123');
      expect(key.sk).toBe('notification#notif-456');
    });

    test('should return false if notification does not exist', async () => {
      const error = new Error('Conditional check failed');
      error.name = 'ConditionalCheckFailedException';
      ddbMock.on(DeleteItemCommand).rejects(error);

      const result = await deleteNotification('tenant-123', 'notif-456');

      expect(result).toBe(false);
    });
  });

  describe('markNotificationAsRead', () => {
    test('should mark notification as read successfully', async () => {
      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await markNotificationAsRead('tenant-123', 'notif-456');

      expect(result).toBe(true);
      expect(ddbMock.calls()).toHaveLength(1);

      const updateCall = ddbMock.calls()[0];
      const key = unmarshall(updateCall.args[0].input.Key);
      expect(key.pk).toBe('tenant-123');
      expect(key.sk).toBe('notification#notif-456');
    });

    test('should return false if notification does not exist', async () => {
      const error = new Error('Conditional check failed');
      error.name = 'ConditionalCheckFailedException';
      ddbMock.on(UpdateItemCommand).rejects(error);

      const result = await markNotificationAsRead('tenant-123', 'notif-456');

      expect(result).toBe(false);
    });
  });

  describe('createTeamInvitationNotification', () => {
    test('should publish team invitation notification event', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      await createTeamInvitationNotification('user-123', 'team-456', 'Test Team', 'John Doe', 'inv-789');

      const eventCall = eventBridgeMock.calls()[0];
      const detail = JSON.parse(eventCall.args[0].input.Entries[0].Detail);

      expect(detail.type).toBe('team_invitation');
      expect(detail.tenantId).toBe('user-123');
      expect(detail.metadata.teamId).toBe('team-456');
      expect(detail.metadata.invitationId).toBe('inv-789');
    });
  });

  describe('removeNotificationsByInvitation', () => {
    test('should remove notifications by invitation ID', async () => {
      const mockNotifications = [
        {
          pk: 'tenant-123',
          sk: 'notification#notif-1',
          GSI1PK: 'tenant-123',
          GSI1SK: 'notification#2025-01-15T10:30:00.000Z',
          id: 'notif-1',
          data: { invitationId: 'inv-789' }
        }
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockNotifications.map(n => marshall(n))
      });
      ddbMock.on(DeleteItemCommand).resolves({});

      const result = await removeNotificationsByInvitation('tenant-123', 'inv-789');

      expect(result).toBe(true);
      const deleteCalls = ddbMock.calls().filter(c => c.args[0] instanceof DeleteItemCommand);
      expect(deleteCalls).toHaveLength(1);

      const queryCall = ddbMock.calls()[0];
      expect(queryCall.args[0].input.IndexName).toBe('GSI1');
    });

    test('should handle no matching notifications', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: []
      });

      const result = await removeNotificationsByInvitation('tenant-123', 'inv-789');

      expect(result).toBe(true);
    });
  });
});
