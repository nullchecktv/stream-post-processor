const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, DeleteItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { handler } = require('../../../functions/teams/remove-member.mjs');

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

process.env.TABLE_NAME = 'test-table';

describe('remove-member function', () => {
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
      teamId: '456e7890-e89b-12d3-a456-426614174001',
      userId: '789e0123-e89b-12d3-a456-426614174002'
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

  const mockRequesterMembership = (userId = '123e4567-e89b-12d3-a456-426614174000', teamId = '456e7890-e89b-12d3-a456-426614174001', role = 'owner') => {
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

  const mockTargetMembership = (targetUserId = '789e0123-e89b-12d3-a456-426614174002', teamId = '456e7890-e89b-12d3-a456-426614174001', role = 'member') => {
    ddbMock.on(GetItemCommand, {
      TableName: 'test-table',
      Key: {
        pk: { S: `team#${teamId}` },
        sk: { S: `user#${targetUserId}` }
      }
    }).resolves({
      Item: {
        pk: { S: `team#${teamId}` },
        sk: { S: `user#${targetUserId}` },
        userId: { S: targetUserId },
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

  describe('successful member deactivation (default)', () => {
    test('should deactivate member successfully', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(1);
    });

    test('should clear active team when deactivating member with active team set', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001');

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(2);
    });

    test('should not update profile when user has different active team', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', 'different-team-id');

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(1);
    });

    test('should handle missing user profile gracefully', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();

      // Mock no user profile found
      ddbMock.on(GetItemCommand, {
        TableName: 'test-table',
        Key: {
          pk: { S: 'user#789e0123-e89b-12d3-a456-426614174002' },
          sk: { S: 'profile' }
        }
      }).resolves({});

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
    });
  });

  describe('successful member deletion (with confirmDelete)', () => {
    test('should delete member when confirmDelete is true', async () => {
      const event = createValidEvent({
        queryStringParameters: {
          confirmDelete: 'true'
        }
      });

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', null);

      ddbMock.on(DeleteItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'DeleteItemCommand')).toHaveLength(1);
    });

    test('should clear active team when deleting member with active team set', async () => {
      const event = createValidEvent({
        queryStringParameters: {
          confirmDelete: 'true'
        }
      });

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001');

      ddbMock.on(DeleteItemCommand).resolves({});
      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(1);
    });
  });

  describe('validation errors', () => {
    test('should return 404 for non-existent team', async () => {
      ddbMock.on(GetItemCommand).resolves({});

      const event = createValidEvent({
        pathParameters: {
          teamId: 'invalid-id',
          userId: '789e0123-e89b-12d3-a456-426614174002'
        }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("Team with ID 'invalid-id' was not found");
    });

    test('should return 404 for non-existent user in valid team', async () => {
      const mockTeam = {
        pk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
        sk: { S: 'metadata' },
        name: { S: 'Test Team' }
      };

      const mockMembership = {
        pk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
        sk: { S: 'user#user-123' },
        role: { S: 'owner' },
        status: { S: 'Active' }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({ Item: mockTeam })
        .resolvesOnce({ Item: mockMembership })
        .resolvesOnce({}); // No target membership found

      const event = createValidEvent({
        pathParameters: {
          teamId: '456e7890-e89b-12d3-a456-426614174001',
          userId: 'invalid-id'
        }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe("User with ID 'invalid-id' is not a member of team '456e7890-e89b-12d3-a456-426614174001'");
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

    test('should reject request from regular member', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'member');

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    test('should allow request from administrator', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'administrator');
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
    });

    test('should prevent owner from removing themselves', async () => {
      const event = createValidEvent({
        pathParameters: {
          teamId: '456e7890-e89b-12d3-a456-426614174001',
          userId: '123e4567-e89b-12d3-a456-426614174000'
        }
      });

      mockTeamExists();
      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');
      mockTargetMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });
  });

  describe('target member validation', () => {
    test('should reject removal of non-existent member', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();

      // Mock no target membership found
      ddbMock.on(GetItemCommand, {
        TableName: 'test-table',
        Key: {
          pk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
          sk: { S: 'user#789e0123-e89b-12d3-a456-426614174002' }
        }
      }).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
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
    test('should publish team member deactivated event by default', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      await handler(event);

      expect(eventBridgeMock.calls()).toHaveLength(1);
      const eventCall = eventBridgeMock.calls()[0];
      const eventEntry = eventCall.args[0].input.Entries[0];

      expect(eventEntry.Source).toBe('nullcheck');
      expect(eventEntry.DetailType).toBe('Team Member Deactivated');

      const detail = JSON.parse(eventEntry.Detail);
      expect(detail.teamId).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(detail.targetUserId).toBe('789e0123-e89b-12d3-a456-426614174002');
      expect(detail.actionBy).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(detail.action).toBe('deactivated');
    });

    test('should publish team member removed event when confirmDelete is true', async () => {
      const event = createValidEvent({
        queryStringParameters: {
          confirmDelete: 'true'
        }
      });

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', null);

      ddbMock.on(DeleteItemCommand).resolves({});

      await handler(event);

      expect(eventBridgeMock.calls()).toHaveLength(1);
      const eventCall = eventBridgeMock.calls()[0];
      const eventEntry = eventCall.args[0].input.Entries[0];

      expect(eventEntry.Source).toBe('nullcheck');
      expect(eventEntry.DetailType).toBe('Team Member Removed');

      const detail = JSON.parse(eventEntry.Detail);
      expect(detail.teamId).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(detail.targetUserId).toBe('789e0123-e89b-12d3-a456-426614174002');
      expect(detail.actionBy).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(detail.action).toBe('deleted');
    });
  });

  describe('database operations', () => {
    test('should update membership status to inactive by default', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', null);

      ddbMock.on(UpdateItemCommand).resolves({});

      await handler(event);

      const membershipUpdateCall = ddbMock.calls().find(call =>
        call.firstArg.constructor.name === 'UpdateItemCommand' &&
        call.args[0].input.UpdateExpression.includes('#status = :status')
      );
      expect(membershipUpdateCall.args[0].input.UpdateExpression).toBe('SET #status = :status, updatedAt = :updatedAt');
      expect(membershipUpdateCall.args[0].input.ConditionExpression).toBe('attribute_exists(pk)');
    });

    test('should use conditional delete when confirmDelete is true', async () => {
      const event = createValidEvent({
        queryStringParameters: {
          confirmDelete: 'true'
        }
      });

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership();
      mockUserProfile('789e0123-e89b-12d3-a456-426614174002', null);

      ddbMock.on(DeleteItemCommand).resolves({});

      await handler(event);

      const deleteCall = ddbMock.calls().find(call => call.firstArg.constructor.name === 'DeleteItemCommand');
      expect(deleteCall.args[0].input.ConditionExpression).toBe('attribute_exists(pk)');
    });
  });
});

