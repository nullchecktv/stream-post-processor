const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { handler } = require('../../../functions/teams/update-member-role.mjs');

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

process.env.TABLE_NAME = 'test-table';

describe('update-member-role function', () => {
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
    body: JSON.stringify({
      role: 'administrator'
    }),
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
        status: { S: 'active' }
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
        status: { S: 'active' },
        updatedAt: { S: '2025-01-15T10:30:00Z' }
      }
    });
  };

  describe('successful role updates', () => {
    test('should update member role from member to administrator', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001', 'member');

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Member role updated successfully');
      // Simplified response
      // Simplified response
    });

    test('should update member role from administrator to member', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          role: 'member'
        })
      });

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001', 'administrator');

      ddbMock.on(UpdateItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      // Simplified response
    });

    test('should handle no-change scenario gracefully', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          role: 'member'
        })
      });

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001', 'member');

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Member role is already set to the requested value');
      expect(ddbMock.calls().filter(call => call.firstArg.constructor.name === 'UpdateItemCommand')).toHaveLength(0);
    });
  });

  describe('validation errors', () => {
    test('should reject invalid team ID format', async () => {
      const event = createValidEvent({
        pathParameters: {
          teamId: 'invalid-id',
          userId: '789e0123-e89b-12d3-a456-426614174002'
        }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    test('should reject invalid user ID format', async () => {
      const event = createValidEvent({
        pathParameters: {
          teamId: '456e7890-e89b-12d3-a456-426614174001',
          userId: 'invalid-id'
        }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    test('should reject invalid role value', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          role: 'invalid-role'
        })
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    test('should reject owner role assignment', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          role: 'owner'
        })
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    test('should reject missing role field', async () => {
      const event = createValidEvent({
        body: JSON.stringify({})
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    test('should reject malformed JSON body', async () => {
      const event = createValidEvent({
        body: 'invalid-json'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
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

    test('should reject request from administrator', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'administrator');

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

    test('should prevent owner from changing their own role', async () => {
      const event = createValidEvent({
        pathParameters: {
          teamId: '456e7890-e89b-12d3-a456-426614174001',
          userId: '123e4567-e89b-12d3-a456-426614174000'
        }
      });

      mockTeamExists();
      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });
  });

  describe('target member validation', () => {
    test('should reject role update for non-existent member', async () => {
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
    test('should publish team member role updated event', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001', 'member');

      ddbMock.on(UpdateItemCommand).resolves({});

      await handler(event);

      expect(eventBridgeMock.calls()).toHaveLength(1);
      const eventCall = eventBridgeMock.calls()[0];
      const eventEntry = eventCall.args[0].input.Entries[0];

      expect(eventEntry.Source).toBe('nullcheck');
      expect(eventEntry.DetailType).toBe('Team Member Role Updated');

      const detail = JSON.parse(eventEntry.Detail);
      expect(detail.teamId).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(detail.targetUserId).toBe('789e0123-e89b-12d3-a456-426614174002');
      expect(detail.previousRole).toBe('member');
      expect(detail.newRole).toBe('administrator');
      expect(detail.updatedBy).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    test('should not publish event when role is unchanged', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          role: 'member'
        })
      });

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001', 'member');

      await handler(event);

      expect(eventBridgeMock.calls()).toHaveLength(0);
    });
  });

  describe('database operations', () => {
    test('should use conditional update to ensure member exists', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001', 'member');

      ddbMock.on(UpdateItemCommand).resolves({});

      await handler(event);

      const updateCall = ddbMock.calls().find(call => call.firstArg.constructor.name === 'UpdateItemCommand');
      expect(updateCall.args[0].input.ConditionExpression).toBe('attribute_exists(pk)');
    });

    test('should update role and timestamp', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockTargetMembership('789e0123-e89b-12d3-a456-426614174002', '456e7890-e89b-12d3-a456-426614174001', 'member');

      ddbMock.on(UpdateItemCommand).resolves({});

      await handler(event);

      const updateCall = ddbMock.calls().find(call => call.firstArg.constructor.name === 'UpdateItemCommand');
      expect(updateCall.args[0].input.UpdateExpression).toBe('SET #role = :role, updatedAt = :updatedAt');
      expect(updateCall.args[0].input.ExpressionAttributeNames['#role']).toBe('role');
    });
  });
});
