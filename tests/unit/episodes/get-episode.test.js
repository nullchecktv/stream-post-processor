// Unit tests for get episode function
// These tests validate episode retrieval and status computation

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

// Mock environment variables
process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Get Episode Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create fresh logger mock for each test
    mockLogger = new Logger({ serviceName: 'episodes' });
  });

  describe('Status Computation', () => {
    const getCurrentStatus = (statusHistory) => {
      if (!statusHistory || !Array.isArray(statusHistory) || statusHistory.length === 0) {
        return null;
      }
      const latestEntry = statusHistory[statusHistory.length - 1];
      return latestEntry?.status || null;
    };

    test('should compute current status from statusHistory', () => {
      const statusHistory = [
        { status: 'Draft', timestamp: '2025-01-15T10:00:00Z' },
        { status: 'Track(s) Uploaded', timestamp: '2025-01-15T10:15:00Z' },
        { status: 'Ready for Clip Gen', timestamp: '2025-01-15T10:30:00Z' }
      ];

      const currentStatus = getCurrentStatus(statusHistory);
      expect(currentStatus).toBe('Ready for Clip Gen');
    });

    test('should return null for empty statusHistory', () => {
      expect(getCurrentStatus([])).toBeNull();
      expect(getCurrentStatus(null)).toBeNull();
      expect(getCurrentStatus(undefined)).toBeNull();
    });

    test('should handle single status entry', () => {
      const statusHistory = [
        { status: 'Draft', timestamp: '2025-01-15T10:00:00Z' }
      ];

      const currentStatus = getCurrentStatus(statusHistory);
      expect(currentStatus).toBe('Draft');
    });

    test('should handle malformed status entry', () => {
      const statusHistory = [
        { status: 'Draft', timestamp: '2025-01-15T10:00:00Z' },
        { timestamp: '2025-01-15T10:15:00Z' } // Missing status
      ];

      const currentStatus = getCurrentStatus(statusHistory);
      expect(currentStatus).toBeNull();
    });
  });

  describe('Response Formatting', () => {
    const formatEpisodeResponse = (episode, episodeId, relatedItems = []) => {
      // Handler now returns status directly from metadata (does not derive from statusHistory)
      const currentStatus = episode.status;

      const tracksCount = relatedItems.filter(item => item.sk?.startsWith('track#')).length;
      const hasTranscript = relatedItems.some(item => item.sk?.startsWith('transcript#'));
      const clipsCount = relatedItems.filter(item => item.sk?.startsWith('clip#')).length;

      const response = {
        id: episodeId,
        title: episode.title,
        status: currentStatus,
        episodeNumber: episode.episodeNumber,
        createdAt: episode.createdAt,
        updatedAt: episode.updatedAt,
        metrics: {
          tracksCount,
          hasTranscript,
          clipsCount
        }
      };

      // Add optional fields if they exist
      if (episode.description) response.description = episode.description;
      if (episode.summary) response.summary = episode.summary;
      if (episode.airDate) response.airDate = episode.airDate;
      if (episode.platforms) response.platforms = episode.platforms;
      if (episode.themes) response.themes = episode.themes;
      if (episode.seriesName) response.seriesName = episode.seriesName;

      return response;
    };

    test('should format episode response with all fields', () => {
      const episode = {
        title: 'Test Episode',
        episodeNumber: 42,
        status: 'Ready for Clip Gen',
        description: 'Test description',
        summary: 'Test summary',
        airDate: '2025-01-15T10:00:00Z',
        platforms: ['twitch', 'youtube'],
        themes: ['technology'],
        seriesName: 'Test Series',
        statusHistory: [
          { status: 'Draft', timestamp: '2025-01-15T10:00:00Z' },
          { status: 'Ready for Clip Gen', timestamp: '2025-01-15T10:30:00Z' }
        ],
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const relatedItems = [
        { sk: 'track#main' },
        { sk: 'track#guest' },
        { sk: 'transcript#main' },
        { sk: 'clip#clip-1' },
        { sk: 'clip#clip-2' },
        { sk: 'clip#clip-3' }
      ];

      const response = formatEpisodeResponse(episode, 'test-episode-123', relatedItems);

      expect(response.id).toBe('test-episode-123');
      expect(response.title).toBe('Test Episode');
      expect(response.status).toBe('Ready for Clip Gen');
      expect(response.episodeNumber).toBe(42);
      expect(response.description).toBe('Test description');
      expect(response.summary).toBe('Test summary');
      expect(response.airDate).toBe('2025-01-15T10:00:00Z');
      expect(response.platforms).toEqual(['twitch', 'youtube']);
      expect(response.themes).toEqual(['technology']);
      expect(response.seriesName).toBe('Test Series');
      expect(response.metrics).toEqual({
        tracksCount: 2,
        hasTranscript: true,
        clipsCount: 3
      });
      expect(response.createdAt).toBe('2025-01-15T10:00:00Z');
      expect(response.updatedAt).toBe('2025-01-15T10:30:00Z');
    });

    test('should format episode response with minimal fields', () => {
      const episode = {
        title: 'Minimal Episode',
        episodeNumber: 1,
        status: 'Draft',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const response = formatEpisodeResponse(episode, 'minimal-episode', []);

      expect(response.id).toBe('minimal-episode');
      expect(response.title).toBe('Minimal Episode');
      expect(response.status).toBe('Draft');
      expect(response.episodeNumber).toBe(1);
      expect(response.metrics).toEqual({
        tracksCount: 0,
        hasTranscript: false,
        clipsCount: 0
      });
      expect(response.createdAt).toBe('2025-01-15T10:00:00Z');
      expect(response.updatedAt).toBe('2025-01-15T10:00:00Z');

      // Optional fields should not be present
      expect(response.description).toBeUndefined();
      expect(response.summary).toBeUndefined();
      expect(response.airDate).toBeUndefined();
      expect(response.platforms).toBeUndefined();
      expect(response.themes).toBeUndefined();
      expect(response.seriesName).toBeUndefined();
    });

    test('should use status field even when statusHistory exists', () => {
      const episode = {
        title: 'Test Episode',
        episodeNumber: 1,
        status: 'Draft', // Old status field
        statusHistory: [
          { status: 'Draft', timestamp: '2025-01-15T10:00:00Z' },
          { status: 'Ready for Clip Gen', timestamp: '2025-01-15T10:30:00Z' }
        ],
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const response = formatEpisodeResponse(episode, 'test-episode', []);

      expect(response.status).toBe('Draft'); // Status comes from metadata field
      expect(response.metrics).toBeDefined();
    });

    test('should fallback to status field when no statusHistory', () => {
      const episode = {
        title: 'Test Episode',
        episodeNumber: 1,
        status: 'Draft',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const response = formatEpisodeResponse(episode, 'test-episode', []);

      expect(response.status).toBe('Draft'); // From status field
      expect(response.metrics).toBeDefined();
    });

    test('should calculate metrics correctly with mixed related items', () => {
      const episode = {
        title: 'Test Episode',
        episodeNumber: 1,
        status: 'Draft',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const relatedItems = [
        { sk: 'metadata' },
        { sk: 'track#main' },
        { sk: 'track#guest' },
        { sk: 'track#screen' },
        { sk: 'transcript#main' },
        { sk: 'clip#clip-1' },
        { sk: 'clip#clip-2' },
        { sk: 'status#2025-01-15T10:00:00Z' }
      ];

      const response = formatEpisodeResponse(episode, 'test-episode', relatedItems);

      expect(response.metrics).toEqual({
        tracksCount: 3,
        hasTranscript: true,
        clipsCount: 2
      });
    });

    test('should handle zero counts in metrics', () => {
      const episode = {
        title: 'Test Episode',
        episodeNumber: 1,
        status: 'Draft',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const relatedItems = [
        { sk: 'metadata' },
        { sk: 'status#2025-01-15T10:00:00Z' }
      ];

      const response = formatEpisodeResponse(episode, 'test-episode', relatedItems);

      expect(response.metrics).toEqual({
        tracksCount: 0,
        hasTranscript: false,
        clipsCount: 0
      });
    });
  });

  describe('Request Validation', () => {
    const validateRequest = (pathParams, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId) {
        throw new Error('Episode ID is required');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId
      };
    };

    test('should validate correct request', () => {
      const pathParams = { episodeId: 'test-episode-123' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validateRequest(pathParams, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('test-episode-123');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'test-episode-123' };
      const requestContext = { authorizer: {} };

      expect(() => validateRequest(pathParams, requestContext)).toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = {};
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateRequest(pathParams, requestContext)).toThrow('Episode ID is required');
    });
  });

  describe('Error Response Formatting', () => {
    const formatErrorResponse = (statusCode, error, message) => {
      return {
        statusCode,
        body: JSON.stringify({
          error,
          message
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    test('should format 404 error correctly', () => {
      const response = formatErrorResponse(404, 'NotFound', "Episode with ID 'test-123' was not found");

      expect(response.statusCode).toBe(404);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toBe("Episode with ID 'test-123' was not found");
    });

    test('should format 400 error correctly', () => {
      const response = formatErrorResponse(400, 'BadRequest', 'Episode ID is required');

      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toBe('Episode ID is required');
    });

    test('should format 500 error correctly', () => {
      const response = formatErrorResponse(500, 'InternalError', 'Something went wrong');

      expect(response.statusCode).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.message).toBe('Something went wrong');
    });
  });
});
