const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { handler } = require('../../../functions/teams/leave-team.mjs');

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

process.env.TABLE_NAME = 'test-table';

describe('leave-team function', () => {
  beforeEach(() => {
    ddbMock.reset();
    eventBridgeMock.reset();
    eventBridgeMock.on(PutEventsCommand).resolves({});
  });

  const createValidEvent = (overrides = {}) => ({
    requestContext: {
      authorizer: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '456e7890-e89b-12d3-a456-426614174001'
      }
    },
    pathParameters: {
      teamId: '456e7890-e89b-12d3-a456-426614174001'
    },
    ...overrides
  });

  const mockTeamExists = (teamId = '456e7890-e89b-12d3-a456-426614174001', teamName = 'Test Team') => {
    ddbMock.on(GetItemCommand, {
      TableName: 'test-table',
      Key: {
        pk: { S: `team#${teamId}` },
        sk: { S: 'metadata' }
      }
    }).resolves({
      Item: {
        pk: { S: `team#${teamId}` },
        sk: { S: 'metadata' },
        name: { S: teamName },
        createdAt: { S: '2025-01-15T10:30:00Z' }
      }
    });
  };

  const mockMembership = (userId = '123e4567-e89b-12d3-a456-426614174000', teamId = '456e7890-e89b-12d3-a456-426614174001', role = 'member') => {
    ddbMock.on(GetItemCommand, {
      TableName: 'test-table',
      Key: {
        pk: { S: `team#${teamId}` },
        sk: { S: `user#${userId}` }
      }
    }).resolves({
      Item: {
        pk: { S: `team#${teamId}` },
        sk: { S: `user#${userId}` },
        userId: { S: userId },
        role: { S: role },
        status: { S: 'Active' }
      }
    });
  };

  const mockUserProfile = (userId, activeTeamId) => {
    const item = {
      pk: { S: `user#${userId}` },
      sk: { S: 'profile' },
      userId: { S: userId },
      name: { S: 'Test User' }
    };

    if (activeTeamId) {
      item.activeTeamId = { S: activeTeamId };
    }

    ddbMock.on(GetItemCommand, {
      TableName: 'test-table',
      Key: {
        pk: { S: `user#${userId}` },
        sk: { S: 'profile' }
      }
    }).resolves({
      Item: item
    });
  };

  describe('successful team leaving', () => {
    test('should allow member to leave team', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();
      mockUserProfile('123e4567-e89b-12d3-a456-426614174000', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(1);
    });

    test('should allow administrator to leave team', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'administrator');
      mockUserProfile('123e4567-e89b-12d3-a456-426614174000', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
    });

    test('should clear active team when leaving current active team', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();
      mockUserProfile('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001');

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(2);
    });

    test('should not update profile when leaving non-active team', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();
      mockUserProfile('123e4567-e89b-12d3-a456-426614174000', 'different-team-id');

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(1);
    });

    test('should handle missing user profile gracefully', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();

      // Mock no user profile found
      ddbMock.on(GetItemCommand, {
        TableName: 'test-table',
        Key: {
          pk: { S: 'user#123e4567-e89b-12d3-a456-426614174000' },
          sk: { S: 'profile' }
        }
      }).resolves({});

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
    });
  });

  describe('validation errors', () => {
    test('should return 404 for non-existent team', async () => {
      ddbMock.on(GetItemCommand).resolves({});

      const event = createValidEvent({
        pathParameters: {
          teamId: 'invalid-id'
        }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Team with ID 'invalid-id' was not found");
    });
  });

  describe('permission validation', () => {
    test('should reject request from non-member', async () => {
      const event = createValidEvent();

      mockTeamExists();

      // Mock no membership found
      ddbMock.on(GetItemCommand, {
        TableName: 'test-table',
        Key: {
          pk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
          sk: { S: 'user#123e4567-e89b-12d3-a456-426614174000' }
        }
      }).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    test('should prevent owner from leaving their own team', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });
  });

  describe('team validation', () => {
    test('should reject non-existent team', async () => {
      const event = createValidEvent();

      // Mock no team found
      ddbMock.on(GetItemCommand, {
        TableName: 'test-table',
        Key: {
          pk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
          sk: { S: 'metadata' }
        }
      }).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });
  });

  describe('event publishing', () => {
    test('should publish team member left event', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();
      mockUserProfile('123e4567-e89b-12d3-a456-426614174000', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      await handler(event);

      expect(eventBridgeMock.calls()).toHaveLength(1);
      const eventCall = eventBridgeMock.calls()[0];
      const eventEntry = eventCall.args[0].input.Entries[0];

      expect(eventEntry.Source).toBe('nullcheck');
      expect(eventEntry.DetailType).toBe('Team Member Left');

      const detail = JSON.parse(eventEntry.Detail);
      expect(detail.teamId).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(detail.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('database operations', () => {
    test('should update membership status to inactive', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();
      mockUserProfile('123e4567-e89b-12d3-a456-426614174000', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      await handler(event);

      const membershipUpdateCall = ddbMock.calls().find(call =>
        call.firstArg.constructor.name === 'UpdateItemCommand' &&
        call.args[0].input.UpdateExpression.includes('#status = :status')
      );
      expect(membershipUpdateCall.args[0].input.UpdateExpression).toBe('SET #status = :status, updatedAt = :updatedAt');
      expect(membershipUpdateCall.args[0].input.ConditionExpression).toBe('attribute_exists(pk)');
    });

    test('should remove activeTeamId from user profile', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();
      mockUserProfile('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001');

      ddbMock.on(UpdateItemCommand).resolves({});

      await handler(event);

      const profileUpdateCall = ddbMock.calls().find(call =>
        call.firstArg.constructor.name === 'UpdateItemCommand' &&
        call.args[0].input.UpdateExpression.includes('REMOVE activeTeamId')
      );
      expect(profileUpdateCall.args[0].input.UpdateExpression).toBe('REMOVE activeTeamId SET updatedAt = :updatedAt');
    });
  });

  describe('edge cases', () => {
    test('should handle user with no active team set', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();
      mockUserProfile('123e4567-e89b-12d3-a456-426614174000', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(1);
    });

    test('should handle profile with activeTeamId as null', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockMembership();

      // Mock profile without activeTeamId field
      ddbMock.on(GetItemCommand, {
        TableName: 'test-table',
        Key: {
          pk: { S: 'user#123e4567-e89b-12d3-a456-426614174000' },
          sk: { S: 'profile' }
        }
      }).resolves({
        Item: {
          pk: { S: 'user#123e4567-e89b-12d3-a456-426614174000' },
          sk: { S: 'profile' },
          userId: { S: '123e4567-e89b-12d3-a456-426614174000' },
          name: { S: 'Test User' }
        }
      });

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(1);
    });
  });
});

