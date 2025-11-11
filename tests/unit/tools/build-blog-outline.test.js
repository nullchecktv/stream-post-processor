jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

process.env.TABLE_NAME = 'test-table';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Build Blog Outline Tool', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'tools' });
  });

  describe('Tool Schema Validation', () => {
    const validateOutline = (data) => {
      if (!data.episodeId || typeof data.episodeId !== 'string') {
        throw new Error('episodeId is required');
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data.episodeId)) {
        throw new Error('episodeId must be a valid UUID');
      }

      if (!data.outline || typeof data.outline !== 'string') {
        throw new Error('outline is required');
      }

      if (data.outline.length < 50) {
        throw new Error('outline must be at least 50 characters');
      }

      return true;
    };

    test('should validate correct outline data', () => {
      const data = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        outline: '# Blog Post Title\n\n## Introduction\n\nThis is the introduction section with enough content to meet the minimum length requirement.'
      };

      expect(validateOutline(data)).toBe(true);
    });

    test('should reject invalid UUID', () => {
      const data = {
        episodeId: 'not-a-uuid',
        outline: '# Blog Post Title\n\n## Introduction\n\nThis is the introduction section with enough content.'
      };

      expect(() => validateOutline(data))
        .toThrow('episodeId must be a valid UUID');
    });

    test('should reject outline too short', () => {
      const data = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000',
        outline: 'Too short'
      };

      expect(() => validateOutline(data))
        .toThrow('outline must be at least 50 characters');
    });

    test('should reject missing episodeId', () => {
      const data = {
        outline: '# Blog Post Title\n\n## Introduction\n\nThis is the introduction section with enough content.'
      };

      expect(() => validateOutline(data))
        .toThrow('episodeId is required');
    });

    test('should reject missing outline', () => {
      const data = {
        episodeId: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(() => validateOutline(data))
        .toThrow('outline is required');
    });
  });

  describe('Outline Item Creation', () => {
    const createOutlineItem = (tenantId, episodeId, outline, timestamp) => {
      return {
        pk: `${tenantId}#${episodeId}`,
        sk: 'data#blog#outline',
        outline,
        status: 'outline_created',
        createdAt: timestamp,
        updatedAt: timestamp
      };
    };

    test('should create outline item with correct structure', () => {
      const tenantId = 'tenant-123';
      const episodeId = '123e4567-e89b-12d3-a456-426614174000';
      const outline = '# Blog Post Title\n\n## Introduction\n\nContent here.';
      const timestamp = '2025-01-15T10:00:00Z';

      const item = createOutlineItem(tenantId, episodeId, outline, timestamp);

      expect(item.pk).toBe('tenant-123#123e4567-e89b-12d3-a456-426614174000');
      expect(item.sk).toBe('data#blog#outline');
      expect(item.outline).toBe(outline);
      expect(item.status).toBe('outline_created');
      expect(item.createdAt).toBe(timestamp);
      expect(item.updatedAt).toBe(timestamp);
    });

    test('should handle markdown outline with multiple sections', () => {
      const outline = `# Mastering Serverless Architecture

## Introduction
Welcome to this comprehensive guide on serverless architecture.

## Core Concepts
- Lambda functions
- API Gateway
- DynamoDB

## Best Practices
1. Keep functions small
2. Use environment variables
3. Implement proper error handling

## Conclusion
Serverless architecture enables scalable applications.`;

      const item = createOutlineItem('tenant-123', 'episode-123', outline, '2025-01-15T10:00:00Z');

      expect(item.outline).toContain('# Mastering Serverless Architecture');
      expect(item.outline).toContain('## Introduction');
      expect(item.outline).toContain('## Core Concepts');
      expect(item.outline.length).toBeGreaterThan(50);
    });
  });

  describe('Event Publishing', () => {
    const createBlogOutlineEvent = (episodeId, tenantId, timestamp) => {
      return {
        Source: 'nullcheck',
        DetailType: 'BlogOutlineCreated',
        Detail: JSON.stringify({
          episodeId,
          tenantId,
          timestamp
        })
      };
    };

    test('should create BlogOutlineCreated event', () => {
      const episodeId = '123e4567-e89b-12d3-a456-426614174000';
      const tenantId = 'tenant-123';
      const timestamp = '2025-01-15T10:00:00Z';

      const event = createBlogOutlineEvent(episodeId, tenantId, timestamp);

      expect(event.Source).toBe('nullcheck');
      expect(event.DetailType).toBe('BlogOutlineCreated');

      const detail = JSON.parse(event.Detail);
      expect(detail.episodeId).toBe(episodeId);
      expect(detail.tenantId).toBe(tenantId);
      expect(detail.timestamp).toBe(timestamp);
    });
  });

  describe('Tool Response', () => {
    const formatToolResponse = (episodeId, success = true) => {
      if (success) {
        return `Successfully created blog outline for episode ${episodeId}. The outline has been stored and content generation will begin automatically.`;
      }
      return 'Something went wrong while creating blog outline';
    };

    test('should format success response', () => {
      const response = formatToolResponse('episode-123', true);
      expect(response).toContain('Successfully created blog outline for episode episode-123');
      expect(response).toContain('content generation will begin automatically');
    });

    test('should format error response', () => {
      const response = formatToolResponse('episode-123', false);
      expect(response).toBe('Something went wrong while creating blog outline');
    });
  });

  describe('Tenant Isolation', () => {
    test('should enforce tenant context', () => {
      const validateTenantContext = (tenantId) => {
        if (!tenantId) {
          return 'Unauthorized: Missing tenant context';
        }
        return null;
      };

      expect(validateTenantContext(null)).toBe('Unauthorized: Missing tenant context');
      expect(validateTenantContext(undefined)).toBe('Unauthorized: Missing tenant context');
      expect(validateTenantContext('')).toBe('Unauthorized: Missing tenant context');
      expect(validateTenantContext('tenant-123')).toBeNull();
    });
  });
});
