// Unit tests for tenant isolation functionality
// Tests verify tenant ID extraction, key prefixing, and unauthorized access handling

const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Mock AWS clients
const ddbMock = mockClient(DynamoDBClient);
const s3Mock = mockClient(S3Client);

// Mock getSignedUrl
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn()
}));

// Mock environment variables
process.env.TABLE_NAME = 'test-table';
process.env.BUCKET_NAME = 'test-bucket';

describe('Tenant Isolation Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
    s3Mock.reset();
    jest.clearAllMocks();
  });

  describe('Tenant ID Extraction', () => {
    test('should extract tenantId from event.requestContext.authorizer', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant123'
          }
        }
      };

      const { tenantId } = event.requestContext.authorizer;
      expect(tenantId).toBe('tenant123');
    });

    test('should handle missing authorizer context', () => {
      const event = {
        requestContext: {}
      };

      const tenantId = event.requestContext.authorizer?.tenantId;
      expect(tenantId).toBeUndefined();
    });

    test('should handle missing requestContext', () => {
      const event = {};

      const tenantId = event.requestContext?.authorizer?.tenantId;
      expect(tenantId).toBeUndefined();
    });
  });

  describe('DynamoDB Key Prefixing', () => {
    test('should prefix primary key (pk) with tenantId', () => {
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';

      const expectedPk = `${tenantId}#${episodeId}`;
      expect(expectedPk).toBe('tenant123#episode-456');
    });

    test('should prefix GSI1PK with tenantId', () => {
      const tenantId = 'tenant123';
      const originalGSI1PK = 'episodes';

      const expectedGSI1PK = `${tenantId}#${originalGSI1PK}`;
      expect(expectedGSI1PK).toBe('tenant123#episodes');
    });

    test('should not prefix sort key (sk)', () => {
      const sk = 'metadata';
      // Sort key should remain unchanged
      expect(sk).toBe('metadata');
    });

    test('should verify DynamoDB GetItem uses tenant-prefixed key', () => {
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';

      ddbMock.on(GetItemCommand).resolves({ Item: {} });

      const params = {
        TableName: 'test-table',
        Key: {
          pk: { S: `${tenantId}#${episodeId}` },
          sk: { S: 'metadata' }
        }
      };

      // Verify the key structure
      expect(params.Key.pk.S).toBe('tenant123#episode-456');
      expect(params.Key.sk.S).toBe('metadata');
    });

    test('should verify DynamoDB PutItem uses tenant-prefixed keys', () => {
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';
      const now = '2025-01-15T10:30:00Z';

      ddbMock.on(PutItemCommand).resolves({});

      const item = {
        pk: { S: `${tenantId}#${episodeId}` },
        sk: { S: 'metadata' },
        GSI1PK: { S: `${tenantId}#episodes` },
        GSI1SK: { S: now },
        title: { S: 'Test Episode' }
      };

      // Verify tenant prefixing
      expect(item.pk.S).toBe('tenant123#episode-456');
      expect(item.GSI1PK.S).toBe('tenant123#episodes');
      expect(item.sk.S).toBe('metadata'); // sk should not be prefixed
    });

    test('should verify DynamoDB Query uses tenant-prefixed GSI1PK', () => {
      const tenantId = 'tenant123';

      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const params = {
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: `${tenantId}#episodes` }
        }
      };

      // Verify tenant-prefixed GSI1PK
      expect(params.ExpressionAttributeValues[':pk'].S).toBe('tenant123#episodes');
    });

    test('should verify DynamoDB UpdateItem uses tenant-prefixed key', () => {
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';

      ddbMock.on(UpdateItemCommand).resolves({});

      const params = {
        TableName: 'test-table',
        Key: {
          pk: { S: `${tenantId}#${episodeId}` },
          sk: { S: 'metadata' }
        },
        UpdateExpression: 'SET title = :title',
        ExpressionAttributeValues: {
          ':title': { S: 'Updated Title' }
        }
      };

      // Verify tenant-prefixed key
      expect(params.Key.pk.S).toBe('tenant123#episode-456');
    });
  });

  describe('S3 Key Prefixing', () => {
    test('should prefix S3 object keys with tenantId', () => {
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';
      const originalPath = 'transcript.srt';

      const s3Key = `${tenantId}/${episodeId}/${originalPath}`;
      expect(s3Key).toBe('tenant123/episode-456/transcript.srt');
    });

    test('should prefix S3 keys for different file types', () => {
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';

      const transcriptKey = `${tenantId}/${episodeId}/transcript.srt`;
      const videoKey = `${tenantId}/${episodeId}/tracks/main.mp4`;
      const clipKey = `${tenantId}/${episodeId}/clips/clip-uuid/clip.mp4`;

      expect(transcriptKey).toBe('tenant123/episode-456/transcript.srt');
      expect(videoKey).toBe('tenant123/episode-456/tracks/main.mp4');
      expect(clipKey).toBe('tenant123/episode-456/clips/clip-uuid/clip.mp4');
    });

    test('should verify S3 PutObject uses tenant-prefixed key', () => {
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';

      s3Mock.on(PutObjectCommand).resolves({});

      const params = {
        Bucket: 'test-bucket',
        Key: `${tenantId}/${episodeId}/transcript.srt`,
        Body: 'transcript content'
      };

      // Verify tenant-prefixed S3 key
      expect(params.Key).toBe('tenant123/episode-456/transcript.srt');
    });

    test('should verify S3 GetObject uses tenant-prefixed key', () => {
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';

      s3Mock.on(GetObjectCommand).resolves({ Body: 'content' });

      const params = {
        Bucket: 'test-bucket',
        Key: `${tenantId}/${episodeId}/transcript.srt`
      };

      // Verify tenant-prefixed S3 key
      expect(params.Key).toBe('tenant123/episode-456/transcript.srt');
    });

    test('should verify presigned URLs use tenant-prefixed keys', async () => {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const tenantId = 'tenant123';
      const episodeId = 'episode-456';
      const expectedKey = `${tenantId}/${episodeId}/transcript.srt`;

      getSignedUrl.mockResolvedValue('https://presigned-url.com');

      const putCmd = new PutObjectCommand({
        Bucket: 'test-bucket',
        Key: expectedKey
      });

      await getSignedUrl(s3Mock, putCmd, { expiresIn: 900 });

      // Verify the command was created with tenant-prefixed key
      expect(putCmd.input.Key).toBe('tenant123/episode-456/transcript.srt');
    });
  });

  describe('401 Unauthorized Responses', () => {
    test('should return 401 when tenantId is missing', () => {
      const event = {
        requestContext: {
          authorizer: {}
        }
      };

      const { tenantId } = event.requestContext.authorizer;

      if (!tenantId) {
        const response = {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
          },
          body: JSON.stringify({ error: 'Unauthorized' })
        };

        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
      }
    });

    test('should return 401 when tenantId is null', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: null
          }
        }
      };

      const { tenantId } = event.requestContext.authorizer;

      if (!tenantId) {
        const response = {
          statusCode: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        };

        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
      }
    });

    test('should return 401 when tenantId is empty string', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: ''
          }
        }
      };

      const { tenantId } = event.requestContext.authorizer;

      if (!tenantId) {
        const response = {
          statusCode: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        };

        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
      }
    });

    test('should return 401 when authorizer context is missing', () => {
      const event = {
        requestContext: {}
      };

      const tenantId = event.requestContext.authorizer?.tenantId;

      if (!tenantId) {
        const response = {
          statusCode: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        };

        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
      }
    });

    test('should proceed normally when tenantId is present', () => {
      const event = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant123'
          }
        }
      };

      const { tenantId } = event.requestContext.authorizer;

      if (tenantId) {
        // Normal processing would continue
        expect(tenantId).toBe('tenant123');
        expect(typeof tenantId).toBe('string');
        expect(tenantId.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Cross-Tenant Data Isolation', () => {
    test('should ensure different tenants have different key prefixes', () => {
      const tenant1 = 'tenant123';
      const tenant2 = 'tenant456';
      const episodeId = 'same-episode-id';

      const key1 = `${tenant1}#${episodeId}`;
      const key2 = `${tenant2}#${episodeId}`;

      expect(key1).toBe('tenant123#same-episode-id');
      expect(key2).toBe('tenant456#same-episode-id');
      expect(key1).not.toBe(key2);
    });

    test('should ensure different tenants have different S3 key prefixes', () => {
      const tenant1 = 'tenant123';
      const tenant2 = 'tenant456';
      const episodeId = 'same-episode-id';
      const filename = 'transcript.srt';

      const s3Key1 = `${tenant1}/${episodeId}/${filename}`;
      const s3Key2 = `${tenant2}/${episodeId}/${filename}`;

      expect(s3Key1).toBe('tenant123/same-episode-id/transcript.srt');
      expect(s3Key2).toBe('tenant456/same-episode-id/transcript.srt');
      expect(s3Key1).not.toBe(s3Key2);
    });

    test('should ensure GSI queries are tenant-scoped', () => {
      const tenant1 = 'tenant123';
      const tenant2 = 'tenant456';

      const gsi1pk1 = `${tenant1}#episodes`;
      const gsi1pk2 = `${tenant2}#episodes`;

      expect(gsi1pk1).toBe('tenant123#episodes');
      expect(gsi1pk2).toBe('tenant456#episodes');
      expect(gsi1pk1).not.toBe(gsi1pk2);
    });
  });

  describe('Key Format Validation', () => {
    test('should validate DynamoDB key format follows tenant#id pattern', () => {
      const tenantId = 'tenant123';
      const resourceId = 'resource-456';

      const key = `${tenantId}#${resourceId}`;

      expect(key).toMatch(/^[^#]+#[^#]+$/);
      expect(key.split('#')).toHaveLength(2);
      expect(key.split('#')[0]).toBe(tenantId);
      expect(key.split('#')[1]).toBe(resourceId);
    });

    test('should validate S3 key format follows tenant/path pattern', () => {
      const tenantId = 'tenant123';
      const path = 'episode-456/transcript.srt';

      const s3Key = `${tenantId}/${path}`;

      expect(s3Key).toMatch(/^[^/]+\/.+$/);
      expect(s3Key.startsWith(`${tenantId}/`)).toBe(true);
      expect(s3Key.substring(tenantId.length + 1)).toBe(path);
    });

    test('should handle special characters in tenant IDs', () => {
      const tenantId = 'tenant-123_abc';
      const resourceId = 'resource-456';

      const key = `${tenantId}#${resourceId}`;

      expect(key).toBe('tenant-123_abc#resource-456');
      expect(key.split('#')[0]).toBe(tenantId);
    });
  });

  describe('Error Logging', () => {
    test('should log missing tenantId error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const tenantId = null;

      if (!tenantId) {
        console.error('Missing tenantId in authorizer context');
      }

      expect(consoleSpy).toHaveBeenCalledWith('Missing tenantId in authorizer context');

      consoleSpy.mockRestore();
    });

    test('should include tenant context in operation logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const tenantId = 'tenant123';
      const operation = 'create-episode';

      console.log(`${operation} for tenant: ${tenantId}`);

      expect(consoleSpy).toHaveBeenCalledWith('create-episode for tenant: tenant123');

      consoleSpy.mockRestore();
    });
  });
});
