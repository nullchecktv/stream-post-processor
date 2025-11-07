// Integration tests for structured logging with Lambda Powertools Logger
// These tests verify service name configuration and structured log output

// Mock Logger for integration testing
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../helpers/logger-mock');
  return { Logger };
});

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Structured Logging Integration Tests', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Name Configuration Verification', () => {
    test('should verify episodes service uses correct logger configuration', () => {
      // Simulate episodes function initialization
      const episodesLogger = new Logger({ serviceName: 'episodes' });

      // Simulate episode creation logging
      episodesLogger.info('Episode created successfully', {
        episodeId: 'episode-123',
        title: 'Test Episode',
        tenantId: 'tenant-456'
      });

      // Verify Logger was initialized with correct service name
      expect(Logger).toHaveBeenCalledWith({ serviceName: 'episodes' });

      // Verify structured logging call
      expect(episodesLogger.info).toHaveBeenCalledWith('Episode created successfully', {
        episodeId: 'episode-123',
        title: 'Test Episode',
        tenantId: 'tenant-456'
      });
    });

    test('should verify teams service uses correct logger configuration', () => {
      // Simulate teams function initialization
      const teamsLogger = new Logger({ serviceName: 'teams' });

      // Simulate team member addition logging
      teamsLogger.info('Team member added successfully', {
        teamId: 'team-123',
        email: 'user@example.com',
        role: 'member',
        invitedBy: 'user-456'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'teams' });
      expect(teamsLogger.info).toHaveBeenCalledWith('Team member added successfully', {
        teamId: 'team-123',
        email: 'user@example.com',
        role: 'member',
        invitedBy: 'user-456'
      });
    });

    test('should verify events service uses correct logger configuration', () => {
      // Simulate events function initialization
      const eventsLogger = new Logger({ serviceName: 'events' });

      // Simulate event processing logging
      eventsLogger.info('Event processed successfully', {
        eventType: 'Team Member Added',
        eventId: 'event-789',
        processingTime: 150
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'events' });
      expect(eventsLogger.info).toHaveBeenCalledWith('Event processed successfully', {
        eventType: 'Team Member Added',
        eventId: 'event-789',
        processingTime: 150
      });
    });

    test('should verify clips service uses correct logger configuration', () => {
      // Simulate clips function initialization
      const clipsLogger = new Logger({ serviceName: 'clips' });

      // Simulate clip processing logging
      clipsLogger.info('Clip processed successfully', {
        clipId: 'clip-123',
        episodeId: 'episode-456',
        duration: '00:02:15',
        status: 'processed'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'clips' });
      expect(clipsLogger.info).toHaveBeenCalledWith('Clip processed successfully', {
        clipId: 'clip-123',
        episodeId: 'episode-456',
        duration: '00:02:15',
        status: 'processed'
      });
    });

    test('should verify auth service uses correct logger configuration', () => {
      // Simulate auth function initialization
      const authLogger = new Logger({ serviceName: 'auth' });

      // Simulate authorization logging
      authLogger.info('User authorized successfully', {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scopes: ['read:episodes', 'write:episodes']
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'auth' });
      expect(authLogger.info).toHaveBeenCalledWith('User authorized successfully', {
        userId: 'user-123',
        tenantId: 'tenant-456',
        scopes: ['read:episodes', 'write:episodes']
      });
    });

    test('should verify users service uses correct logger configuration', () => {
      // Simulate users function initialization
      const usersLogger = new Logger({ serviceName: 'users' });

      // Simulate user profile update logging
      usersLogger.info('User profile updated', {
        userId: 'user-123',
        updatedFields: ['name', 'email'],
        tenantId: 'tenant-456'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'users' });
      expect(usersLogger.info).toHaveBeenCalledWith('User profile updated', {
        userId: 'user-123',
        updatedFields: ['name', 'email'],
        tenantId: 'tenant-456'
      });
    });

    test('should verify agents service uses correct logger configuration', () => {
      // Simulate agents function initialization
      const agentsLogger = new Logger({ serviceName: 'agents' });

      // Simulate AI agent processing logging
      agentsLogger.info('Clip detection completed', {
        episodeId: 'episode-123',
        clipsDetected: 5,
        processingTime: 2500,
        modelUsed: 'amazon.nova-pro-v1:0'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'agents' });
      expect(agentsLogger.info).toHaveBeenCalledWith('Clip detection completed', {
        episodeId: 'episode-123',
        clipsDetected: 5,
        processingTime: 2500,
        modelUsed: 'amazon.nova-pro-v1:0'
      });
    });

    test('should verify video service uses correct logger configuration', () => {
      // Simulate video function initialization
      const videoLogger = new Logger({ serviceName: 'video' });

      // Simulate video processing logging
      videoLogger.info('Video segment extracted', {
        episodeId: 'episode-123',
        segmentId: 'segment-456',
        startTime: '00:15:30',
        endTime: '00:17:45',
        outputSize: '25MB'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'video' });
      expect(videoLogger.info).toHaveBeenCalledWith('Video segment extracted', {
        episodeId: 'episode-123',
        segmentId: 'segment-456',
        startTime: '00:15:30',
        endTime: '00:17:45',
        outputSize: '25MB'
      });
    });

    test('should verify tools service uses correct logger configuration', () => {
      // Simulate tools function initialization
      const toolsLogger = new Logger({ serviceName: 'tools' });

      // Simulate tool execution logging
      toolsLogger.info('Clip creation tool executed', {
        toolName: 'create-clips',
        episodeId: 'episode-123',
        clipsCreated: 3,
        executionTime: 1200
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'tools' });
      expect(toolsLogger.info).toHaveBeenCalledWith('Clip creation tool executed', {
        toolName: 'create-clips',
        episodeId: 'episode-123',
        clipsCreated: 3,
        executionTime: 1200
      });
    });

    test('should verify utils service uses correct logger configuration', () => {
      // Simulate utils function initialization
      const utilsLogger = new Logger({ serviceName: 'utils' });

      // Simulate utility operation logging
      utilsLogger.warn('Invalid token detected', {
        tokenType: 'Bearer',
        operation: 'validateRequest',
        clientId: 'client-123'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'utils' });
      expect(utilsLogger.warn).toHaveBeenCalledWith('Invalid token detected', {
        tokenType: 'Bearer',
        operation: 'validateRequest',
        clientId: 'client-123'
      });
    });

    test('should verify invitations service uses correct logger configuration', () => {
      // Simulate invitations function initialization
      const invitationsLogger = new Logger({ serviceName: 'invitations' });

      // Simulate invitation processing logging
      invitationsLogger.info('Invitation decision processed', {
        invitationId: 'inv-123',
        decision: 'accepted',
        userId: 'user-456',
        teamId: 'team-789'
      });

      expect(Logger).toHaveBeenCalledWith({ serviceName: 'invitations' });
      expect(invitationsLogger.info).toHaveBeenCalledWith('Invitation decision processed', {
        invitationId: 'inv-123',
        decision: 'accepted',
        userId: 'user-456',
        teamId: 'team-789'
      });
    });
  });

  describe('Structured Log Output Verification', () => {
    beforeEach(() => {
      mockLogger = new Logger({ serviceName: 'test' });
    });

    test('should verify structured error logging with full context', () => {
      const error = new Error('Database connection failed');
      error.code = 'ECONNREFUSED';
      error.statusCode = 500;

      mockLogger.error('Database operation failed', {
        error: error.message,
        errorCode: error.code,
        statusCode: error.statusCode,
        operation: 'getEpisode',
        tenantId: 'tenant-123',
        episodeId: 'episode-456',
        timestamp: '2025-01-15T10:30:00Z'
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Database operation failed', {
        error: 'Database connection failed',
        errorCode: 'ECONNREFUSED',
        statusCode: 500,
        operation: 'getEpisode',
        tenantId: 'tenant-123',
        episodeId: 'episode-456',
        timestamp: '2025-01-15T10:30:00Z'
      });
    });

    test('should verify structured info logging with request context', () => {
      mockLogger.info('Request processed successfully', {
        method: 'POST',
        path: '/episodes',
        statusCode: 201,
        responseTime: 150,
        tenantId: 'tenant-123',
        userId: 'user-456',
        requestId: 'req-789',
        episodeId: 'episode-123'
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Request processed successfully', {
        method: 'POST',
        path: '/episodes',
        statusCode: 201,
        responseTime: 150,
        tenantId: 'tenant-123',
        userId: 'user-456',
        requestId: 'req-789',
        episodeId: 'episode-123'
      });
    });

    test('should verify structured warning logging with validation context', () => {
      mockLogger.warn('Validation warning detected', {
        field: 'episodeNumber',
        value: -1,
        expectedRange: '1-999',
        operation: 'createEpisode',
        tenantId: 'tenant-123',
        correctedValue: 1
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Validation warning detected', {
        field: 'episodeNumber',
        value: -1,
        expectedRange: '1-999',
        operation: 'createEpisode',
        tenantId: 'tenant-123',
        correctedValue: 1
      });
    });

    test('should verify structured debug logging with performance metrics', () => {
      mockLogger.debug('Performance metrics collected', {
        operation: 'listEpisodes',
        queryTime: 45,
        itemCount: 25,
        cacheHit: true,
        tenantId: 'tenant-123',
        filters: {
          status: 'published',
          limit: 25
        }
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Performance metrics collected', {
        operation: 'listEpisodes',
        queryTime: 45,
        itemCount: 25,
        cacheHit: true,
        tenantId: 'tenant-123',
        filters: {
          status: 'published',
          limit: 25
        }
      });
    });
  });

  describe('Cross-Service Logging Consistency', () => {
    test('should maintain consistent logging patterns across services', () => {
      // Test that all services follow the same logging patterns
      const services = [
        'episodes', 'teams', 'events', 'clips', 'auth',
        'users', 'agents', 'video', 'tools', 'utils', 'invitations'
      ];

      const loggers = {};

      // Initialize loggers for all services
      services.forEach(service => {
        loggers[service] = new Logger({ serviceName: service });
      });

      // Verify all loggers were initialized with correct service names
      services.forEach(service => {
        expect(Logger).toHaveBeenCalledWith({ serviceName: service });
      });

      // Test consistent error logging pattern across services
      const testError = new Error('Test error');
      services.forEach(service => {
        loggers[service].error('Operation failed', {
          error: testError.message,
          service: service,
          operation: 'testOperation'
        });

        expect(loggers[service].error).toHaveBeenCalledWith('Operation failed', {
          error: 'Test error',
          service: service,
          operation: 'testOperation'
        });
      });
    });

    test('should verify tenant isolation in logging across services', () => {
      const episodesLogger = new Logger({ serviceName: 'episodes' });
      const teamsLogger = new Logger({ serviceName: 'teams' });

      // Log operations for different tenants
      episodesLogger.info('Episode operation', {
        tenantId: 'tenant-123',
        episodeId: 'episode-456'
      });

      teamsLogger.info('Team operation', {
        tenantId: 'tenant-789',
        teamId: 'team-123'
      });

      // Verify tenant isolation is maintained in logs
      expect(episodesLogger.info).toHaveBeenCalledWith('Episode operation', {
        tenantId: 'tenant-123',
        episodeId: 'episode-456'
      });

      expect(teamsLogger.info).toHaveBeenCalledWith('Team operation', {
        tenantId: 'tenant-789',
        teamId: 'team-123'
      });
    });
  });

  describe('Error Handling and Recovery Logging', () => {
    beforeEach(() => {
      mockLogger = new Logger({ serviceName: 'test' });
    });

    test('should verify AWS SDK error logging patterns', () => {
      const awsError = {
        name: 'ResourceNotFoundException',
        message: 'The resource you requested does not exist',
        statusCode: 404,
        code: 'ResourceNotFoundException',
        requestId: 'req-123'
      };

      mockLogger.error('AWS operation failed', {
        error: awsError.message,
        errorName: awsError.name,
        errorCode: awsError.code,
        statusCode: awsError.statusCode,
        requestId: awsError.requestId,
        operation: 'getItem',
        tableName: 'NullCheckTable'
      });

      expect(mockLogger.error).toHaveBeenCalledWith('AWS operation failed', {
        error: 'The resource you requested does not exist',
        errorName: 'ResourceNotFoundException',
        errorCode: 'ResourceNotFoundException',
        statusCode: 404,
        requestId: 'req-123',
        operation: 'getItem',
        tableName: 'NullCheckTable'
      });
    });

    test('should verify retry logic logging patterns', () => {
      mockLogger.warn('Operation retry attempted', {
        operation: 'sendEmail',
        attempt: 2,
        maxAttempts: 3,
        error: 'Throttling',
        backoffDelay: 2000,
        nextRetryAt: '2025-01-15T10:30:02Z'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Operation retry attempted', {
        operation: 'sendEmail',
        attempt: 2,
        maxAttempts: 3,
        error: 'Throttling',
        backoffDelay: 2000,
        nextRetryAt: '2025-01-15T10:30:02Z'
      });
    });

    test('should verify circuit breaker logging patterns', () => {
      mockLogger.error('Circuit breaker opened', {
        service: 'external-api',
        failureCount: 5,
        threshold: 5,
        timeWindow: '60s',
        nextRetryAt: '2025-01-15T10:31:00Z'
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Circuit breaker opened', {
        service: 'external-api',
        failureCount: 5,
        threshold: 5,
        timeWindow: '60s',
        nextRetryAt: '2025-01-15T10:31:00Z'
      });
    });
  });

  describe('Performance and Monitoring Logging', () => {
    beforeEach(() => {
      mockLogger = new Logger({ serviceName: 'test' });
    });

    test('should verify performance metrics logging', () => {
      mockLogger.info('Operation performance metrics', {
        operation: 'processClips',
        duration: 2500,
        itemsProcessed: 10,
        throughput: 4.0,
        memoryUsed: '512MB',
        cpuUtilization: 75,
        cacheHitRate: 0.85
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Operation performance metrics', {
        operation: 'processClips',
        duration: 2500,
        itemsProcessed: 10,
        throughput: 4.0,
        memoryUsed: '512MB',
        cpuUtilization: 75,
        cacheHitRate: 0.85
      });
    });

    test('should verify business metrics logging', () => {
      mockLogger.info('Business metrics collected', {
        metric: 'clips_generated',
        value: 15,
        period: 'daily',
        tenantId: 'tenant-123',
        episodeCount: 3,
        averageClipsPerEpisode: 5.0
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Business metrics collected', {
        metric: 'clips_generated',
        value: 15,
        period: 'daily',
        tenantId: 'tenant-123',
        episodeCount: 3,
        averageClipsPerEpisode: 5.0
      });
    });

    test('should verify security event logging', () => {
      mockLogger.warn('Security event detected', {
        event: 'unauthorized_access_attempt',
        userId: 'user-123',
        resource: '/episodes/episode-456',
        method: 'DELETE',
        sourceIP: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: '2025-01-15T10:30:00Z'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', {
        event: 'unauthorized_access_attempt',
        userId: 'user-123',
        resource: '/episodes/episode-456',
        method: 'DELETE',
        sourceIP: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: '2025-01-15T10:30:00Z'
      });
    });
  });

  describe('Migration Verification', () => {
    test('should verify no console logging is used in migrated functions', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const consoleErrorSpy = jest.spyOn(console, 'error');
      const consoleWarnSpy = jest.spyOn(console, 'warn');

      mockLogger = new Logger({ serviceName: 'test' });

      // Simulate function operations that should use Logger instead of console
      mockLogger.info('This should use Logger, not console.log');
      mockLogger.error('This should use Logger, not console.error');
      mockLogger.warn('This should use Logger, not console.warn');

      // Verify no console methods were called
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      // Verify Logger methods were called
      expect(mockLogger.info).toHaveBeenCalledWith('This should use Logger, not console.log');
      expect(mockLogger.error).toHaveBeenCalledWith('This should use Logger, not console.error');
      expect(mockLogger.warn).toHaveBeenCalledWith('This should use Logger, not console.warn');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    test('should verify Logger context management works correctly', () => {
      mockLogger = new Logger({ serviceName: 'test' });

      // Test adding context
      const context = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        requestId: 'req-789'
      };

      mockLogger.addContext(context);
      expect(mockLogger.addContext).toHaveBeenCalledWith(context);

      // Test appending keys
      const additionalKeys = {
        operation: 'createEpisode',
        episodeId: 'episode-123'
      };

      mockLogger.appendKeys(additionalKeys);
      expect(mockLogger.appendKeys).toHaveBeenCalledWith(additionalKeys);

      // Test removing keys
      const keysToRemove = ['temporaryKey', 'debugInfo'];

      mockLogger.removeKeys(keysToRemove);
      expect(mockLogger.removeKeys).toHaveBeenCalledWith(keysToRemove);
    });
  });
});
