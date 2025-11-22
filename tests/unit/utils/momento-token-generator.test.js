process.env.MOMENTO_CACHE_NAME = 'test-cache';
process.env.MOMENTO_API_KEY = 'test-api-key';

const mockGenerateDisposableToken = jest.fn();

jest.mock('@aws-lambda-powertools/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.mock('@gomomento/sdk', () => ({
  AuthClient: jest.fn().mockImplementation(() => ({
    generateDisposableToken: mockGenerateDisposableToken
  })),
  CredentialProvider: {
    fromEnvironmentVariable: jest.fn().mockReturnValue('mock-credential-provider')
  },
  ExpiresIn: {
    minutes: jest.fn((m) => ({ minutes: m }))
  },
  TopicRole: {
    SubscribeOnly: 'SubscribeOnly'
  }
}));

const { ExpiresIn } = require('@gomomento/sdk');
const { generateMomentoToken } = require('../../../functions/utils/momento.mjs');

describe('Momento Token Generator Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateDisposableToken.mockReset();
  });

  describe('userId topic permissions', () => {
    test('should create permissions for userId topic', async () => {
      const userId = 'user-123';
      const tenantId = 'user-123';
      const teams = [];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(tenantId, userId, teams);

      expect(mockGenerateDisposableToken).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expect.arrayContaining([
            expect.objectContaining({
              role: 'SubscribeOnly',
              cache: 'test-cache',
              topic: userId
            })
          ])
        }),
        expect.anything(),
        expect.anything()
      );
    });

    test('should always include userId topic regardless of tenantId', async () => {
      const userId = 'user-123';
      const tenantId = 'team-456';
      const teams = [{ teamId: 'team-456' }];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(tenantId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      const userTopicPermission = permissions.find(p => p.topic === userId);
      expect(userTopicPermission).toBeDefined();
      expect(userTopicPermission.role).toBe('SubscribeOnly');
      expect(userTopicPermission.cache).toBe('test-cache');
    });
  });

  describe('userId_tasks topic permissions', () => {
    test('should create permissions for userId_tasks topic', async () => {
      const userId = 'user-123';
      const tenantId = 'user-123';
      const teams = [];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(tenantId, userId, teams);

      expect(mockGenerateDisposableToken).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expect.arrayContaining([
            expect.objectContaining({
              role: 'SubscribeOnly',
              cache: 'test-cache',
              topic: `${userId}_tasks`
            })
          ])
        }),
        expect.anything(),
        expect.anything()
      );
    });

    test('should include userId_tasks topic with correct format', async () => {
      const userId = 'user-789';
      const teams = [];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      const userTasksPermission = permissions.find(p => p.topic === `${userId}_tasks`);
      expect(userTasksPermission).toBeDefined();
      expect(userTasksPermission.topic).toBe('user-789_tasks');
    });
  });

  describe('all team topics receive permissions', () => {
    test('should create permissions for all team topics', async () => {
      const userId = 'user-123';
      const teams = [
        { teamId: 'team-456' },
        { teamId: 'team-789' },
        { teamId: 'team-abc' }
      ];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      for (const team of teams) {
        const teamPermission = permissions.find(p => p.topic === team.teamId);
        expect(teamPermission).toBeDefined();
        expect(teamPermission.role).toBe('SubscribeOnly');
        expect(teamPermission.cache).toBe('test-cache');
      }
    });

    test('should create permissions for all team task topics', async () => {
      const userId = 'user-123';
      const teams = [
        { teamId: 'team-456' },
        { teamId: 'team-789' }
      ];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      for (const team of teams) {
        const teamTasksPermission = permissions.find(p => p.topic === `${team.teamId}_tasks`);
        expect(teamTasksPermission).toBeDefined();
        expect(teamTasksPermission.topic).toBe(`${team.teamId}_tasks`);
      }
    });

    test('should not skip any team regardless of tenantId value', async () => {
      const userId = 'user-123';
      const tenantId = 'team-456';
      const teams = [
        { teamId: 'team-456' },
        { teamId: 'team-789' },
        { teamId: 'team-abc' }
      ];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(tenantId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      const team456Permission = permissions.find(p => p.topic === 'team-456');
      expect(team456Permission).toBeDefined();

      const teamCount = permissions.filter(p => p.topic.startsWith('team-')).length;
      expect(teamCount).toBe(6);
    });
  });

  describe('no duplicate permissions', () => {
    test('should not create duplicate permissions for same topic', async () => {
      const userId = 'user-123';
      const teams = [
        { teamId: 'team-456' },
        { teamId: 'team-789' }
      ];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      const topics = permissions.map(p => p.topic);
      const uniqueTopics = [...new Set(topics)];

      expect(topics.length).toBe(uniqueTopics.length);
    });

    test('should create exactly 2 + (teams * 2) permissions', async () => {
      const userId = 'user-123';
      const teams = [
        { teamId: 'team-456' },
        { teamId: 'team-789' },
        { teamId: 'team-abc' }
      ];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      const expectedCount = 2 + (teams.length * 2);
      expect(permissions.length).toBe(expectedCount);
    });
  });

  describe('empty teams array', () => {
    test('should create only userId permissions when teams array is empty', async () => {
      const userId = 'user-123';
      const teams = [];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      expect(permissions.length).toBe(2);
      expect(permissions[0].topic).toBe(userId);
      expect(permissions[1].topic).toBe(`${userId}_tasks`);
    });

    test('should return valid token with empty teams', async () => {
      const userId = 'user-456';
      const teams = [];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'valid-token-123'
      });

      const token = await generateMomentoToken(userId, userId, teams);

      expect(token).toBe('valid-token-123');
    });
  });

  describe('multiple teams', () => {
    test('should handle multiple teams correctly', async () => {
      const userId = 'user-123';
      const teams = [
        { teamId: 'team-001' },
        { teamId: 'team-002' },
        { teamId: 'team-003' },
        { teamId: 'team-004' },
        { teamId: 'team-005' }
      ];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      expect(permissions.length).toBe(12);

      const userPermissions = permissions.filter(p => p.topic === userId || p.topic === `${userId}_tasks`);
      expect(userPermissions.length).toBe(2);

      const teamPermissions = permissions.filter(p => p.topic.startsWith('team-'));
      expect(teamPermissions.length).toBe(10);
    });

    test('should maintain correct permission structure for all teams', async () => {
      const userId = 'user-123';
      const teams = [
        { teamId: 'team-alpha' },
        { teamId: 'team-beta' },
        { teamId: 'team-gamma' }
      ];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      const call = mockGenerateDisposableToken.mock.calls[0];
      const permissions = call[0].permissions;

      permissions.forEach(permission => {
        expect(permission).toHaveProperty('role');
        expect(permission).toHaveProperty('cache');
        expect(permission).toHaveProperty('topic');
        expect(permission.role).toBe('SubscribeOnly');
        expect(permission.cache).toBe('test-cache');
      });
    });
  });

  describe('token generation parameters', () => {
    test('should set token expiration to 15 minutes', async () => {
      const userId = 'user-123';
      const teams = [];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      expect(ExpiresIn.minutes).toHaveBeenCalledWith(15);
    });

    test('should set tokenId to userId', async () => {
      const userId = 'user-789';
      const teams = [];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: 'test-token'
      });

      await generateMomentoToken(userId, userId, teams);

      expect(mockGenerateDisposableToken).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ tokenId: userId })
      );
    });

    test('should return token string on success', async () => {
      const userId = 'user-123';
      const teams = [];
      const expectedToken = 'momento-auth-token-xyz';

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Success',
        authToken: expectedToken
      });

      const token = await generateMomentoToken(userId, userId, teams);

      expect(token).toBe(expectedToken);
    });

    test('should return null on failure', async () => {
      const userId = 'user-123';
      const teams = [];

      mockGenerateDisposableToken.mockResolvedValue({
        type: 'Error',
        message: 'Token generation failed'
      });

      const token = await generateMomentoToken(userId, userId, teams);

      expect(token).toBeNull();
    });

    test('should return null on exception', async () => {
      const userId = 'user-123';
      const teams = [];

      mockGenerateDisposableToken.mockRejectedValue(new Error('Network error'));

      const token = await generateMomentoToken(userId, userId, teams);

      expect(token).toBeNull();
    });
  });
});
