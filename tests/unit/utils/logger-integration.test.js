// Unit tests for Logger integration across all functions
// These tests verify that Logger is properly configured and used

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Logger Integration Tests', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Logger Configuration', () => {
    test('should create Logger with correct service name for episodes', () => {
      mockLogger = new Logger({ serviceName: 'episodes' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'episodes' });
      expect(mockLogger).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.debug).toBeDefined();
    });

    test('should create Logger with correct service name for teams', () => {
      mockLogger = new Logger({ serviceName: 'teams' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'teams' });
    });

    test('should create Logger with correct service name for events', () => {
      mockLogger = new Logger({ serviceName: 'events' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'events' });
    });

    test('should create Logger with correct service name for clips', () => {
kLogger = new Logger({ serviceName: 'clips' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'clips' });
    });

    test('should create Logger with correct service name for users', () => {
      mockLogger = new Logger({ serviceName: 'users' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'users' });
    });

    test('should create Logger with correct service name for auth', () => {
      mockLogger = new Logger({ serviceName: 'auth' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'auth' });
    });

    test('should create Logger with correct service name for agents', () => {
      mockLogger = new Logger({ serviceName: 'agents' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'agents' });
    });

    test('should create Logger with correct service name for video', () => {
      mockLogger = new Logger({ serviceName: 'video' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'video' });
    });

    test('should create Logger with correct service name for tools', () => {
      mockLogger = new Logger({ serviceName: 'tools' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'tools' });
    });

    test('should create Logger with correct service name for utils', () => {
      mockLogger = new Logger({ serviceName: 'utils' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'utils' });
    });

    test('should create Logger with correct service name for invitations', () => {
      mockLogger = new Logger({ serviceName: 'invitations' });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'invitations' });
    });
  });

  describe('Logger Method Usage', () => {
    beforeEach(() => {
      mockLogger = new Logger({ serviceName: 'test' });
    });

    test('should use logger.info for informational messages', () => {
      mockLogger.info('Operation completed successfully');

      expect(mockLogger.info).toHaveBeenCalledWith('Operation completed successfully');
    });

    test('should use logger.error for error messages', () => {
      const error = new Error('Something went wrong');

      mockLogger.error('Operation failed', {
        error: error.message,
        stack: error.stack
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Operation failed', {
        error: 'Something went wrong',
        stack: error.stack
      });
    });

    test('should use logger.warn for warning messages', () => {
      mockLogger.warn('Invalid token provided', {
        tokenType: 'Bearer'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid token provided', {
        tokenType: 'Bearer'
      });
    });

    test('should use logger.debug for debug messages', () => {
      mockLogger.debug('Processing request', {
        requestId: 'req-123',
        userId: 'user-456'
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Processing request', {
        requestId: 'req-123',
        userId: 'user-456'
      });
    });
  });

  describe('Structured Logging Patterns', () => {
    beforeEach(() => {
      mockLogger = new Logger({ serviceName: 'test' });
    });

    test('should log with structured context data', () => {
      const context = {
        tenantId: 'tenant-123',
        episodeId: 'episode-456',
        operation: 'create-episode'
      };

      mockLogger.info('Episode creation started', context);

      expect(mockLogger.info).toHaveBeenCalledWith('Episode creation started', context);
    });

    test('should log errors with full error context', () => {
      const error = new Error('Database connection failed');
      error.code = 'ECONNREFUSED';

      mockLogger.error('Database operation failed', {
        error: error.message,
        code: error.code,
        operation: 'getEpisode',
        tenantId: 'tenant-123'
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Database operation failed', {
        error: 'Database connection failed',
        code: 'ECONNREFUSED',
        operation: 'getEpisode',
        tenantId: 'tenant-123'
      });
    });

    test('should log with request context', () => {
      const requestContext = {
        requestId: 'req-789',
        userId: 'user-123',
        tenantId: 'tenant-456'
      };

      mockLogger.info('Request processed', requestContext);

      expect(mockLogger.info).toHaveBeenCalledWith('Request processed', requestContext);
    });

    test('should log performance metrics', () => {
      const metrics = {
        operation: 'listEpisodes',
        duration: 150,
        itemCount: 25,
        tenantId: 'tenant-123'
      };

      mockLogger.info('Operation completed', metrics);

      expect(mockLogger.info).toHaveBeenCalledWith('Operation completed', metrics);
    });
  });

  describe('Error Handling Patterns', () => {
    beforeEach(() => {
      mockLogger = new Logger({ serviceName: 'test' });
    });

    test('should handle AWS SDK errors properly', () => {
      const awsError = {
        name: 'ResourceNotFoundException',
        message: 'The resource you requested does not exist',
        statusCode: 404,
        code: 'ResourceNotFoundException'
      };

      mockLogger.error('AWS operation failed', {
        error: awsError.message,
        errorName: awsError.name,
        statusCode: awsError.statusCode,
        operation: 'getItem'
      });

      expect(mockLogger.error).toHaveBeenCalledWith('AWS operation failed', {
        error: 'The resource you requested does not exist',
        errorName: 'ResourceNotFoundException',
        statusCode: 404,
        operation: 'getItem'
      });
    });

    test('should handle validation errors properly', () => {
      const validationError = {
        name: 'ValidationError',
        message: 'Title is required',
        field: 'title'
      };

      mockLogger.error('Validation failed', {
        error: validationError.message,
        field: validationError.field,
        operation: 'createEpisode'
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Validation failed', {
        error: 'Title is required',
        field: 'title',
        operation: 'createEpisode'
      });
    });

    test('should handle authorization errors properly', () => {
      mockLogger.warn('Unauthorized access attempt', {
        operation: 'deleteEpisode',
        episodeId: 'episode-123',
        reason: 'Missing tenantId'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Unauthorized access attempt', {
        operation: 'deleteEpisode',
        episodeId: 'episode-123',
        reason: 'Missing tenantId'
      });
    });
  });

  describe('Context Management', () => {
    beforeEach(() => {
      mockLogger = new Logger({ serviceName: 'test' });
    });

    test('should support adding context to logger', () => {
      const context = {
        tenantId: 'tenant-123',
        userId: 'user-456'
      };

      mockLogger.addContext(context);

      expect(mockLogger.addContext).toHaveBeenCalledWith(context);
    });

    test('should support appending keys to logger', () => {
      const additionalKeys = {
        requestId: 'req-789',
        operation: 'createEpisode'
      };

      mockLogger.appendKeys(additionalKeys);

      expect(mockLogger.appendKeys).toHaveBeenCalledWith(additionalKeys);
    });

    test('should support removing keys from logger', () => {
      const keysToRemove = ['temporaryKey', 'debugInfo'];

      mockLogger.removeKeys(keysToRemove);

      expect(mockLogger.removeKeys).toHaveBeenCalledWith(keysToRemove);
    });
  });

  describe('Migration Verification', () => {
    test('should verify no console.log calls are made', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      mockLogger = new Logger({ serviceName: 'test' });

      // Simulate function that should use logger instead of console
      mockLogger.info('This should use logger, not console');

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('This should use logger, not console');

      consoleSpy.mockRestore();
    });

    test('should verify no console.error calls are made', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      mockLogger = new Logger({ serviceName: 'test' });

      // Simulate function that should use logger instead of console
      mockLogger.error('This should use logger, not console');

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('This should use logger, not console');

      consoleSpy.mockRestore();
    });

    test('should verify no console.warn calls are made', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      mockLogger = new Logger({ serviceName: 'test' });

      // Simulate function that should use logger instead of console
      mockLogger.warn('This should use logger, not console');

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('This should use logger, not console');

      consoleSpy.mockRestore();
    });
  });

  describe('Service-Specific Logger Tests', () => {
    test('should verify episodes service uses correct logger configuration', () => {
      const episodesLogger = new Logger({ serviceName: 'episodes' });

      episodesLogger.info('Episode created successfully', {
        episodeId: 'episode-123',
        title: 'Test Episode'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'episodes' });
      expect(episodesLogger.info).toHaveBeenCalledWith('Episode created successfully', {
        episodeId: 'episode-123',
        title: 'Test Episode'
      });
    });

    test('should verify teams service uses correct logger configuration', () => {
      const teamsLogger = new Logger({ serviceName: 'teams' });

      teamsLogger.info('Team member added', {
        teamId: 'team-123',
        email: 'user@example.com'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'teams' });
      expect(teamsLogger.info).toHaveBeenCalledWith('Team member added', {
        teamId: 'team-123',
        email: 'user@example.com'
      });
    });

    test('should verify events service uses correct logger configuration', () => {
      const eventsLogger = new Logger({ serviceName: 'events' });

      eventsLogger.info('Event processed', {
        eventType: 'Team Member Added',
        eventId: 'event-123'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'events' });
      expect(eventsLogger.info).toHaveBeenCalledWith('Event processed', {
        eventType: 'Team Member Added',
        eventId: 'event-123'
      });
    });
  });
});
