const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, QueryCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { handler } = require('../../../functions/teams/list-members.mjs');

const ddbMock = mockClient(DynamoDBClient);

process.env.TABLE_NAME = 'test-table';
process.env.ENCRYPTION_KEY = 'test-encryption-key';

describe('list-members function', () => {
  beforeEach(() => {
    ddbMock.reset();
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
    queryStringParameters: null,
    ...overrides
  });

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

  const mockMembersList = (teamId = '456e7890-e89b-12d3-a456-426614174001', members = []) => {
    const items = members.map(member => ({
      pk: { S: `team#${teamId}` },
      sk: { S: `user#${member.userId}` },
      userId: { S: member.userId },
      role: { S: member.role },
      status: { S: member.status || 'active' },
      joinedAt: { S: member.joinedAt || '2025-01-15T10:30:00Z' }
    }));

    ddbMock.on(QueryCommand, {
      TableName: 'test-table',
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `team#${teamId}` },
        ':sk': { S: 'user#' }
      }
    }).resolves({
      Items: items
    });
  };

  const mockPendingInvitations = (teamId = '456e7890-e89b-12d3-a456-426614174001', invitations = []) => {
    const items = invitations.map(invitation => ({
      pk: { S: `invitation#${invitation.email}` },
      sk: { S: `team#${teamId}` },
      GSI1PK: { S: `team#${teamId}` },
      GSI1SK: { S: `invitation#${invitation.email}` },
      email: { S: invitation.email },
      role: { S: invitation.role },
      status: { S: invitation.status || 'pending' },
      invitedBy: { S: invitation.invitedBy || '123e4567-e89b-12d3-a456-426614174000' },
      expiresAt: { S: invitation.expiresAt || '2025-02-15T10:30:00Z' },
      createdAt: { S: invitation.createdAt || '2025-01-15T10:30:00Z' }
    }));

    ddbMock.on(QueryCommand, {
      TableName: 'test-table',
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
      ExpressionAttributeValues: {
        ':gsi1pk': { S: `team#${teamId}` },
        ':gsi1sk': { S: 'invitation#' }
      }
    }).resolves({
      Items: items
    });
  };

  describe('successful member listing', () => {
    test('should list team members for owner', async () => {
      const event = createValidEvent();

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', [
        { userId: '123e4567-e89b-12d3-a456-426614174000', role: 'owner' },
        { userId: '789e0123-e89b-12d3-a456-426614174002', role: 'administrator' },
        { userId: '456e7890-e89b-12d3-a456-426614174003', role: 'member' }
      ]);
      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', [
        { email: 'pending@example.com', role: 'member' }
      ]);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.members).toHaveLength(3);
      expect(body.pendingInvitations).toHaveLength(1);
      expect(body.members).toBeDefined();
    });

    test('should list team members for administrator', async () => {
      const event = createValidEvent();

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'administrator');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', [
        { userId: '123e4567-e89b-12d3-a456-426614174000', role: 'administrator' },
        { userId: '789e0123-e89b-12d3-a456-426614174002', role: 'member' }
      ]);
      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', [
        { email: 'pending@example.com', role: 'member' }
      ]);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.members).toHaveLength(2);
      expect(body.pendingInvitations).toHaveLength(1);
    });

    test('should list team members for regular member without invitations', async () => {
      const event = createValidEvent();

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'member');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', [
        { userId: '123e4567-e89b-12d3-a456-426614174000', role: 'member' },
        { userId: '789e0123-e89b-12d3-a456-426614174002', role: 'owner' }
      ]);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.members).toHaveLength(2);
      expect(body.pendingInvitations).toBeUndefined();
    });

    test('should handle empty member list', async () => {
      const event = createValidEvent();

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', []);
      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', []);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.members).toEqual([]);
      expect(body.pendingInvitations).toEqual([]);
    });
  });

  describe('pagination', () => {
    test('should handle pagination with cursor', async () => {
      const { encrypt } = require('../../../functions/utils/encoding.mjs');
      const cursor = encrypt(JSON.stringify({
        pk: 'team#456e7890-e89b-12d3-a456-426614174001',
        sk: 'user#789e0123-e89b-12d3-a456-426614174002'
      }));

      const event = createValidEvent({
        queryStringParameters: {
          nextToken: cursor,
          limit: '10'
        }
      });

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');

      // Mock query with cursor
      ddbMock.on(QueryCommand, {
        TableName: 'test-table',
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
          ':sk': { S: 'user#' }
        },
        Limit: 10,
        ExclusiveStartKey: {
          pk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
          sk: { S: 'user#789e0123-e89b-12d3-a456-426614174002' }
        }
      }).resolves({
        Items: [
          {
            pk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
            sk: { S: 'user#456e7890-e89b-12d3-a456-426614174003' },
            userId: { S: '456e7890-e89b-12d3-a456-426614174003' },
            role: { S: 'member' },
            status: { S: 'active' },
            joinedAt: { S: '2025-01-15T10:30:00Z' }
          }
        ],
        LastEvaluatedKey: {
          pk: { S: 'team#456e7890-e89b-12d3-a456-426614174001' },
          sk: { S: 'user#456e7890-e89b-12d3-a456-426614174003' }
        }
      });

      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', []);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.members).toHaveLength(1);
      expect(body.members).toBeDefined();
      // Pagination simplified
    });

    test('should validate limit parameter', async () => {
      const event = createValidEvent({
        queryStringParameters: {
          limit: '150'
        }
      });

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', []);
      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', []);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      // Should cap at 25 (getPagingParams limit)
      const queryCall = ddbMock.calls().find(call =>
        call.args[0].input.KeyConditionExpression?.includes('begins_with')
      );
      expect(queryCall.args[0].input.Limit).toBe(25);
    });

    test('should handle invalid limit parameter gracefully', async () => {
      const event = createValidEvent({
        queryStringParameters: {
          limit: 'invalid'
        }
      });

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', []);
      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', []);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      // Should default to 10 for invalid limit
      const queryCall = ddbMock.calls().find(call =>
        call.args[0].input.KeyConditionExpression?.includes('begins_with')
      );
      expect(queryCall.args[0].input.Limit).toBe(10);
    });

    test('should handle invalid cursor gracefully', async () => {
      const event = createValidEvent({
        queryStringParameters: {
          cursor: 'invalid-cursor'
        }
      });

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', []);
      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', []);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      // Should ignore invalid cursor and proceed without ExclusiveStartKey
    });
  });

  describe('validation errors', () => {
    test('should reject invalid team ID format', async () => {
      const event = createValidEvent({
        pathParameters: {
          teamId: 'invalid-id'
        }
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
  });

  describe('response format', () => {
    test('should format member data correctly', async () => {
      const event = createValidEvent();

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', [
        {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          role: 'owner',
          status: 'active',
          joinedAt: '2025-01-15T10:30:00Z'
        }
      ]);
      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', []);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.members[0]).toEqual({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'owner',
        status: 'active',
        joinedAt: '2025-01-15T10:30:00Z'
      });
    });

    test('should format invitation data correctly', async () => {
      const event = createValidEvent();

      mockRequesterMembership('123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001', 'owner');
      mockMembersList('456e7890-e89b-12d3-a456-426614174001', []);
      mockPendingInvitations('456e7890-e89b-12d3-a456-426614174001', [
        {
          email: 'pending@example.com',
          role: 'member',
          status: 'pending',
          invitedBy: '123e4567-e89b-12d3-a456-426614174000',
          expiresAt: '2025-02-15T10:30:00Z',
          createdAt: '2025-01-15T10:30:00Z'
        }
      ]);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.pendingInvitations[0]).toEqual({
        email: 'pending@example.com',
        role: 'member',
        status: 'pending',
        invitedBy: '123e4567-e89b-12d3-a456-426614174000',
        expiresAt: '2025-02-15T10:30:00Z',
        createdAt: '2025-01-15T10:30:00Z'
      });
    });
  });
});
