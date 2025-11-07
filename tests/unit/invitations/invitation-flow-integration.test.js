const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

// Mock the uti
jest.mock('../../../functions/utils/api.mjs', () => ({
  formatResponse: (statusCode, body) => ({ statusCode, body })
}));

jest.mock('../../../functions/utils/powertools-validation.mjs', () => ({
  validateRequest: jest.fn(),
  validatePathParameters: jest.fn()
}));

jest.mock('../../../functions/utils/validate.mjs', () => ({
  requireTeamMember: jest.fn(),
  requireTeamExists: jest.fn(),
  checkExists: jest.fn()
}));

jest.mock('../../../functions/utils/notifications.mjs', () => ({
  createTeamInvitationNotification: jest.fn(),
  removeNotificationsByInvitation: jest.fn()
}));



const { handler: addMemberHandler } = require('../../../functions/teams/add-member.mjs');
const { handler: makeDecisionHandler } = require('../../../functions/invitations/make-decision.mjs');
const { validateRequest, validatePathParameters } = require('../../../functions/utils/powertools-validation.mjs');
const { requireTeamMember, requireTeamExists, checkExists } = require('../../../functions/utils/validate.mjs');
const { createTeamInvitationNotification, removeNotificationsByInvitation } = require('../../../functions/utils/notifications.mjs');

