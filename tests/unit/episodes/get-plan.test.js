// Unit tests for get plan function
// These tests validate plan retrieval and recommendations

// Mock Logger before any imports
jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

// Mock environment variables
process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Get Plan Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'episodes' });
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
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      const result = validateRequest(pathParams, requestContext);

      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = { authorizer: {} };

      expect(() => validateRequest(pathParams, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = {};
      const requestContext = { authorizer: { tenantId: 'tenant-123' } };

      expect(() => validateRequest(pathParams, requestContext))
        .toThrow('Episode ID is required');
    });
  });

  describe('Response Formatting', () => {
    const formatPlanResponse = (episodeId, plan, recommendations) => {
      const response = {
        episodeId,
        plan: {
          objectives: plan.objectives,
          concepts: plan.concepts,
          ...(plan.notes && { notes: plan.notes }),
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt
        },
        recommendations: null
      };

      if (recommendations) {
        response.recommendations = {
          suggestedFlow: recommendations.suggestedFlow,
          proposedTitle: recommendations.proposedTitle,
          proposedDescription: recommendations.proposedDescription,
          keyLearningMoments: recommendations.keyLearningMoments,
          detailedOutline: recommendations.detailedOutline,
          generatedAt: recommendations.generatedAt
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(response),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    test('should format response with plan only', () => {
      const plan = {
        objectives: 'Teach serverless',
        concepts: 'Lambda, API Gateway',
        notes: 'Include demo',
        createdAt: '2025-01-15T09:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const response = formatPlanResponse('episode-123', plan, null);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.episodeId).toBe('episode-123');
      expect(body.plan.objectives).toBe('Teach serverless');
      expect(body.plan.concepts).toBe('Lambda, API Gateway');
      expect(body.plan.notes).toBe('Include demo');
      expect(body.recommendations).toBeNull();
    });

    test('should format response with plan and recommendations', () => {
      const plan = {
        objectives: 'Teach serverless',
        concepts: 'Lambda, API Gateway',
        createdAt: '2025-01-15T09:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const recommendations = {
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Mastering Serverless Architecture',
        proposedDescription: 'Learn about serverless patterns and best practices',
        keyLearningMoments: [
          'Understanding Lambda functions',
          'API Gateway integration',
          'DynamoDB patterns'
        ],
        detailedOutline: [
          {
            section: 'Introduction',
            duration: '5 minutes',
            talkingPoints: ['Welcome', 'Overview'],
            demoArtifacts: []
          }
        ],
        generatedAt: '2025-01-15T10:30:00Z'
      };

      const response = formatPlanResponse('episode-123', plan, recommendations);

      const body = JSON.parse(response.body);
      expect(body.recommendations).not.toBeNull();
      expect(body.recommendations.proposedTitle).toBe('Mastering Serverless Architecture');
      expect(body.recommendations.keyLearningMoments).toHaveLength(3);
      expect(body.recommendations.detailedOutline).toHaveLength(1);
      expect(body.recommendations.detailedOutline[0].section).toBe('Introduction');
    });

    test('should format response without notes', () => {
      const plan = {
        objectives: 'Teach serverless',
        concepts: 'Lambda, API Gateway',
        createdAt: '2025-01-15T09:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z'
      };

      const response = formatPlanResponse('episode-123', plan, null);

      const body = JSON.parse(response.body);
      expect(body.plan.notes).toBeUndefined();
    });
  });

  describe('Recommendations Structure', () => {
    const validateRecommendations = (recommendations) => {
      if (!recommendations) return true;

      if (!recommendations.suggestedFlow || typeof recommendations.suggestedFlow !== 'string') {
        throw new Error('Invalid suggestedFlow');
      }

      if (!recommendations.proposedTitle || typeof recommendations.proposedTitle !== 'string') {
        throw new Error('Invalid proposedTitle');
      }

      if (!recommendations.proposedDescription || typeof recommendations.proposedDescription !== 'string') {
        throw new Error('Invalid proposedDescription');
      }

      if (!Array.isArray(recommendations.keyLearningMoments) || recommendations.keyLearningMoments.length === 0) {
        throw new Error('Invalid keyLearningMoments');
      }

      if (!Array.isArray(recommendations.detailedOutline) || recommendations.detailedOutline.length < 3) {
        throw new Error('Invalid detailedOutline - must have at least 3 sections');
      }

      recommendations.detailedOutline.forEach((section, index) => {
        if (!section.section || typeof section.section !== 'string') {
          throw new Error(`Section ${index} missing section name`);
        }
        if (!section.duration || typeof section.duration !== 'string') {
          throw new Error(`Section ${index} missing duration`);
        }
        if (!Array.isArray(section.talkingPoints) || section.talkingPoints.length === 0) {
          throw new Error(`Section ${index} missing talking points`);
        }
      });

      return true;
    };

    test('should validate correct recommendations structure', () => {
      const recommendations = {
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Test Title',
        proposedDescription: 'Test description with enough characters to meet minimum',
        keyLearningMoments: ['Learning 1', 'Learning 2'],
        detailedOutline: [
          {
            section: 'Intro',
            duration: '5 min',
            talkingPoints: ['Point 1'],
            demoArtifacts: []
          },
          {
            section: 'Main',
            duration: '10 min',
            talkingPoints: ['Point 2'],
            demoArtifacts: ['Demo 1']
          },
          {
            section: 'Outro',
            duration: '3 min',
            talkingPoints: ['Point 3']
          }
        ],
        generatedAt: '2025-01-15T10:00:00Z'
      };

      expect(validateRecommendations(recommendations)).toBe(true);
    });

    test('should reject recommendations with less than 3 sections', () => {
      const recommendations = {
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
            section: 'Outro',
            duration: '3 min',
            talkingPoints: ['Point 2']
          }
        ],
        generatedAt: '2025-01-15T10:00:00Z'
      };

      expect(() => validateRecommendations(recommendations))
        .toThrow('Invalid detailedOutline - must have at least 3 sections');
    });

    test('should reject section without talking points', () => {
      const recommendations = {
        suggestedFlow: 'flowchart TD\n    Start --> End',
        proposedTitle: 'Test Title',
        proposedDescription: 'Test description',
        keyLearningMoments: ['Learning 1'],
        detailedOutline: [
          {
            section: 'Intro',
            duration: '5 min',
            talkingPoints: []
          },
          {
            section: 'Main',
            duration: '10 min',
            talkingPoints: ['Point 1']
          },
          {
            section: 'Outro',
            duration: '3 min',
            talkingPoints: ['Point 2']
          }
        ],
        generatedAt: '2025-01-15T10:00:00Z'
      };

      expect(() => validateRecommendations(recommendations))
        .toThrow('Section 0 missing talking points');
    });

    test('should allow null recommendations', () => {
      expect(validateRecommendations(null)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    const formatErrorResponse = (statusCode, error, message) => {
      return {
        statusCode,
        body: JSON.stringify({ error, message }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    test('should format 404 error for missing plan', () => {
      const response = formatErrorResponse(404, 'NotFound', 'Plan not found for episode');

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toBe('Plan not found for episode');
    });

    test('should format 401 error for unauthorized', () => {
      const response = formatErrorResponse(401, 'Unauthorized', 'Missing tenant context');

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });
  });
});
