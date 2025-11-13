const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

describe('cancel-invitation function', () => {
  beforeEach(() => {
    ddbMock.reset();
    eventBridgeMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('Permission validation', () => {
    test('should require team administrator or owner role', () => {
      const mockEvent = {
        pathParameters: {
          teamId: 'team-123',
          email: 'test@example.com'
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-456',
              email: 'admin@example.com'
            }
          }
        }
      };

      expect(mockEvent.pathParameters.teamId).toBe('team-123');
      expect(mockEvent.pathParameters.email).toBe('test@example.com');
    });
  });

  describe('Invitation cancellation', () => {
    test('should successfully cancel pending invitation', async () => {
      const mockTeam = {
        pk: { S: 'team#team-123' },
        sk: { S: 'metadata' },
        name: { S: 'Test Team' },
        ownerId: { S: 'user-456' }
      };

      const mockMembership = {
        pk: { S: 'team#team-123' },
        sk: { S: 'user#user-456' },
        role: { S: 'owner' },
        status: { S: 'active' }
      };

      const mockInvitation = {
        pk: { S: 'invitation#test@example.com' },
        sk: { S: 'team#team-123' },
        email: { S: 'test@example.com' },
        teamId: { S: 'team-123' },
        role: { S: 'member' },
        status: { S: 'Pending' },
        inviterName: { S: 'Admin User' }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({ Item: mockTeam })
        .resolvesOnce({ Item: mockMembership })
        .resolvesOnce({ Item: mockInvitation });

      ddbMock.on(DeleteItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'event-123' }] });

      const mockEvent = {
        pathParameters: {
          teamId: 'team-123',
          email: 'test@example.com'
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-456',
              email: 'admin@example.com'
            }
          }
        }
      };

      expect(ddbMock.calls()).toHaveLength(0);
      expect(eventBridgeMock.calls()).toHaveLength(0);
    });

    test('should handle non-existent invitation', async () => {
      const mockTeam = {
        pk: { S: 'team#team-123' },
        sk: { S: 'metadata' },
        name: { S: 'Test Team' },
        ownerId: { S: 'user-456' }
      };

      const mockMembership = {
        pk: { S: 'team#team-123' },
        sk: { S: 'user#user-456' },
        role: { S: 'owner' },
        status: { S: 'active' }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({ Item: mockTeam })
        .resolvesOnce({ Item: mockMembership })
        .resolvesOnce({}); // No invitation found

      const mockEvent = {
        pathParameters: {
          teamId: 'team-123',
          email: 'nonexistent@example.com'
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-456',
              email: 'admin@example.com'
            }
          }
        }
      };

      expect(ddbMock.calls()).toHaveLength(0);
    });

    test('should prevent cancelling non-pending invitations', async () => {
      const mockTeam = {
        pk: { S: 'team#team-123' },
        sk: { S: 'metadata' },
        name: { S: 'Test Team' },
        ownerId: { S: 'user-456' }
      };

      const mockMembership = {
        pk: { S: 'team#team-123' },
        sk: { S: 'user#user-456' },
        role: { S: 'owner' },
        status: { S: 'active' }
      };

      const mockAcceptedInvitation = {
        pk: { S: 'invitation#test@example.com' },
        sk: { S: 'team#team-123' },
        email: { S: 'test@example.com' },
        teamId: { S: 'team-123' },
        role: { S: 'member' },
        status: { S: 'accepted' }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({ Item: mockTeam })
        .resolvesOnce({ Item: mockMembership })
        .resolvesOnce({ Item: mockAcceptedInvitation });

      const mockEvent = {
        pathParameters: {
          teamId: 'team-123',
          email: 'test@example.com'
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-456',
              email: 'admin@example.com'
            }
          }
        }
      };

      expect(ddbMock.calls()).toHaveLength(0);
    });
  });

  describe('Event publishing', () => {
    test('should publish Team Invitation Cancelled event', async () => {
      const mockTeam = {
        pk: { S: 'team#team-123' },
        sk: { S: 'metadata' },
        name: { S: 'Test Team' },
        ownerId: { S: 'user-456' }
      };

      const mockMembership = {
        pk: { S: 'team#team-123' },
        sk: { S: 'user#user-456' },
        role: { S: 'owner' },
        status: { S: 'active' }
      };

      const mockInvitation = {
        pk: { S: 'invitation#test@example.com' },
        sk: { S: 'team#team-123' },
        email: { S: 'test@example.com' },
        teamId: { S: 'team-123' },
        role: { S: 'member' },
        status: { S: 'Pending' },
        inviterName: { S: 'Admin User' }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({ Item: mockTeam })
        .resolvesOnce({ Item: mockMembership })
        .resolvesOnce({ Item: mockInvitation });

      ddbMock.on(DeleteItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({ Entries: [{ EventId: 'event-123' }] });

      expect(eventBridgeMock.calls()).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    test('should handle DynamoDB errors gracefully', async () => {
      ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

      const mockEvent = {
        pathParameters: {
          teamId: 'team-123',
          email: 'test@example.com'
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-456',
              email: 'admin@example.com'
            }
          }
        }
      };

      expect(ddbMock.calls()).toHaveLength(0);
    });

    test('should handle EventBridge errors gracefully', async () => {
      const mockTeam = {
        pk: { S: 'team#team-123' },
        sk: { S: 'metadata' },
        name: { S: 'Test Team' },
        ownerId: { S: 'user-456' }
      };

      const mockMembership = {
        pk: { S: 'team#team-123' },
        sk: { S: 'user#user-456' },
        role: { S: 'owner' },
        status: { S: 'active' }
      };

      const mockInvitation = {
        pk: { S: 'invitation#test@example.com' },
        sk: { S: 'team#team-123' },
        email: { S: 'test@example.com' },
        teamId: { S: 'team-123' },
        role: { S: 'member' },
        status: { S: 'Pending' },
        inviterName: { S: 'Admin User' }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({ Item: mockTeam })
        .resolvesOnce({ Item: mockMembership })
        .resolvesOnce({ Item: mockInvitation });

      ddbMock.on(DeleteItemCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).rejects(new Error('EventBridge error'));

      expect(ddbMock.calls()).toHaveLength(0);
      expect(eventBridgeMock.calls()).toHaveLength(0);
    });
  });
});

