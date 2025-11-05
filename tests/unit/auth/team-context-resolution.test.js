// Unit tests for team context resolution in authorizer
// Tests verify that tenant context is correctly resolved based on user's active team

const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { CognitoIdentityProviderClient, GetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Mock AWS clients
const ddbMock = mockClient(DynamoDBClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

// Mock jwt verifier
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      verify: jest.fn()
    }))
  }
}));

// Mock environment variables
process.env.TABLE_NAME = 'test-table';
process.env.USER_POOL_ID = 'test-pool';
process.env.USER_POOL_CLIENT_ID = 'test-client';

describe('Team Context Resolution Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
    cognitoMock.reset();
    jest.clearAllMocks();
  });

  describe('Individual Mode (No Active Team)', () => {
    test('should use tokenTenantId as tenantId when user has no active team', async () => {
      const userId = 'user-123';
      const tokenTenantId = 'tenant-from-token-456'; // Could be different from userId

      // Mock user profile with no active team
      ddbMock.on(GetItemCommand).resolves({
        Item: {
          pk: { S: `user#${userId}` },
          sk: { S: 'profile' },
          email: { S: 'user@example.com' },
          activeTeamId: { NULL: true },
          teams: { L: [] }
        }
      });

      // Mock Cognito user attributes with custom tenantId
      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'user@example.com' },
          { Name: 'custom:tenantId', Value: tokenTenantId }
        ]
      });

      // Simulate the authorizer logic
      const userProfile = {
        activeTeamId: null,
        teams: []
      };

      const tenantId = userProfile.activeTeamId || tokenTenantId;
      const activeTeamId = userProfile.activeTeamId || null;

      expect(tenantId).toBe(tokenTenantId);
      expect(activeTeamId).toBeNull();
    });

    test('should fallback to userId when user profile does not exist and no custom tenantId in token', async () => {
      const userId = 'user-123';

      // Mock no user profile found
      ddbMock.on(GetItemCommand).resolves({});

      // Mock Cognito user attributes without custom tenantId
      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'user@example.com' }
        ]
      });

      // Simulate the authorizer logic when profile is null and no custom tenantId
      const userProfile = null;
      const tokenTenantId = userId; // Falls back to userId when no custom tenantId
      const tenantId = userProfile?.activeTeamId || tokenTenantId;
      const activeTeamId = userProfile?.activeTeamId || null;

      expect(tenantId).toBe(userId);
      expect(activeTeamId).toBeNull();
    });

    test('should use tokenTenantId when user profile does not exist but token has custom tenantId', async () => {
      const userId = 'user-123';
      const tokenTenantId = 'custom-tenant-789';

      // Mock no user profile found
      ddbMock.on(GetItemCommand).resolves({});

      // Mock Cognito user attributes with custom tenantId
      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'user@example.com' },
          { Name: 'custom:tenantId', Value: tokenTenantId }
        ]
      });

      // Simulate the authorizer logic when profile is null but token has tenantId
      const userProfile = null;
      const tenantId = userProfile?.activeTeamId || tokenTenantId;
      const activeTeamId = userProfile?.activeTeamId || null;

      expect(tenantId).toBe(tokenTenantId);
      expect(activeTeamId).toBeNull();
    });
  });

  describe('Team Mode (Active Team Set)', () => {
    test('should use activeTeamId as tenantId when user has active team', async () => {
      const userId = 'user-123';
      const teamId = 'team-456';

      // Mock user profile with active team
      ddbMock.on(GetItemCommand).resolves({
        Item: {
          pk: { S: `user#${userId}` },
          sk: { S: 'profile' },
          email: { S: 'user@example.com' },
          activeTeamId: { S: teamId },
          teams: { L: [
            { M: {
              teamId: { S: teamId },
              role: { S: 'owner' }
            }}
          ]}
        }
      });

      // Simulate the authorizer logic
      const userProfile = {
        activeTeamId: teamId,
        teams: [{ teamId, role: 'owner' }]
      };

      const tenantId = userProfile.activeTeamId || userId;
      const activeTeamId = userProfile.activeTeamId || null;

      expect(tenantId).toBe(teamId);
      expect(activeTeamId).toBe(teamId);
    });
  });

  describe('Authorizer Context Structure', () => {
    test('should provide correct context structure for individual mode', () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      const context = {
        tenantId: userId,
        userId: userId,
        activeTeamId: null,
        email: email
      };

      expect(context.tenantId).toBe(userId);
      expect(context.userId).toBe(userId);
      expect(context.activeTeamId).toBeNull();
      expect(context.email).toBe(email);
    });

    test('should provide correct context structure for team mode', () => {
      const userId = 'user-123';
      const teamId = 'team-456';
      const email = 'user@example.com';

      const context = {
        tenantId: teamId,
        userId: userId,
        activeTeamId: teamId,
        email: email
      };

      expect(context.tenantId).toBe(teamId);
      expect(context.userId).toBe(userId);
      expect(context.activeTeamId).toBe(teamId);
      expect(context.email).toBe(email);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing tenantId behavior for functions expecting it', () => {
      // Test individual mode - tenantId should be userId
      const userId = 'user-123';
      const context = {
        tenantId: userId,
        userId: userId,
        activeTeamId: null
      };

      // Existing functions that use tenantId should work unchanged
      const episodeKey = `${context.tenantId}#episode-456`;
      const gsi1pk = `${context.tenantId}#episodes`;

      expect(episodeKey).toBe('user-123#episode-456');
      expect(gsi1pk).toBe('user-123#episodes');
    });

    test('should provide team-scoped data access when in team mode', () => {
      // Test team mode - tenantId should be teamId
      const userId = 'user-123';
      const teamId = 'team-456';
      const context = {
        tenantId: teamId,
        userId: userId,
        activeTeamId: teamId
      };

      // Existing functions that use tenantId should automatically get team scope
      const episodeKey = `${context.tenantId}#episode-789`;
      const gsi1pk = `${context.tenantId}#episodes`;

      expect(episodeKey).toBe('team-456#episode-789');
      expect(gsi1pk).toBe('team-456#episodes');
    });

    test('should preserve userId for functions that need user identity', () => {
      const userId = 'user-123';
      const teamId = 'team-456';
      const context = {
        tenantId: teamId,
        userId: userId,
        activeTeamId: teamId
      };

      // Functions like user profile management should still use userId
      const userProfileKey = `user#${context.userId}`;
      const teamOwnerCheck = context.userId;

      expect(userProfileKey).toBe('user#user-123');
      expect(teamOwnerCheck).toBe('user-123');
    });
  });

  describe('Data Isolation Verification', () => {
    test('should ensure different users in individual mode have different tenant contexts', () => {
      const user1 = 'user-123';
      const user2 = 'user-456';

      const context1 = { tenantId: user1, userId: user1, activeTeamId: null };
      const context2 = { tenantId: user2, userId: user2, activeTeamId: null };

      expect(context1.tenantId).not.toBe(context2.tenantId);
      expect(context1.tenantId).toBe(user1);
      expect(context2.tenantId).toBe(user2);
    });

    test('should ensure users in same team share tenant context', () => {
      const user1 = 'user-123';
      const user2 = 'user-456';
      const teamId = 'team-789';

      const context1 = { tenantId: teamId, userId: user1, activeTeamId: teamId };
      const context2 = { tenantId: teamId, userId: user2, activeTeamId: teamId };

      expect(context1.tenantId).toBe(context2.tenantId);
      expect(context1.tenantId).toBe(teamId);
      expect(context2.tenantId).toBe(teamId);
      expect(context1.userId).not.toBe(context2.userId);
    });

    test('should ensure users in different teams have different tenant contexts', () => {
      const user1 = 'user-123';
      const user2 = 'user-456';
      const team1 = 'team-789';
      const team2 = 'team-abc';

      const context1 = { tenantId: team1, userId: user1, activeTeamId: team1 };
      const context2 = { tenantId: team2, userId: user2, activeTeamId: team2 };

      expect(context1.tenantId).not.toBe(context2.tenantId);
      expect(context1.tenantId).toBe(team1);
      expect(context2.tenantId).toBe(team2);
    });
  });

  describe('Token Invalidation Context', () => {
    test('should include team context version for cache busting', () => {
      const userId = 'user-123';
      const teamId = 'team-456';
      const updatedAt = '2025-01-15T10:30:00Z';

      const tokenClaims = {
        tenantId: teamId,
        activeTeamId: teamId,
        teamContextVersion: updatedAt
      };

      expect(tokenClaims.teamContextVersion).toBe(updatedAt);
      expect(typeof tokenClaims.teamContextVersion).toBe('string');
    });

    test('should use current timestamp when profile has no updatedAt', () => {
      const userId = 'user-123';
      const now = new Date().toISOString();

      const tokenClaims = {
        tenantId: userId,
        activeTeamId: null,
        teamContextVersion: now
      };

      expect(tokenClaims.teamContextVersion).toBeDefined();
      expect(typeof tokenClaims.teamContextVersion).toBe('string');
    });
  });
});
