// Unit tests for set plan recommendations tool
// These tests validate AI-generated recommendations storage

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

// Mock environment variables
process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Set Plan Recommendations Tool', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'tools' });
  });

  describe('Tool Schema Validation', () => {
    const validateRecommendations = (data) => {
      if (!data.episodeId || typeof data.episodeId !== 'string') {
        throw new Error('episodeId is required');
      }

      if (!data.suggestedFlow || typeof data.suggestedFlow !== 'string') {
        throw new Error('suggestedFlow is required');
      }

      if (!data.suggestedFlow.startsWith('flowchart')) {
        throw new Error('suggestedFlow must start with "flowchart"');
      }

      if (!data.proposedTitle || typeof data.proposedTitle !== 'string') {
        throw new Error('proposedTitle is required');
      }

      if (data.proposedTitle.length < 10 || data.proposedTitle.length > 200) {
        throw new Error('proposedTitle must be 10-200 characters');
      }

      if (!data.proposedDescription || typeof data.proposedDescription !== 'string') {
        throw new Error('proposedDescription is required');
      }

      if (data.proposedDescription.length < 50 || data.proposedDescription.length > 1000) {
        throw new Error('proposedDescription must be 50-1000 characters');
      }

      if (!Array.isArray(data.keyLearningMoments) || data.keyLearningMoments.length === 0) {
        throw new Error('keyLearningMoments must be a non-empty array');
      }

      if (!Array.isArray(data.detailedOutline) || data.detailedOutline.length < 3) {
        throw new Error('detailedOutline must have at least 3 sections');
      }

      data.detailedOutline.forEach((section, index) => {
        if (!section.section || typeof section.section !== 'string') {
          throw new Error(`Section ${index} missing section name`);
        }
        if (!section.duration || typeof section.duration !== 'string') {
          throw new Error(`Section ${index} missing duration`);
        }
        if (!Array.isArray(section.talkingPoints) || section.talkingPoints.length === 0) {
          throw new Error(`Section ${index} must have at least one talking point`);
        }
      });

      return true;
    };

    test('should validate correct recommendations', () => {
      const data = {
        episodeId: 'episode-123',
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Mastering Serverless Architecture',
        proposedDescription: 'Join us for an in-depth exploration of serverless architecture patterns and best practices',
        keyLearningMoments: [
          'Understanding Lambda functions',
          'API Gateway integration'
        ],
        detailedOutline: [
          {
            section: 'Introduction',
            duration: '5 minutes',
            talkingPoints: ['Welcome', 'Overview'],
            demoArtifacts: []
          },
          {
            section: 'Main Content',
            duration: '15 minutes',
            talkingPoints: ['Concept 1', 'Concept 2'],
            demoArtifacts: ['Code example']
          },
          {
            section: 'Conclusion',
            duration: '3 minutes',
            talkingPoints: ['Recap', 'Next steps']
          }
        ]
      };

      expect(validateRecommendations(data)).toBe(true);
    });

    test('should reject flowchart not starting with "flowchart"', () => {
      const data = {
        episodeId: 'episode-123',
        suggestedFlow: 'sequenceDiagram\n    A->>B: Message',
        proposedTitle: 'Test Title Here',
        proposedDescription: 'This is a test description that meets the minimum character requirement',
        keyLearningMoments: ['Learning 1'],
        detailedOutline: [
          { section: 'S1', duration: '5m', talkingPoints: ['P1'] },
          { section: 'S2', duration: '5m', talkingPoints: ['P2'] },
          { section: 'S3', duration: '5m', talkingPoints: ['P3'] }
        ]
      };

      expect(() => validateRecommendations(data))
        .toThrow('suggestedFlow must start with "flowchart"');
    });

    test('should reject title too short', () => {
      const data = {
        episodeId: 'episode-123',
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Short',
        proposedDescription: 'This is a test description that meets the minimum character requirement',
        keyLearningMoments: ['Learning 1'],
        detailedOutline: [
          { section: 'S1', duration: '5m', talkingPoints: ['P1'] },
          { section: 'S2', duration: '5m', talkingPoints: ['P2'] },
          { section: 'S3', duration: '5m', talkingPoints: ['P3'] }
        ]
      };

      expect(() => validateRecommendations(data))
        .toThrow('proposedTitle must be 10-200 characters');
    });

    test('should reject description too short', () => {
      const data = {
        episodeId: 'episode-123',
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Valid Title Here',
        proposedDescription: 'Too short',
        keyLearningMoments: ['Learning 1'],
        detailedOutline: [
          { section: 'S1', duration: '5m', talkingPoints: ['P1'] },
          { section: 'S2', duration: '5m', talkingPoints: ['P2'] },
          { section: 'S3', duration: '5m', talkingPoints: ['P3'] }
        ]
      };

      expect(() => validateRecommendations(data))
        .toThrow('proposedDescription must be 50-1000 characters');
    });

    test('should reject less than 3 sections', () => {
      const data = {
        episodeId: 'episode-123',
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Valid Title Here',
        proposedDescription: 'This is a valid description that meets the minimum character requirement for testing',
        keyLearningMoments: ['Learning 1'],
        detailedOutline: [
          { section: 'S1', duration: '5m', talkingPoints: ['P1'] },
          { section: 'S2', duration: '5m', talkingPoints: ['P2'] }
        ]
      };

      expect(() => validateRecommendations(data))
        .toThrow('detailedOutline must have at least 3 sections');
    });

    test('should reject section without talking points', () => {
      const data = {
        episodeId: 'episode-123',
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Valid Title Here',
        proposedDescription: 'This is a valid description that meets the minimum character requirement for testing',
        keyLearningMoments: ['Learning 1'],
        detailedOutline: [
          { section: 'S1', duration: '5m', talkingPoints: [] },
          { section: 'S2', duration: '5m', talkingPoints: ['P2'] },
          { section: 'S3', duration: '5m', talkingPoints: ['P3'] }
        ]
      };

      expect(() => validateRecommendations(data))
        .toThrow('Section 0 must have at least one talking point');
    });
  });

  describe('Recommendations Item Creation', () => {
    const createRecommendationsItem = (tenantId, episodeId, data, timestamp) => {
      return {
        pk: `${tenantId}#${episodeId}`,
        sk: 'recommendations',
        suggestedFlow: data.suggestedFlow,
        proposedTitle: data.proposedTitle,
        proposedDescription: data.proposedDescription,
        keyLearningMoments: data.keyLearningMoments,
        detailedOutline: data.detailedOutline,
        generatedAt: timestamp
      };
    };

    test('should create recommendations item', () => {
      const data = {
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Test Title',
        proposedDescription: 'Test description',
        keyLearningMoments: ['Learning 1', 'Learning 2'],
        detailedOutline: [
          {
            section: 'Intro',
            duration: '5 min',
            talkingPoints: ['Point 1'],
            demoArtifacts: ['Demo 1']
          },
          {
            section: 'Main',
            duration: '10 min',
            talkingPoints: ['Point 2', 'Point 3']
          },
          {
            section: 'Outro',
            duration: '3 min',
            talkingPoints: ['Point 4']
          }
        ]
      };

      const timestamp = '2025-01-15T10:00:00Z';
      const item = createRecommendationsItem('tenant-123', 'episode-123', data, timestamp);

      expect(item.pk).toBe('tenant-123#episode-123');
      expect(item.sk).toBe('recommendations');
      expect(item.suggestedFlow).toBe(data.suggestedFlow);
      expect(item.proposedTitle).toBe(data.proposedTitle);
      expect(item.keyLearningMoments).toHaveLength(2);
      expect(item.detailedOutline).toHaveLength(3);
      expect(item.detailedOutline[0].demoArtifacts).toEqual(['Demo 1']);
      expect(item.generatedAt).toBe(timestamp);
    });

    test('should handle sections without demoArtifacts', () => {
      const data = {
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Test Title',
        proposedDescription: 'Test description',
        keyLearningMoments: ['Learning 1'],
        detailedOutline: [
          {
            section: 'Intro',
            duration: '5 min',
            talkingPoints: ['Point 1']
          },
          {
            section: 'Main',
            duration: '10 min',
            talkingPoints: ['Point 2']
          },
          {
            section: 'Outro',
            duration: '3 min',
            talkingPoints: ['Point 3']
          }
        ]
      };

      const timestamp = '2025-01-15T10:00:00Z';
      const item = createRecommendationsItem('tenant-123', 'episode-123', data, timestamp);

      expect(item.detailedOutline[0].demoArtifacts).toBeUndefined();
    });
  });

  describe('Status Update', () => {
    const addStatusEntry = (statusHistory, status, timestamp) => {
      const history = statusHistory || [];
      return [
        ...history,
        {
          status,
          timestamp
        }
      ];
    };

    test('should add recommendations_generated status', () => {
      const existingHistory = [
        { status: 'draft', timestamp: '2025-01-15T09:00:00Z' },
        { status: 'plan_added', timestamp: '2025-01-15T09:30:00Z' }
      ];
      const timestamp = '2025-01-15T10:00:00Z';

      const history = addStatusEntry(existingHistory, 'recommendations_generated', timestamp);

      expect(history).toHaveLength(3);
      expect(history[2]).toEqual({
        status: 'recommendations_generated',
        timestamp
      });
    });
  });

  describe('Tool Response', () => {
    const formatToolResponse = (episodeId, success = true) => {
      if (success) {
        return `Successfully stored recommendations for episode ${episodeId}`;
      }
      return 'Something went wrong while storing recommendations';
    };

    test('should format success response', () => {
      const response = formatToolResponse('episode-123', true);
      expect(response).toBe('Successfully stored recommendations for episode episode-123');
    });

    test('should format error response', () => {
      const response = formatToolResponse('episode-123', false);
      expect(response).toBe('Something went wrong while storing recommendations');
    });
  });
});
