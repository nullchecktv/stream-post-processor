const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { CognitoIdentityProviderClient, GetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddbMock = mockClient(DynamoDBClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      verify: jest.fn().mockResolvedValue({ sub: 'user-123' })
    }))
  }
}));

jest.mock('@aws-lambda-powertools/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

process.env.TABLE_NAME = 'test-table';
process.env.USER_POOL_ID = 'test-pool';
process.env.USER_POOL_CLIENT_ID = 'test-client';

const { handler } = require('../../../functions/auth/authorizer.mjs');

describe('Authorizer tenantId Coalescing Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
    cognitoMock.reset();
    jest.clearAllMocks();
  });

  const createMockEvent = (token = 'valid-token') => ({
    headers: {
      Authorization: `Bearer ${token}`
    },
    methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/GET/episodes'
  });

  describe('tenantId coalescing with activeTeamId present', () => {
    test('should set tenantId to activeTeamId when user has active team', async () => {
      const userId = 'user-123';
      const teamId = 'team-456';
      const email = 'user@example.com';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: email }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile',
          email,
          activeTeamId: teamId
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context.tenantId).toBe(teamId);
      expect(result.context.userId).toBe(userId);
      expect(result.context.activeTeamId).toBe(teamId);
      expect(result.context.email).toBe(email);
    });

    test('should include activeTeamId in context when present', async () => {
      const userId = 'user-123';
      const teamId = 'team-789';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'test@example.com' }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile',
          activeTeamId: teamId
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context).toHaveProperty('activeTeamId');
      expect(result.context.activeTeamId).toBe(teamId);
    });
  });

  describe('tenantId coalescing with activeTeamId null', () => {
    test('should set tenantId to userId when activeTeamId is null', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: email }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile',
          email,
          activeTeamId: null
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context.tenantId).toBe(userId);
      expect(result.context.userId).toBe(userId);
      expect(result.context.activeTeamId).toBeUndefined();
      expect(result.context.email).toBe(email);
    });

    test('should set tenantId to userId when activeTeamId is undefined', async () => {
      const userId = 'user-456';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'test@example.com' }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile'
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context.tenantId).toBe(userId);
      expect(result.context.activeTeamId).toBeUndefined();
    });
  });

  describe('tenantId coalescing with missing user profile', () => {
    test('should set tenantId to userId when user profile does not exist', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: email }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({});

      const result = await handler(createMockEvent());

      expect(result.context.tenantId).toBe(userId);
      expect(result.context.userId).toBe(userId);
      expect(result.context.activeTeamId).toBeUndefined();
      expect(result.context.email).toBe(email);
    });

    test('should handle DynamoDB errors gracefully and fallback to userId', async () => {
      const userId = 'user-789';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'test@example.com' }
        ]
      });

      ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

      const result = await handler(createMockEvent());

      expect(result.context.tenantId).toBe(userId);
      expect(result.context.userId).toBe(userId);
      expect(result.context.activeTeamId).toBeUndefined();
    });
  });

  describe('authorization context values', () => {
    test('should include all required context values for team mode', async () => {
      const userId = 'user-123';
      const teamId = 'team-456';
      const email = 'user@example.com';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: email }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile',
          activeTeamId: teamId
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context).toHaveProperty('tenantId');
      expect(result.context).toHaveProperty('userId');
      expect(result.context).toHaveProperty('activeTeamId');
      expect(result.context).toHaveProperty('email');
      expect(result.context.tenantId).toBe(teamId);
      expect(result.context.userId).toBe(userId);
      expect(result.context.activeTeamId).toBe(teamId);
      expect(result.context.email).toBe(email);
    });

    test('should include all required context values for individual mode', async () => {
      const userId = 'user-789';
      const email = 'individual@example.com';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: email }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile',
          activeTeamId: null
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context).toHaveProperty('tenantId');
      expect(result.context).toHaveProperty('userId');
      expect(result.context).toHaveProperty('email');
      expect(result.context.tenantId).toBe(userId);
      expect(result.context.userId).toBe(userId);
      expect(result.context.activeTeamId).toBeUndefined();
      expect(result.context.email).toBe(email);
    });

    test('should handle missing email gracefully', async () => {
      const userId = 'user-123';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile'
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context.email).toBe('');
    });

    test('should generate correct IAM policy with context', async () => {
      const userId = 'user-123';
      const teamId = 'team-456';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'test@example.com' }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile',
          activeTeamId: teamId
        })
      });

      const result = await handler(createMockEvent());

      expect(result).toHaveProperty('principalId');
      expect(result).toHaveProperty('policyDocument');
      expect(result).toHaveProperty('context');
      expect(result.principalId).toBe(userId);
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(result.policyDocument.Statement[0].Action).toBe('execute-api:Invoke');
    });
  });

  describe('no custom:tenantId dependency', () => {
    test('should not read custom:tenantId from Cognito attributes', async () => {
      const userId = 'user-123';
      const customTenantId = 'custom-tenant-789';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'test@example.com' },
          { Name: 'custom:tenantId', Value: customTenantId }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile',
          activeTeamId: null
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context.tenantId).toBe(userId);
      expect(result.context.tenantId).not.toBe(customTenantId);
    });

    test('should use activeTeamId over any custom:tenantId value', async () => {
      const userId = 'user-123';
      const teamId = 'team-456';
      const customTenantId = 'custom-tenant-789';

      cognitoMock.on(GetUserCommand).resolves({
        UserAttributes: [
          { Name: 'sub', Value: userId },
          { Name: 'email', Value: 'test@example.com' },
          { Name: 'custom:tenantId', Value: customTenantId }
        ]
      });

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: `user#${userId}`,
          sk: 'profile',
          activeTeamId: teamId
        })
      });

      const result = await handler(createMockEvent());

      expect(result.context.tenantId).toBe(teamId);
      expect(result.context.tenantId).not.toBe(customTenantId);
    });
  });
});