describe('Invitation System Integration Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
    eventBridgeMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Complete invitation flow for existing users', () => {
    test('should handle complete flow: invite existing user -> accept invitation', async () => {
      // Setup common mocks for invitation creation
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'admin-456',
        data: { email: 'existing@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'Admin User' });

      // Mock user lookup query (findUserByEmail)
      ddbMock.on(QueryCommand, {
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'email = :email'
      }).resolves({
        Items: [marshall({ pk: 'user#existing-789', email: 'existing@example.com' })]
      });

      // Mock existing invitation check (checkExistingInvitation)
      ddbMock.on(QueryCommand, {
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'email = :email AND #status = :status'
      }).resolves({
        Items: [] // No existing invitation
      });

      ddbMock.on(PutItemCommand).resolves({});
      ddbMock.on(UpdateItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      createTeamInvitationNotification.mockResolvedValueOnce({
        id: 'notif-123'
      });

      // Step 1: Create invitation for existing user
      const inviteEvent = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'existing@example.com', role: 'member' })
      };

      const inviteResult = await addMemberHandler(inviteEvent);

      expect(inviteResult.statusCode).toBe(201);
      expect(inviteResult.body.invitationType).toBe('existing_user');

      // Extract invitation ID from the created invitation
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);
      const invitationId = invitationItem.id;

      // Verify invitation structure for existing user
      expect(invitationItem).toMatchObject({
        email: 'existing@example.com',
        teamId: 'team-123',
        teamName: 'Test Team',
        role: 'member',
        invitedBy: 'admin-456',
        inviterName: 'Admin User',
        status: 'pending',
        type: 'existing_user',
        invitedUserId: 'existing-789'
      });

      // Verify notification was created
      expect(createTeamInvitationNotification).toHaveBeenCalledWith(
        'existing-789',
        'team-123',
        'Test Team',
        'Admin User',
        invitationId
      );

      // Reset mocks for decision step
      ddbMock.reset();
      jest.clearAllMocks();

      // Setup mocks for invitation acceptance
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'existing-789',
        data: { action: 'accept' }
      });

      // Mock invitation retrieval
      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'existing_user',
          invitedUserId: 'existing-789',
          status: 'pending',
          teamId: 'team-123',
          teamName: 'Test Team',
          role: 'member',
          notificationId: 'notif-123',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});
      removeNotificationsByInvitation.mockResolvedValueOnce();

      // Step 2: Accept invitation
      const acceptEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'accept' })
      };

      const acceptResult = await makeDecisionHandler(acceptEvent);

      expect(acceptResult.statusCode).toBe(200);
      expect(acceptResult.body.message).toBe('Invitation accepted successfully');
      expect(acceptResult.body.teamId).toBe('team-123');
      expect(acceptResult.body.teamName).toBe('Test Team');
      expect(acceptResult.body.role).toBe('member');

      // Verify invitation status update
      const updateCall = ddbMock.calls().find(call => call.args[0] instanceof UpdateItemCommand);
      expect(updateCall).toBeDefined();
      expect(updateCall.args[0].input.UpdateExpression).toBe('SET #status = :status, acceptedAt = :acceptedAt');

      // Verify team membership creation
      const membershipCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      expect(membershipCall).toBeDefined();
      const membershipItem = unmarshall(membershipCall.args[0].input.Item);
      expect(membershipItem).toMatchObject({
        teamId: 'team-123',
        userId: 'existing-789',
        role: 'member',
        status: 'active'
      });

      // Verify notification cleanup
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('existing-789', invitationId);
    });

    test('should handle complete flow: invite existing user -> reject invitation', async () => {
      // Setup common mocks for invitation creation
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-456' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'admin-123',
        data: { email: 'user@example.com', role: 'administrator' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-456', name: 'Another Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'Team Admin' });

      // Mock user lookup query (findUserByEmail)
      ddbMock.on(QueryCommand, {
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'email = :email'
      }).resolves({
        Items: [marshall({ pk: 'user#target-999', email: 'user@example.com' })]
      });

      // Mock existing invitation check (checkExistingInvitation)
      ddbMock.on(QueryCommand, {
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'email = :email AND #status = :status'
      }).resolves({
        Items: [] // No existing invitation
      });

      ddbMock.on(PutItemCommand).resolves({});
      ddbMock.on(UpdateItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      createTeamInvitationNotification.mockResolvedValueOnce({
        id: 'notif-456'
      });

      // Step 1: Create invitation
      const inviteEvent = {
        pathParameters: { teamId: 'team-456' },
        body: JSON.stringify({ email: 'user@example.com', role: 'administrator' })
      };

      const inviteResult = await addMemberHandler(inviteEvent);

      expect(inviteResult.statusCode).toBe(201);
      expect(inviteResult.body.invitationType).toBe('existing_user');

      // Extract invitation ID
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);
      const invitationId = invitationItem.id;

      // Reset mocks for decision step
      ddbMock.reset();
      jest.clearAllMocks();

      // Setup mocks for invitation rejection
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'target-999',
        data: { action: 'reject' }
      });

      // Mock invitation retrieval
      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'existing_user',
          invitedUserId: 'target-999',
          status: 'pending',
          teamId: 'team-456',
          teamName: 'Another Team',
          role: 'administrator',
          notificationId: 'notif-456',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      removeNotificationsByInvitation.mockResolvedValueOnce();

      // Step 2: Reject invitation
      const rejectEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'reject' })
      };

      const rejectResult = await makeDecisionHandler(rejectEvent);

      expect(rejectResult.statusCode).toBe(200);
      expect(rejectResult.body.message).toBe('Invitation rejected successfully');

      // Verify invitation status update
      const updateCall = ddbMock.calls().find(call => call.args[0] instanceof UpdateItemCommand);
      expect(updateCall).toBeDefined();
      expect(updateCall.args[0].input.UpdateExpression).toBe('SET #status = :status, rejectedAt = :rejectedAt');

      // Verify no team membership creation
      const membershipCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      expect(membershipCall).toBeUndefined();

      // Verify notification cleanup
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('target-999', invitationId);
    });
  });

  describe('New user invitation flow', () => {
    test('should handle new user invitation acceptance', async () => {
      // Setup mocks for new user invitation
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-789' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'admin-111',
        data: { email: 'newuser@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-789', name: 'New Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'Admin Name' });

      // Mock user lookup query (findUserByEmail) - no user found
      ddbMock.on(QueryCommand, {
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'email = :email'
      }).resolves({
        Items: [] // User not found
      });

      // Mock existing invitation check (checkExistingInvitation)
      ddbMock.on(QueryCommand, {
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'email = :email AND #status = :status'
      }).resolves({
        Items: [] // No existing invitation
      });

      ddbMock.on(PutItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      // Step 1: Create invitation for new user
      const inviteEvent = {
        pathParameters: { teamId: 'team-789' },
        body: JSON.stringify({ email: 'newuser@example.com', role: 'member' })
      };

      const inviteResult = await addMemberHandler(inviteEvent);

      expect(inviteResult.statusCode).toBe(201);
      expect(inviteResult.body.invitationType).toBe('new_user');

      // Extract invitation ID
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);
      const invitationId = invitationItem.id;

      // Verify no notification creation for new users
      expect(createTeamInvitationNotification).not.toHaveBeenCalled();

      // Reset mocks for decision step
      ddbMock.reset();
      jest.clearAllMocks();

      // Setup mocks for new user accepting invitation (after account creation)
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'newuser-222', // New user ID after account creation
        data: { action: 'accept' }
      });

      // Mock invitation retrieval
      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'new_user',
          email: 'newuser@example.com',
          status: 'pending',
          teamId: 'team-789',
          teamName: 'New Team',
          role: 'member',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});

      // Step 2: Accept invitation as new user
      const acceptEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'accept' })
      };

      const acceptResult = await makeDecisionHandler(acceptEvent);

      expect(acceptResult.statusCode).toBe(200);
      expect(acceptResult.body.message).toBe('Invitation accepted successfully');

      // Verify team membership creation with new user ID
      const membershipCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      expect(membershipCall).toBeDefined();
      const membershipItem = unmarshall(membershipCall.args[0].input.Item);
      expect(membershipItem).toMatchObject({
        teamId: 'team-789',
        userId: 'newuser-222',
        role: 'member',
        status: 'active'
      });

      // Verify no notification cleanup for new users
      expect(removeNotificationsByInvitation).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases and error scenarios', () => {
    test('should handle expired invitation cleanup', async () => {
      const invitationId = 'expired-inv-123';

      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });

      // Mock expired invitation
      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'existing_user',
          invitedUserId: 'user-456',
          status: 'pending',
          teamId: 'team-123',
          notificationId: 'notif-123',
          expiresAt: new Date(Date.now() - 86400000).toISOString() // Expired
        })
      });

      removeNotificationsByInvitation.mockResolvedValueOnce();

      const acceptEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await makeDecisionHandler(acceptEvent);

      expect(result.statusCode).toBe(410);
      expect(result.body.message).toBe('Invitation has expired');

      // Verify notification cleanup for expired invitation
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('user-456', invitationId);
    });

    test('should handle duplicate team membership gracefully', async () => {
      const invitationId = 'dup-inv-123';

      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'existing_user',
          invitedUserId: 'user-456',
          status: 'pending',
          teamId: 'team-123',
          teamName: 'Test Team',
          role: 'member',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      });

      ddbMock.on(UpdateItemCommand).resolves({});

      // Mock conditional check failure for duplicate membership
      const conditionalError = new Error('Conditional check failed');
      conditionalError.name = 'ConditionalCheckFailedException';
      ddbMock.on(PutItemCommand).rejects(conditionalError);

      const acceptEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await makeDecisionHandler(acceptEvent);

      expect(result.statusCode).toBe(409);
      expect(result.body.message).toBe('User is already a member of this team');
    });

    test('should prevent unauthorized invitation actions', async () => {
      const invitationId = 'unauth-inv-123';

      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'wrong-user-999',
        data: { action: 'accept' }
      });

      // Mock invitation for different user
      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'existing_user',
          invitedUserId: 'correct-user-456',
          status: 'pending',
          teamId: 'team-123',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      });

      const acceptEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await makeDecisionHandler(acceptEvent);

      expect(result.statusCode).toBe(403);
      expect(result.body.message).toBe('Not authorized to act on this invitation');
    });

    test('should handle already processed invitations', async () => {
      const invitationId = 'processed-inv-123';

      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });

      // Mock already accepted invitation
      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'existing_user',
          invitedUserId: 'user-456',
          status: 'accepted',
          teamId: 'team-123',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      });

      const acceptEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await makeDecisionHandler(acceptEvent);

      expect(result.statusCode).toBe(409);
      expect(result.body.message).toBe('Invitation has already been accepted');
    });
  });

  describe('Notification integration', () => {
    test('should handle notification creation and cleanup lifecycle', async () => {
      // Test the complete notification lifecycle from creation to cleanup
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { teamId: 'team-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'admin-456',
        data: { email: 'user@example.com', role: 'member' }
      });

      requireTeamExists.mockResolvedValue({
        team: { id: 'team-123', name: 'Test Team' }
      });

      requireTeamMember.mockResolvedValue({});
      checkExists.mockResolvedValue({ name: 'Admin User' });

      // Mock user lookup query (findUserByEmail)
      ddbMock.on(QueryCommand, {
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'email = :email'
      }).resolves({
        Items: [marshall({ pk: 'user#target-789', email: 'user@example.com' })]
      });

      // Mock existing invitation check (checkExistingInvitation)
      ddbMock.on(QueryCommand, {
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: 'email = :email AND #status = :status'
      }).resolves({
        Items: [] // No existing invitation
      });

      ddbMock.on(PutItemCommand).resolves({});
      ddbMock.on(UpdateItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const mockNotification = {
        id: 'notif-123',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Test Team'
      };

      createTeamInvitationNotification.mockResolvedValueOnce(mockNotification);

      // Create invitation with notification
      const inviteEvent = {
        pathParameters: { teamId: 'team-123' },
        body: JSON.stringify({ email: 'user@example.com' })
      };

      const inviteResult = await addMemberHandler(inviteEvent);
      expect(inviteResult.statusCode).toBe(201);

      // Verify notification creation was called with correct parameters
      expect(createTeamInvitationNotification).toHaveBeenCalledWith(
        'target-789',
        'team-123',
        'Test Team',
        'Admin User',
        expect.any(String)
      );

      // Extract invitation ID for cleanup test
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      const invitationItem = unmarshall(putCall.args[0].input.Item);
      const invitationId = invitationItem.id;

      // Reset mocks for cleanup test
      ddbMock.reset();
      jest.clearAllMocks();

      // Setup mocks for invitation acceptance and notification cleanup
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'target-789',
        data: { action: 'accept' }
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'existing_user',
          invitedUserId: 'target-789',
          status: 'pending',
          teamId: 'team-123',
          teamName: 'Test Team',
          role: 'member',
          notificationId: 'notif-123',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});
      removeNotificationsByInvitation.mockResolvedValueOnce();

      // Accept invitation and verify notification cleanup
      const acceptEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'accept' })
      };

      const acceptResult = await makeDecisionHandler(acceptEvent);
      expect(acceptResult.statusCode).toBe(200);

      // Verify notification cleanup was called
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('target-789', invitationId);
    });

    test('should handle notification cleanup failure gracefully', async () => {
      const invitationId = 'cleanup-fail-inv-123';

      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'reject' }
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata',
          type: 'existing_user',
          invitedUserId: 'user-456',
          status: 'pending',
          teamId: 'team-123',
          notificationId: 'notif-123',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      removeNotificationsByInvitation.mockRejectedValueOnce(new Error('Cleanup failed'));

      const rejectEvent = {
        pathParameters: { invitationId },
        body: JSON.stringify({ action: 'reject' })
      };

      const result = await makeDecisionHandler(rejectEvent);

      // Should still succeed even if notification cleanup fails
      expect(result.statusCode).toBe(200);
      expect(result.body.message).toBe('Invitation rejected successfully');
    });
  });
});
