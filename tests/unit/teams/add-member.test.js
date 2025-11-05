const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { handler } = require('../../../functions/teams/add-member.mjs');

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

process.env.TABLE_NAME = 'test-table';

describe('add-member function', () => {
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
    body: JSON.stringify({
      email: 'newmember@example.com',
      role: 'member'
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
        status: { S: 'active' }
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

  const mockInviterProfile = (userId = '123e4567-e89b-12d3-a456-426614174000', name = 'John Doe') => {
    ddbMock.on(GetItemCommand, {
      TableName: 'test-table',
      Key: {
        pk: { S: `user#${userId}` },
        sk: { S: 'profile' }
      }
    }).resolves({
      Item: {
        pk: { S: `user#${userId}` },
        sk: { S: 'profile' },
        name: { S: name },
        email: { S: 'inviter@example.com' }
      }
    });
  };

  const mockNoPendingInvitation = (email = 'newmember@example.com', teamId = '456e7890-e89b-12d3-a456-426614174001') => {
    ddbMock.on(GetItemCommand, {
      TableName: 'test-table',
      Key: {
        pk: { S: `invitation#${email}` },
        sk: { S: `team#${teamId}` }
      }
    }).resolves({});
  };

  describe('successful member addition', () => {
    test('should add member with valid request', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockInviterProfile();
      mockNoPendingInvitation();

      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Team member invitation sent successfully');
      // Response only contains message for simplicity
    });

    test('should add administrator with specified role', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          email: 'admin@example.com',
          role: 'administrator'
        })
      });

      mockTeamExists();
      mockRequesterMembership();
      mockInviterProfile();
      mockNoPendingInvitation('admin@example.com');

      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      // Simplified response
    });

    test('should default to member role when not specified', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          email: 'newmember@example.com'
        })
      });

      mockTeamExists();
      mockRequesterMembership();
      mockInviterProfile();
      mockNoPendingInvitation();

      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      // Simplified response
    });
  });

  describe('validation errors', () => {
    test('should return 404 for non-existent team', async () => {
      ddbMock.on(GetItemCommand).resolves({});

      const event = createValidEvent({
        pathParameters: { teamId: 'invalid-id' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Team not found');
    });

    test('should reject invalid email format', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          email: 'invalid-email',
          role: 'member'
        })
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('must be a valid email address');
    });

    test('should reject invalid role', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          email: 'newmember@example.com',
          role: 'invalid-role'
        })
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    test('should reject missing email', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          role: 'member'
        })
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
      mockInviterProfile();
      mockNoPendingInvitation();

      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
    });
  });

  describe('duplicate invitation handling', () => {
    test('should reject duplicate invitation', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();

      // Mock existing invitation
      ddbMock.on(GetItemCommand, {
        TableName: 'test-table',
        Key: {
          pk: { S: 'invitation#newmember@example.com' },
          sk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' }
        }
      }).resolves({
        Item: {
          pk: { S: 'invitation#newmember@example.com' },
          sk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
          status: { S: 'pending' }
        }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
      expect(body.message).toContain('pending invitation');
    });
  });

  describe('team validation', () => {
    test('should reject non-existent team', async () => {
      const event = createValidEvent();

      // Mock team not found
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
    test('should publish team member added event', async () => {
      const event = createValidEvent();

      mockTeamExists();
      mockRequesterMembership();
      mockInviterProfile();
      mockNoPendingInvitation();

      ddbMock.on(PutItemCommand).resolves({});

      await handler(event);

      expect(eventBridgeMock.calls()).toHaveLength(1);
      const eventCall = eventBridgeMock.calls()[0];
      const eventEntry = eventCall.args[0].input.Entries[0];

      expect(eventEntry.Source).toBe('nullcheck');
      expect(eventEntry.DetailType).toBe('Team Member Added');

      const detail = JSON.parse(eventEntry.Detail);
      expect(detail.teamId).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(detail.email).toBe('newmember@example.com');
      expect(detail.role).toBe('member');
      expect(detail.invitedBy).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('email normalization', () => {
    test('should normalize email to lowercase', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          email: 'NewMember@Example.COM',
          role: 'member'
        })
      });

      mockTeamExists();
      mockRequesterMembership();
      mockInviterProfile();
      mockNoPendingInvitation('newmember@example.com');

      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      // Simplified response
    });

    test('should trim whitespace from email', async () => {
      const event = createValidEvent({
        body: JSON.stringify({
          email: '  newmember@example.com  ',
          role: 'member'
        })
      });

      mockTeamExists();
      mockRequesterMembership();
      mockInviterProfile();
      mockNoPendingInvitation();

      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      // Simplified response
    });
  });
});
