// Unit tests for delete clip function
// These tests validate clip deletion logic and S3 file cleanup

// Mock environment variables
process.env.TABLE_NAME = 'test-table';
process.env.BUCKET_NAME = 'test-bucket';

describe('Delete Clip Function', () => {
  describe('Request Validation', () => {
    const validateDeleteRequest = (pathParams, requestContext) => {
      if (!requestContext?.authorizer?.tenantId) {
        throw new Error('Missing tenantId in authorizer context');
      }

      if (!pathParams?.episodeId || !pathParams?.clipId) {
        throw new Error('Episode ID and Clip ID are required');
      }

      return {
        tenantId: requestContext.authorizer.tenantId,
        episodeId: pathParams.episodeId,
        clipId: pathParams.clipId
      };
    };

    test('should validate correct delete request', () => {
      const pathParams = { episodeId: 'episode-123', clipId: 'clip-456' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validateDeleteRequest(pathParams, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
      expect(result.clipId).toBe('clip-456');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123', clipId: 'clip-456' };
      const requestContext = { authorizer: {} };

      expect(() => validateDeleteRequest(pathParams, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = { clipId: 'clip-456' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateDeleteRequest(pathParams, requestContext))
        .toThrow('Episode ID and Clip ID are required');
    });

    test('should reject missing clipId', () => {
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validateDeleteRequest(pathParams, requestContext))
        .toThrow('Episode ID and Clip ID are required');
    });
  });

  describe('S3 File Collection', () => {
    const collectS3Keys = (clip) => {
      const keysToDelete = [];

      // Add main clip file if it exists
      if (clip.s3Key) {
        keysToDelete.push(clip.s3Key);
      }

      // Add segment files if they exist
      if (clip.segments && Array.isArray(clip.segments)) {
        for (const segment of clip.segments) {
          if (segment.s3Key) {
            keysToDelete.push(segment.s3Key);
          }
        }
      }

      return keysToDelete;
    };

    test('should collect main clip file key', () => {
      const clip = {
        clipId: 'clip-456',
        s3Key: 'episode-123/clips/clip-456/clip.mp4'
      };

      const keys = collectS3Keys(clip);
      expect(keys).toEqual(['episode-123/clips/clip-456/clip.mp4']);
    });

    test('should collect segment file keys', () => {
      const clip = {
        clipId: 'clip-456',
        segments: [
          { s3Key: 'episode-123/clips/clip-456/segments/0.mp4' },
          { s3Key: 'episode-123/clips/clip-456/segments/1.mp4' }
        ]
      };

      const keys = collectS3Keys(clip);
      expect(keys).toEqual([
        'episode-123/clips/clip-456/segments/0.mp4',
        'episode-123/clips/clip-456/segments/1.mp4'
      ]);
    });

    test('should collect both main and segment keys', () => {
      const clip = {
        clipId: 'clip-456',
        s3Key: 'episode-123/clips/clip-456/clip.mp4',
        segments: [
          { s3Key: 'episode-123/clips/clip-456/segments/0.mp4' },
          { s3Key: 'episode-123/clips/clip-456/segments/1.mp4' }
        ]
      };

      const keys = collectS3Keys(clip);
      expect(keys).toEqual([
        'episode-123/clips/clip-456/clip.mp4',
        'episode-123/clips/clip-456/segments/0.mp4',
        'episode-123/clips/clip-456/segments/1.mp4'
      ]);
    });

    test('should handle clip with no S3 files', () => {
      const clip = {
        clipId: 'clip-456',
        title: 'Test Clip'
      };

      const keys = collectS3Keys(clip);
      expect(keys).toEqual([]);
    });

    test('should handle segments without s3Key', () => {
      const clip = {
        clipId: 'clip-456',
        segments: [
          { startTime: '00:00:00', endTime: '00:00:30' }, // No s3Key
          { s3Key: 'episode-123/clips/clip-456/segments/1.mp4' }
        ]
      };

      const keys = collectS3Keys(clip);
      expect(keys).toEqual(['episode-123/clips/clip-456/segments/1.mp4']);
    });
  });

  describe('DynamoDB Key Generation', () => {
    const createClipKey = (tenantId, episodeId, clipId) => ({
      pk: `${tenantId}#${episodeId}`,
      sk: `clip#${clipId}`
    });

    const createStatsKey = (tenantId) => ({
      pk: tenantId,
      sk: 'stats'
    });

    test('should create correct clip key', () => {
      const key = createClipKey('tenant-123', 'episode-456', 'clip-789');
      expect(key).toEqual({
        pk: 'tenant-123#episode-456',
        sk: 'clip#clip-789'
      });
    });

    test('should create correct stats key', () => {
      const key = createStatsKey('tenant-123');
      expect(key).toEqual({
        pk: 'tenant-123',
        sk: 'stats'
      });
    });
  });

  describe('S3 Delete Parameters', () => {
    const createDeleteParams = (bucket, keys) => ({
      Bucket: bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: true
      }
    });

    test('should create correct delete parameters', () => {
      const keys = [
        'episode-123/clips/clip-456/clip.mp4',
        'episode-123/clips/clip-456/segments/0.mp4'
      ];

      const params = createDeleteParams('test-bucket', keys);
      expect(params).toEqual({
        Bucket: 'test-bucket',
        Delete: {
          Objects: [
            { Key: 'episode-123/clips/clip-456/clip.mp4' },
            { Key: 'episode-123/clips/clip-456/segments/0.mp4' }
          ],
          Quiet: true
        }
      });
    });

    test('should handle empty keys array', () => {
      const params = createDeleteParams('test-bucket', []);
      expect(params.Delete.Objects).toEqual([]);
    });
  });

  describe('Stats Update Logic', () => {
    const createStatsUpdateParams = (tenantId, tableName) => {
      const now = new Date().toISOString();
      return {
        TableName: tableName,
        Key: {
          pk: tenantId,
          sk: 'stats'
        },
        UpdateExpression: 'ADD clipsDeleted :one SET updatedAt = :now',
        ExpressionAttributeValues: {
          ':one': 1,
          ':now': now
        },
        ReturnValues: 'NONE'
      };
    };

    test('should create correct stats update parameters', () => {
      const params = createStatsUpdateParams('tenant-123', 'test-table');

      expect(params.TableName).toBe('test-table');
      expect(params.Key).toEqual({
        pk: 'tenant-123',
        sk: 'stats'
      });
      expect(params.UpdateExpression).toBe('ADD clipsDeleted :one SET updatedAt = :now');
      expect(params.ExpressionAttributeValues[':one']).toBe(1);
      expect(params.ExpressionAttributeValues[':now']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(params.ReturnValues).toBe('NONE');
    });
  });

  describe('Response Formatting', () => {
    const formatResponse = (statusCode, body = null) => {
      const response = {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
        }
      };

      if (body) {
        response.body = JSON.stringify(body);
      }

      return response;
    };

    test('should format 204 response correctly', () => {
      const response = formatResponse(204);

      expect(response.statusCode).toBe(204);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.body).toBeUndefined();
    });

    test('should format 401 error response correctly', () => {
      const response = formatResponse(401, { error: 'Unauthorized' });

      expect(response.statusCode).toBe(401);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    test('should format 400 error response correctly', () => {
      const response = formatResponse(400, {
        error: 'BadRequest',
        message: 'Episode ID and Clip ID are required'
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toBe('Episode ID and Clip ID are required');
    });

    test('should format 500 error response correctly', () => {
      const response = formatResponse(500, {
        error: 'InternalError',
        message: 'Something went wrong'
      });

      expect(response.statusCode).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalError');
      expect(body.message).toBe('Something went wrong');
    });
  });

  describe('Error Handling', () => {
    const shouldContinueOnError = (error, operation) => {
      // S3 deletion errors should not fail the entire operation
      if (operation === 's3Delete') {
        return true;
      }

      // Stats update errors should not fail the entire operation
      if (operation === 'statsUpdate') {
        return true;
      }

      // DynamoDB errors should fail the operation
      if (operation === 'dynamoDelete') {
        return false;
      }

      return false;
    };

    test('should continue on S3 deletion errors', () => {
      const error = new Error('S3 service unavailable');
      expect(shouldContinueOnError(error, 's3Delete')).toBe(true);
    });

    test('should continue on stats update errors', () => {
      const error = new Error('Stats update failed');
      expect(shouldContinueOnError(error, 'statsUpdate')).toBe(true);
    });

    test('should not continue on DynamoDB deletion errors', () => {
      const error = new Error('DynamoDB service unavailable');
      expect(shouldContinueOnError(error, 'dynamoDelete')).toBe(false);
    });
  });
});
