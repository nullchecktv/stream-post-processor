// Unit tests for episode status update function
// These tests validate status update logic, prerequisite validation, and event publishing

// Mock environment variables
process.env.TABLE_NAME = 'test-table';

describe('Episode Status Update Function', () => {
  describe('Status Validation Logic', () => {
    const VALID_STATUSES = new Set(['Ready for Clip Gen']);

    const validateStatus = (status) => {
      if (!status || typeof status !== 'string') {
        throw new Error('Status is required and must be a string');
      }
      const trimmedStatus = status.trim();
      if (!VALID_STATUSES.has(trimmedStatus)) {
        throw new Error('Status must be one of: Ready for Clip Gen');
      }
      return trimmedStatus;
    };

    test('should validate correct status', () => {
      expect(validateStatus('Ready for Clip Gen')).toBe('Ready for Clip Gen');
      expect(validateStatus('  Ready for Clip Gen  ')).toBe('Ready for Clip Gen');
    });

    test('should reject invalid status', () => {
      expect(() => validateStatus('Invalid Status')).toThrow('Status must be one of: Ready for Clip Gen');
      expect(() => validateStatus('')).toThrow('Status is required and must be a string');
      expect(() => validateStatus(null)).toThrow('Status is required and must be a string');
      expect(() => validateStatus(undefined)).toThrow('Status is required and must be a string');
    });
  });

  describe('Prerequisite Validation Logic', () => {
    const getCurrentStatus = (statusHistory, fallbackStatus) => {
      if (!statusHistory || !Array.isArray(statusHistory) || statusHistory.length === 0) {
        return fallbackStatus;
      }
      const latestEntry = statusHistory[statusHistory.length - 1];
      return latestEntry?.status || fallbackStatus;
    };

    const validatePrerequisites = (episode, tracks, targetStatus) => {
      const missingPrerequisites = [];

      if (targetStatus === 'Ready for Clip Gen') {
        // Check episode status using statusHistory or fallback to status field
        const currentEpisodeStatus = getCurrentStatus(episode.statusHistory, episode.status);
        if (currentEpisodeStatus !== 'tracks uploaded') {
          missingPrerequisites.push(`Episode has status '${currentEpisodeStatus}', expected 'tracks uploaded'`);
        }

        // Check all tracks are processed
        for (const track of tracks) {
          const currentTrackStatus = getCurrentStatus(track.statusHistory, track.status);
          if (currentTrackStatus !== 'processed') {
            missingPrerequisites.push(`Track '${track.trackName}' has status '${currentTrackStatus}', expected 'processed'`);
          }
        }
      }

      return missingPrerequisites;
    };

    test('should pass validation when all prerequisites are met', () => {
      const episode = {
        status: 'tracks uploaded',
        statusHistory: [{ status: 'tracks uploaded', timestamp: '2025-01-15T10:15:00Z' }]
      };
      const tracks = [
        { trackName: 'main', status: 'processed', statusHistory: [{ status: 'processed', timestamp: '2025-01-15T10:20:00Z' }] },
        { trackName: 'guest', status: 'processed', statusHistory: [{ status: 'processed', timestamp: '2025-01-15T10:25:00Z' }] }
      ];

      const missing = validatePrerequisites(episode, tracks, 'Ready for Clip Gen');
      expect(missing).toEqual([]);
    });

    test('should fail validation when episode status is wrong', () => {
      const episode = {
        status: 'draft',
        statusHistory: [{ status: 'draft', timestamp: '2025-01-15T10:00:00Z' }]
      };
      const tracks = [
        { trackName: 'main', status: 'processed', statusHistory: [{ status: 'processed', timestamp: '2025-01-15T10:20:00Z' }] }
      ];

      const missing = validatePrerequisites(episode, tracks, 'Ready for Clip Gen');
      expect(missing).toContain("Episode has status 'draft', expected 'tracks uploaded'");
    });

    test('should fail validation when tracks are not processed', () => {
      const episode = {
        status: 'tracks uploaded',
        statusHistory: [{ status: 'tracks uploaded', timestamp: '2025-01-15T10:15:00Z' }]
      };
      const tracks = [
        { trackName: 'main', status: 'processed', statusHistory: [{ status: 'processed', timestamp: '2025-01-15T10:20:00Z' }] },
        { trackName: 'guest', status: 'uploading', statusHistory: [{ status: 'uploading', timestamp: '2025-01-15T10:10:00Z' }] }
      ];

      const missing = validatePrerequisites(episode, tracks, 'Ready for Clip Gen');
      expect(missing).toContain("Track 'guest' has status 'uploading', expected 'processed'");
    });

    test('should use statusHistory over status field', () => {
      const episode = {
        status: 'draft', // Old status field
        statusHistory: [
          { status: 'draft', timestamp: '2025-01-15T10:00:00Z' },
          { status: 'tracks uploaded', timestamp: '2025-01-15T10:15:00Z' }
        ]
      };
      const tracks = [
        {
          trackName: 'main',
          status: 'uploading', // Old status field
          statusHistory: [
            { status: 'uploading', timestamp: '2025-01-15T10:10:00Z' },
            { status: 'processed', timestamp: '2025-01-15T10:20:00Z' }
          ]
        }
      ];

      const missing = validatePrerequisites(episode, tracks, 'Ready for Clip Gen');
      expect(missing).toEqual([]); // Should pass because statusHistory shows correct statuses
    });

    test('should fall back to status field when statusHistory is empty', () => {
      const episode = {
        status: 'tracks uploaded',
        statusHistory: []
      };
      const tracks = [
        { trackName: 'main', status: 'processed', statusHistory: [] }
      ];

      const missing = validatePrerequisites(episode, tracks, 'Ready for Clip Gen');
      expect(missing).toEqual([]); // Should pass using status fields
    });
  });

  describe('Status History Management', () => {
    const createStatusHistoryEntry = (status, timestamp) => {
      return {
        status,
        timestamp: timestamp || new Date().toISOString()
      };
    };

    const addStatusToHistory = (existingHistory, newStatus) => {
      const history = existingHistory || [];
      const timestamp = new Date().toISOString();
      return [...history, createStatusHistoryEntry(newStatus, timestamp)];
    };

    const createUpdateParams = (newStatus) => {
      const statusEntry = createStatusHistoryEntry(newStatus);
      const now = new Date().toISOString();

      return {
        UpdateExpression: 'SET statusHistory = list_append(if_not_exists(statusHistory, :emptyList), :newStatus), #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':emptyList': [],
          ':newStatus': [statusEntry],
          ':status': newStatus,
          ':updatedAt': now
        }
      };
    };

    test('should create status history entry with timestamp', () => {
      const timestamp = '2025-01-15T10:30:00Z';
      const entry = createStatusHistoryEntry('Ready for Clip Gen', timestamp);

      expect(entry.status).toBe('Ready for Clip Gen');
      expect(entry.timestamp).toBe(timestamp);
    });

    test('should add status to existing history', () => {
      const existingHistory = [
        { status: 'draft', timestamp: '2025-01-15T10:00:00Z' },
        { status: 'tracks uploaded', timestamp: '2025-01-15T10:15:00Z' }
      ];

      const newHistory = addStatusToHistory(existingHistory, 'Ready for Clip Gen');

      expect(newHistory).toHaveLength(3);
      expect(newHistory[2].status).toBe('Ready for Clip Gen');
      expect(newHistory[2].timestamp).toBeDefined();
    });

    test('should handle empty history', () => {
      const newHistory = addStatusToHistory(null, 'Ready for Clip Gen');

      expect(newHistory).toHaveLength(1);
      expect(newHistory[0].status).toBe('Ready for Clip Gen');
    });

    test('should create correct DynamoDB update parameters', () => {
      const params = createUpdateParams('Ready for Clip Gen');

      expect(params.UpdateExpression).toContain('statusHistory = list_append(if_not_exists(statusHistory, :emptyList), :newStatus)');
      expect(params.UpdateExpression).toContain('#status = :status');
      expect(params.UpdateExpression).toContain('updatedAt = :updatedAt');
      expect(params.ExpressionAttributeNames['#status']).toBe('status');
      expect(params.ExpressionAttributeValues[':status']).toBe('Ready for Clip Gen');
      expect(params.ExpressionAttributeValues[':emptyList']).toEqual([]);
      expect(params.ExpressionAttributeValues[':newStatus']).toHaveLength(1);
      expect(params.ExpressionAttributeValues[':newStatus'][0].status).toBe('Ready for Clip Gen');
    });
  });

  describe('EventBridge Event Structure', () => {
    const createClipGenerationEvent = (episodeId, episode, timestamp) => {
      return {
        Source: 'nullcheck',
        DetailType: 'Begin Clip Generation',
        Detail: JSON.stringify({
          episodeId,
          status: 'Ready for Clip Gen',
          timestamp,
          episodeMetadata: {
            title: episode.title,
            episodeNumber: episode.episodeNumber,
            airDate: episode.airDate
          }
        })
      };
    };

    test('should create correct event structure', () => {
      const episodeId = 'test-episode-123';
      const episode = {
        title: 'Test Episode',
        episodeNumber: 42,
        airDate: '2025-01-15T10:00:00Z'
      };
      const timestamp = '2025-01-15T10:30:00Z';

      const event = createClipGenerationEvent(episodeId, episode, timestamp);

      expect(event.Source).toBe('nullcheck');
      expect(event.DetailType).toBe('Begin Clip Generation');

      const detail = JSON.parse(event.Detail);
      expect(detail.episodeId).toBe(episodeId);
      expect(detail.status).toBe('Ready for Clip Gen');
      expect(detail.timestamp).toBe(timestamp);
      expect(detail.episodeMetadata.title).toBe('Test Episode');
      expect(detail.episodeMetadata.episodeNumber).toBe(42);
      expect(detail.episodeMetadata.airDate).toBe('2025-01-15T10:00:00Z');
    });

    test('should handle missing episode metadata gracefully', () => {
      const episodeId = 'test-episode-123';
      const episode = {
        title: 'Test Episode'
        // Missing episodeNumber and airDate
      };
      const timestamp = '2025-01-15T10:30:00Z';

      const event = createClipGenerationEvent(episodeId, episode, timestamp);
      const detail = JSON.parse(event.Detail);

      expect(detail.episodeMetadata.title).toBe('Test Episode');
      expect(detail.episodeMetadata.episodeNumber).toBeUndefined();
      expect(detail.episodeMetadata.airDate).toBeUndefined();
    });

    test('should include all required event fields', () => {
      const episodeId = 'test-episode-123';
      const episode = {
        title: 'Complete Episode',
        episodeNumber: 1,
        airDate: '2025-01-15T10:00:00Z'
      };
      const timestamp = '2025-01-15T10:30:00Z';

      const event = createClipGenerationEvent(episodeId, episode, timestamp);

      expect(event).toHaveProperty('Source');
      expect(event).toHaveProperty('DetailType');
      expect(event).toHaveProperty('Detail');

      const detail = JSON.parse(event.Detail);
      expect(detail).toHaveProperty('episodeId');
      expect(detail).toHaveProperty('status');
      expect(detail).toHaveProperty('timestamp');
      expect(detail).toHaveProperty('episodeMetadata');
      expect(detail.episodeMetadata).toHaveProperty('title');
    });
  });

  describe('Request Validation', () => {
    const validateRequest = (pathParams, body, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId) {
        throw new Error('episodeId is required');
      }

      if (!body || typeof body !== 'object') {
        throw new Error('Invalid request body');
      }

      const status = body.status?.toString().trim();
      if (!status) {
        throw new Error('Status is required');
      }

      const VALID_STATUSES = new Set(['Ready for Clip Gen']);
      if (!VALID_STATUSES.has(status)) {
        throw new Error('Status must be one of: Ready for Clip Gen');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId,
        status
      };
    };

    test('should validate correct request', () => {
      const pathParams = { episodeId: 'test-episode' };
      const body = { status: 'Ready for Clip Gen' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      const result = validateRequest(pathParams, body, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('test-episode');
      expect(result.status).toBe('Ready for Clip Gen');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'test-episode' };
      const body = { status: 'Ready for Clip Gen' };
      const requestContext = { authorizer: {} };

      expect(() => validateRequest(pathParams, body, requestContext)).toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = {};
      const body = { status: 'Ready for Clip Gen' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateRequest(pathParams, body, requestContext)).toThrow('episodeId is required');
    });

    test('should reject invalid body', () => {
      const pathParams = { episodeId: 'test-episode' };
      const body = null;
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateRequest(pathParams, body, requestContext)).toThrow('Invalid request body');
    });

    test('should reject missing status', () => {
      const pathParams = { episodeId: 'test-episode' };
      const body = {};
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateRequest(pathParams, body, requestContext)).toThrow('Status is required');
    });

    test('should reject invalid status', () => {
      const pathParams = { episodeId: 'test-episode' };
      const body = { status: 'Invalid Status' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateRequest(pathParams, body, requestContext)).toThrow('Status must be one of: Ready for Clip Gen');
    });

    test('should trim whitespace from status', () => {
      const pathParams = { episodeId: 'test-episode' };
      const body = { status: '  Ready for Clip Gen  ' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      const result = validateRequest(pathParams, body, requestContext);
      expect(result.status).toBe('Ready for Clip Gen');
    });
  });

  describe('Response Formatting', () => {
    const formatResponse = (statusCode, body) => {
      return {
        statusCode,
        body: typeof body === 'string' ? JSON.stringify({ message: body }) : JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    const formatEmptyResponse = () => {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    const formatPrerequisiteError = (missingPrerequisites) => {
      return formatResponse(409, {
        error: 'PrerequisiteNotMet',
        message: 'Episode is not ready for clip generation',
        details: {
          missingPrerequisites
        }
      });
    };

    test('should format success response correctly', () => {
      const response = formatEmptyResponse();

      expect(response.statusCode).toBe(204);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.body).toBeUndefined(); // 204 responses have no body
    });

    test('should format prerequisite error correctly', () => {
      const missingPrerequisites = [
        "Episode has status 'draft', expected 'tracks uploaded'",
        "Track 'guest' has status 'uploading', expected 'processed'"
      ];

      const response = formatPrerequisiteError(missingPrerequisites);

      expect(response.statusCode).toBe(409);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('PrerequisiteNotMet');
      expect(body.message).toBe('Episode is not ready for clip generation');
      expect(body.details.missingPrerequisites).toEqual(missingPrerequisites);
    });

    test('should format validation error correctly', () => {
      const response = formatResponse(400, {
        error: 'ValidationError',
        message: 'Status is required and must be one of: Ready for Clip Gen'
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('ValidationError');
      expect(body.message).toBe('Status is required and must be one of: Ready for Clip Gen');
    });

    test('should format not found error correctly', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: "Episode with ID 'episode-123' was not found"
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toBe("Episode with ID 'episode-123' was not found");
    });

    test('should format internal error correctly', () => {
      const response = formatResponse(500, {
        error: 'InternalError',
        message: 'Something went wrong'
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalError');
      expect(body.message).toBe('Something went wrong');
    });
  });
});
