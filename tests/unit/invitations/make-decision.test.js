const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, UpdateItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const ddbMock = mockClient(DynamoDBClient);

// Mock the utilities
jest.mock('../../../functions/utils/api.mjs', () => ({
  formatResponse: (statusCode, body) => ({ statusCode, body })
}));

jest.mock('../../../functions/utils/validation.mjs', () => ({
  validateRequest: jest.fn(),
  validatePathParameters: jest.fn()
}));

jest.mock('../../../functions/utils/notifications.mjs', () => ({
  removeNotificationsByInvitation: jest.fn()
}));



const { handler } = require('../../../functions/invitations/make-decision.mjs');
const { validateRequest, validatePathParameters } = require('../../../functions/utils/validation.mjs');
const { removeNotificationsByInvitation } = require('../../../functions/utils/notifications.mjs');

describe('Make Invitation Decision Handler', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';

    // Default successful validation mocks
    validatePathParameters.mockResolvedValue({
      success: true,
      data: { invitationId: 'inv-123' }
    });

    validateRequest.mockResolvedValue({
      success: true,
      tenantId: 'tenant-123',
      userId: 'user-456',
      data: { action: 'accept' }
    });
  });

  describe('Request validation', () => {
    test('should validate path parameters', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: false,
        error: { statusCode: 400, body: { message: 'Invalid invitation ID' } }
      });

      const event = {
        pathParameters: { invitationId: 'invalid' }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body.message).toBe('Invalid invitation ID');
      expect(validatePathParameters).toHaveBeenCalled();
    });

    test('should validate request body', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValueOnce({
        success: false,
        error: { statusCode: 400, body: { message: 'Invalid action' } }
      });

      const event = {
        pmeters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'invalid' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body.message).toBe('Invalid action');
      expect(validateRequest).toHaveBeenCalled();
    });

    test('should proceed with valid validation', async () => {
      validatePathParameters.mockResolvedValueOnce({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValueOnce({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: null // Invitation not found
      });

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body.message).toBe("Invitation with ID 'inv-123' was not found");
    });
  });

  describe('Invitation retrieval and validation', () => {
    beforeEach(() => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });
    });

    test('should handle non-existent invitation', async () => {
      ddbMock.on(GetItemCommand).resolves({ Item: null });

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body.message).toBe("Invitation with ID 'inv-123' was not found");
    });

    test('should validate invitation ownership for existing users', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'different-user',
        status: 'Pending',
        expiresAt: new Date(Date.now() + 86400000).toISOString() // 1 day from now
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(result.body.message).toBe('Not authorized to act on this invitation');
    });

    test('should allow action for correct user', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        teamName: 'Test Team',
        role: 'member',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});
      removeNotificationsByInvitation.mockResolvedValueOnce();

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.message).toBe('Invitation accepted successfully');
    });

    test('should handle already processed invitation', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(409);
      expect(result.body.message).toBe('Invitation has already been accepted');
    });

    test('should handle expired invitation', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        notificationId: 'notif-123'
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      removeNotificationsByInvitation.mockResolvedValueOnce();

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(410);
      expect(result.body.message).toBe('Invitation has expired');
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('user-456', 'inv-123');
    });
  });

  describe('Accept invitation flow', () => {
    beforeEach(() => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });
    });

    test('should accept invitation successfully', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        teamName: 'Test Team',
        role: 'member',
        notificationId: 'notif-123',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});
      removeNotificationsByInvitation.mockResolvedValueOnce();

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toMatchObject({
        message: 'Invitation accepted successfully',
        teamId: 'team-789',
        teamName: 'Test Team',
        role: 'member'
      });

      // Verify invitation status update
      const updateCall = ddbMock.calls().find(call => call.args[0] instanceof UpdateItemCommand);
      expect(updateCall).toBeDefined();
      expect(updateCall.args[0].input.UpdateExpression).toBe('SET #status = :status, acceptedAt = :acceptedAt');

      // Verify team membership creation
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      expect(putCall).toBeDefined();
      const membershipItem = unmarshall(putCall.args[0].input.Item);
      expect(membershipItem.teamId).toBe('team-789');
      expect(membershipItem.userId).toBe('user-456');
      expect(membershipItem.role).toBe('member');
      expect(membershipItem.status).toBe('Active');

      // Verify notification cleanup
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('user-456', 'inv-123');
    });

    test('should handle duplicate team membership', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        teamName: 'Test Team',
        role: 'member',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).resolves({});

      const conditionalError = new Error('Conditional check failed');
      conditionalError.name = 'ConditionalCheckFailedException';
      ddbMock.on(PutItemCommand).rejects(conditionalError);

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(409);
      expect(result.body.message).toBe('User is already a member of this team');
    });

    test('should handle notification cleanup failure gracefully', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        teamName: 'Test Team',
        role: 'member',
        notificationId: 'notif-123',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});
      removeNotificationsByInvitation.mockRejectedValueOnce(new Error('Cleanup failed'));

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      // Should still succeed even if notification cleanup fails
      expect(result.statusCode).toBe(200);
      expect(result.body.message).toBe('Invitation accepted successfully');
    });
  });

  describe('Reject invitation flow', () => {
    beforeEach(() => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'reject' }
      });
    });

    test('should reject invitation successfully', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        notificationId: 'notif-123',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      removeNotificationsByInvitation.mockResolvedValueOnce();

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'reject' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.message).toBe('Invitation rejected successfully');

      // Verify invitation status update
      const updateCall = ddbMock.calls().find(call => call.args[0] instanceof UpdateItemCommand);
      expect(updateCall).toBeDefined();
      expect(updateCall.args[0].input.UpdateExpression).toBe('SET #status = :status, rejectedAt = :rejectedAt');

      // Verify no team membership creation
      const putCall = ddbMock.calls().find(call => call.args[0] instanceof PutItemCommand);
      expect(putCall).toBeUndefined();

      // Verify notification cleanup
      expect(removeNotificationsByInvitation).toHaveBeenCalledWith('user-456', 'inv-123');
    });

    test('should handle rejection without notification cleanup', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
        // No notificationId
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).resolves({});

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'reject' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.message).toBe('Invitation rejected successfully');
      expect(removeNotificationsByInvitation).not.toHaveBeenCalled();
    });
  });

  describe('New user invitation handling', () => {
    beforeEach(() => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });
    });

    test('should allow any authenticated user to act on new_user invitations', async () => {
      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'new_user',
        email: 'newuser@example.com',
        status: 'Pending',
        teamId: 'team-789',
        teamName: 'Test Team',
        role: 'member',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.message).toBe('Invitation accepted successfully');
    });
  });

  describe('Error handling', () => {
    test('should handle DynamoDB errors during invitation retrieval', async () => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });

      ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Something went wrong');
    });

    test('should handle DynamoDB errors during status update', async () => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });

      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        teamName: 'Test Team',
        role: 'member',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).rejects(new Error('Update failed'));

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Something went wrong');
    });

    test('should handle unexpected errors', async () => {
      validatePathParameters.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.body.message).toBe('Something went wrong');
    });
  });

  describe('Performance and concurrency', () => {
    test('should handle concurrent invitation decisions', async () => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'accept' }
      });

      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        teamName: 'Test Team',
        role: 'member',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      // First request succeeds
      ddbMock.on(UpdateItemCommand).resolvesOnce({});
      ddbMock.on(PutItemCommand).resolvesOnce({});

      // Second request fails due to conditional check (invitation already processed)
      const conditionalError = new Error('Conditional check failed');
      conditionalError.name = 'ConditionalCheckFailedException';
      ddbMock.on(UpdateItemCommand).rejectsOnce(conditionalError);

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'accept' })
      };

      const [result1, result2] = await Promise.allSettled([
        handler(event),
        handler(event)
      ]);

      // One should succeed, one should fail due to race condition
      expect([result1.value?.statusCode, result2.value?.statusCode]).toContain(200);
    });

    test('should complete operations quickly', async () => {
      validatePathParameters.mockResolvedValue({
        success: true,
        data: { invitationId: 'inv-123' }
      });

      validateRequest.mockResolvedValue({
        success: true,
        userId: 'user-456',
        data: { action: 'reject' }
      });

      const invitation = {
        pk: 'invitation#inv-123',
        sk: 'metadata',
        type: 'existing_user',
        invitedUserId: 'user-456',
        status: 'Pending',
        teamId: 'team-789',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(invitation)
      });

      ddbMock.on(UpdateItemCommand).resolves({});

      const event = {
        pathParameters: { invitationId: 'inv-123' },
        body: JSON.stringify({ action: 'reject' })
      };

      const startTime = Date.now();
      const result = await handler(event);
      const endTime = Date.now();

      expect(result.statusCode).toBe(200);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });
  });
});

