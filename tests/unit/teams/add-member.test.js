const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock the utilities
jest.mock('../../../functions/utils/api.mjs', () => ({
  formatResponse: (statusCode, body) => ({ statusCode, body })
}));

jest.mock('../../../functions/utils/validation.mjs', () => ({
  validateRequest: jest.fn(),
  validatePathParameters: jest.fn()
}));

jest.mock('../../../functions/utils/validation.mjs', () => ({
  validateRequest: jest.fn(),
  validatePathParameters: jest.fn(),
  requireTeamMember: jest.fn(),
  requireTeamExists: jest.fn(),
  checkExists: jest.fn()
}));

jest.mock('../../../functions/utils/notifications.mjs', () => ({
  createTeamInvitationNotification: jest.fn()
}));



const { handler } = require('../../../functions/teams/add-member.mjs');
const { validateRequest, validatePathParameters, requireTeamMember, requireTeamExists, checkExists } = require('../../../functions/utils/validation.mjs');
const { createTeamInvitationNotification } = require('../../../functions/utils/notifications.mjs');

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Enhanced Team Add Member Handler', () => {
  let mockLogger;

  beforeEach(() => {
    ddbMock.reset();
    eventBridgeMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';

    // Create fresh logger mock for each test
    mockLogger = new Logger({ serviceName: 'teams' });
  });

  describe('Request validation and authorization', () => {
    test('should validate path parameters', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: false,
        error: { statusCode: 400, body: { message: 'Invalid team ID' } }
      });

      const event = {
        pathParameters: { teamId: 'invalid' }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body.message).toBe('Invalid team ID');
    });

    test('should validate request body', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValueOnce({
        success: false,
        error: { statusCode: 400, body: { message: 'Invalid email format' } }
      });

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'invalid-email' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body.message).toBe('Invalid email format');
    });

    test('should require team existence', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValueOnce({
        success: true,
        userId: 'user-456',
        data: { email: 'newuser@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValueOnce({
        error: { statusCode: 404, body: { message: 'Team not found' } }
      });

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'newuser@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body.message).toBe('Team not found');
    });

    test('should require administrator role', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValueOnce({
        success: true,
        userId: 'user-456',
        data: { email: 'newuser@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValueOnce({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValueOnce({
        error: { statusCode: 403, body: { message: 'Insufficient permissions' } }
      });

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'newuser@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(result.body.message).toBe('Insufficient permissions');
    });
  });

  describe('Existing user detection', () => {
    beforeEach(() => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { email: 'existinguser@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});

      checkExists.mockResolvedValue({ name: 'Inviter Name' });
    });

    test('should detect existing user and create notification', async () => {
      // Mock no existing invitation (checkExistingInvitation) then existing user found (findUserByEmail)
      ddbMock.on(QueryCommand)
        .resolvesOnce({ Items: [] }) // No existing invitation (checkExistingInvitation)
        .resolvesOnce({
          Items: [marshall({ pk: 'user#existing-user-789', email: 'existinguser@example.com' })]
        }); // Existing user found (findUserByEmail)

      ddbMock.on(PutItemCommand).resolves({});
      ddbMock.on(UpdateItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      createTeamInvitationNotification.mockResolvedValueOnce({
        id: 'notif-123'
      });

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'existinguser@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      expect(result.body.invitationType).toBe('existing_user');
      expect(result.body.message).toBe('Team member invitation sent successfully');

      // Verify invitation creation
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);
      expect(invitationItem.type).toBe('existing_user');
      expect(invitationItem.invitedUserId).toBe('existing-user-789');

      // Verify notification creation
      expect(createTeamInvitationNotification).toHaveBeenCalledWith(
        'existing-user-789',
        'team-123',
        'Test Team',
        'Inviter Name',
        expect.any(String)
      );

      // Verify notification ID update
      const updateCall = ddbMock.calls().find(call => call.args[0] instanceof UpdateItemCommand);
      expect(updateCall).toBeDefined();
      expect(updateCall.args[0].input.UpdateExpression).toBe('SET notificationId = :notificationId');
    });

    test('should handle new user (not found in system)', async () => {
      // Mock no existing user found
      ddbMock.on(QueryCommand)
        .resolvesOnce({ Items: [] }) // User not found
        .resolvesOnce({ Items: [] }); // No existing invitation

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'newuser@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      expect(result.body.invitationType).toBe('new_user');

      // Verify invitation creation
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);
      expect(invitationItem.type).toBe('new_user');
      expect(invitationItem.invitedUserId).toBeUndefined();

      // Verify no notification creation for new users
      expect(createTeamInvitationNotification).not.toHaveBeenCalled();
    });

    test('should handle notification creation failure gracefully', async () => {
      // Mock no existing invitation then existing user found
      ddbMock.on(QueryCommand)
        .resolvesOnce({ Items: [] }) // No existing invitation (checkExistingInvitation)
        .resolvesOnce({
          Items: [marshall({ pk: 'user#existing-user-789', email: 'existinguser@example.com' })]
        }); // Existing user found (findUserByEmail)

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      createTeamInvitationNotification.mockRejectedValueOnce(new Error('Notification service error'));

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'existinguser@example.com' })
      };

      const result = await handler(event);

      // Should still succeed even if notification creation fails
      expect(result.statusCode).toBe(201);
      expect(result.body.invitationType).toBe('existing_user');
    });
  });

  describe('Duplicate invitation prevention', () => {
    beforeEach(() => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { email: 'user@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'Inviter Name' });
    });

    test('should prevent duplicate invitations', async () => {
      // Mock existing pending invitation (checkExistingInvitation should return an invitation)
      ddbMock.on(QueryCommand)
        .resolvesOnce({
          Items: [marshall({
            pk: 'invitation#existing-inv-123',
            email: 'user@example.com',
            status: 'pending'
          })]
        }); // Existing invitation found (checkExistingInvitation)

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(409);
      expect(result.body.message).toBe('User already has a pending invitation to this team');
    });

    test('should allow invitation if no pending invitation exists', async () => {
      ddbMock.on(QueryCommand)
        .resolvesOnce({ Items: [] }) // User lookup
        .resolvesOnce({ Items: [] }); // No existing invitation

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
    });
  });

  describe('Invitation data structure', () => {
    beforeEach(() => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { email: 'user@example.com', role: 'administrator' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'John Doe' });

      ddbMock.on(QueryCommand)
        .resolves({ Items: [] }); // No existing user or invitation

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});
    });

    test('should create invitation with correct structure', async () => {
      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com', role: 'administrator' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);

      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);

      expect(invitationItem).toMatchObject({
        email: 'user@example.com',
        teamId: 'team-123',
        teamName: 'Test Team',
        role: 'administrator',
        invitedBy: 'user-456',
        inviterName: 'John Doe',
        status: 'Pending',
        type: 'new_user'
      });

      expect(invitationItem.id).toBeDefined();
      expect(invitationItem.expiresAt).toBeDefined();
      expect(invitationItem.ttl).toBeDefined();
      expect(invitationItem.createdAt).toBeDefined();

      // Verify TTL is set to 7 days
      const now = Math.floor(Date.now() / 1000);
      const expectedTTL = now + (7 * 24 * 60 * 60);
      expect(invitationItem.ttl).toBeGreaterThanOrEqual(expectedTTL - 10);
      expect(invitationItem.ttl).toBeLessThanOrEqual(expectedTTL + 10);
    });

    test('should default role to member if not specified', async () => {
      validateRequest.mockResolvedValueOnce({
        success: true,
        userId: 'user-456',
        data: { email: 'user@example.com' } // No role specified
      });

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);

      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);

      expect(invitationItem.role).toBe('member');
    });

    test('should normalize email to lowercase', async () => {
      validateRequest.mockResolvedValueOnce({
        success: true,
        userId: 'user-456',
        data: { email: 'User@Example.COM', role: 'member' }
      });

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'User@Example.COM' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);

      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);

      expect(invitationItem.email).toBe('user@example.com');
    });
  });

  describe('Event publishing', () => {
    beforeEach(() => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { email: 'user@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'John Doe' });

      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutItemCommand).resolves({});
    });

    test('should publish team member added event', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);

      const eventCall = eventBridgeMock.calls().find(call => call.args[0] instanceof PutEventsCommand);
      expect(eventCall).toBeDefined();

      const eventEntry = eventCall.args[0].input.Entries[0];
      expect(eventEntry.Source).toBe('nullcheck');
      expect(eventEntry.DetailType).toBe('Team Member Added');

      const eventDetail = JSON.parse(eventEntry.Detail);
      expect(eventDetail).toMatchObject({
        teamId: 'team-123',
        teamName: 'Test Team',
        email: 'user@example.com',
        role: 'member',
        invitedBy: 'user-456',
        inviterName: 'John Doe',
        invitationType: 'new_user'
      });

      expect(eventDetail.invitationId).toBeDefined();
      expect(eventDetail.invitedAt).toBeDefined();
    });

    test('should include notification ID in event for existing users', async () => {
      // Mock no existing invitation then existing user found
      ddbMock.on(QueryCommand)
        .resolvesOnce({ Items: [] }) // No existing invitation (checkExistingInvitation)
        .resolvesOnce({
          Items: [marshall({ pk: 'user#existing-789', email: 'user@example.com' })]
        }); // Existing user found (findUserByEmail)

      ddbMock.on(UpdateItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      createTeamInvitationNotification.mockResolvedValueOnce({
        id: 'notif-456'
      });

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);

      const eventCall = eventBridgeMock.calls().find(call => call.args[0] instanceof PutEventsCommand);
      const eventDetail = JSON.parse(eventCall.args[0].input.Entries[0].Detail);

      expect(eventDetail.invitationType).toBe('existing_user');
      expect(eventDetail.notificationId).toBe('notif-456');
    });
  });

  describe('Error handling', () => {
    test('should handle DynamoDB errors during invitation creation', async () => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { email: 'user@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'John Doe' });

      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutItemCommand).rejects(new Error('DynamoDB error'));

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Something went wrong');
    });

    test('should handle EventBridge errors gracefully', async () => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { email: 'user@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'John Doe' });

      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).rejects(new Error('EventBridge error'));

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Something went wrong');
    });

    test('should handle user lookup errors gracefully', async () => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { email: 'user@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'John Doe' });

      // First query (user lookup) fails, second query (invitation check) succeeds
      ddbMock.on(QueryCommand)
        .rejectsOnce(new Error('Query error'))
        .resolvesOnce({ Items: [] });

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const result = await handler(event);

      // Should treat as new user when lookup fails
      expect(result.statusCode).toBe(201);
      expect(result.body.invitationType).toBe('new_user');
    });
  });

  describe('Integration between invitations and notifications', () => {
    test('should create complete invitation flow for existing user', async () => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { email: 'existing@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'John Doe' });

      // Mock no existing invitation then existing user found
      ddbMock.on(QueryCommand)
        .resolvesOnce({ Items: [] }) // No existing invitation (checkExistingInvitation)
        .resolvesOnce({
          Items: [marshall({ pk: 'user#existing-789', email: 'existing@example.com' })]
        }); // Existing user found (findUserByEmail)

      ddbMock.on(PutItemCommand).resolves({});
      ddbMock.on(UpdateItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      createTeamInvitationNotification.mockResolvedValueOnce({
        id: 'notif-123',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Test Team'
      });

      const event = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'existing@example.com' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      expect(result.body.invitationType).toBe('existing_user');

      // Verify invitation creation with user ID
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);
      expect(invitationItem.invitedUserId).toBe('existing-789');

      // Verify notification creation
      expect(createTeamInvitationNotification).toHaveBeenCalledWith(
        'existing-789',
        'team-123',
        'Test Team',
        'John Doe',
        invitationItem.id
      );

      // Verify notification ID update
      const updateCall = ddbMock.calls().find(call => call.args[0] instanceof UpdateItemCommand);
      expect(updateCall.args[0].input.UpdateExpression).toBe('SET notificationId = :notificationId');

      // Verify event includes notification ID
      const eventCall = eventBridgeMock.calls().find(call => call.args[0] instanceof PutEventsCommand);
      const eventDetail = JSON.parse(eventCall.args[0].input.Entries[0].Detail);
      expect(eventDetail.notificationId).toBe('notif-123');
    });
  });
});
