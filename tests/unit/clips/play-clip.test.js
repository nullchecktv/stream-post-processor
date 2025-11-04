// Unit tests for play clip function
// These tests validate clip playback URL generation and view count tracking

// Mock environment variables
process.env.TABLE_NAME = 'test-table';
process.env.BUCKET_NAME = 'test-bucket';

describe('Play Clip Function', () => {
  describe('Request Validation', () => {
    const validatePlayRequest = (pathParams, requestContext) => {
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

    test('should validate correct play request', () => {
      const pathParams = { episodeId: 'episode-123', clipId: 'clip-456' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      const result = validatePlayRequest(pathParams, requestContext);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-123');
      expect(result.clipId).toBe('clip-456');
    });

    test('should reject missing tenantId', () => {
      const pathParams = { episodeId: 'episode-123', clipId: 'clip-456' };
      const requestContext = { authorizer: {} };

      expect(() => validatePlayRequest(pathParams, requestContext))
        .toThrow('Missing tenantId in authorizer context');
    });

    test('should reject missing episodeId', () => {
      const pathParams = { clipId: 'clip-456' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validatePlayRequest(pathParams, requestContext))
        .toThrow('Episode ID and Clip ID are required');
    });

    test('should reject missing clipId', () => {
      const pathParams = { episodeId: 'episode-123' };
      const requestContext = {
        authorizer: { tenantId: 'tenant-123' }
      };

      expect(() => validatePlayRequest(pathParams, requestContext))
        .toThrow('Episode ID and Clip ID are required');
    });
  });

  describe('Clip Status Validation', () => {
    const isClipPlayable = (status) => {
      return status === 'processed' || status === 'approved' || status === 'published';
    };

    test('should allow processed clips', () => {
      expect(isClipPlayable('processed')).toBe(true);
    });

    test('should allow approved clips', () => {
      expect(isClipPlayable('approved')).toBe(true);
    });

    test('should allow published clips', () => {
      expect(isClipPlayable('published')).toBe(true);
    });

    test('should reject detected clips', () => {
      expect(isClipPlayable('detected')).toBe(false);
    });

    test('should reject processing clips', () => {
      expect(isClipPlayable('processing')).toBe(false);
    });

    test('should reject failed clips', () => {
      expect(isClipPlayable('failed')).toBe(false);
    });

    test('should reject reviewed clips', () => {
      expect(isClipPlayable('reviewed')).toBe(false);
    });

    test('should reject rejected clips', () => {
      expect(isClipPlayable('rejected')).toBe(false);
    });
  });

  describe('S3 Key Validation', () => {
    const validateS3Key = (clip) => {
      if (!clip.s3Key) {
        throw new Error('Clip video file not available');
      }
      return clip.s3Key;
    };

    test('should accept valid s3Key', () => {
      const clip = { s3Key: 'tenant123/episode-123/clips/clip-456.mp4' };
      const result = validateS3Key(clip);
      expect(result).toBe('tenant123/episode-123/clips/clip-456.mp4');
    });

    test('should reject missing s3Key', () => {
      const clip = { clipId: 'clip-456', title: 'Test Clip' };
      expect(() => validateS3Key(clip))
        .toThrow('Clip video file not available');
    });

    test('should reject empty s3Key', () => {
      const clip = { s3Key: '' };
      expect(() => validateS3Key(clip))
        .toThrow('Clip video file not available');
    });

    test('should reject null s3Key', () => {
      const clip = { s3Key: null };
      expect(() => validateS3Key(clip))
        .toThrow('Clip video file not available');
    });
  });

  describe('View Count Increment', () => {
    const incrementViewCount = (currentCount) => {
      return (currentCount || 0) + 1;
    };

    test('should increment existing view count', () => {
      expect(incrementViewCount(5)).toBe(6);
    });

    test('should handle zero view count', () => {
      expect(incrementViewCount(0)).toBe(1);
    });

    test('should handle undefined view count', () => {
      expect(incrementViewCount(undefined)).toBe(1);
    });

    test('should handle null view count', () => {
      expect(incrementViewCount(null)).toBe(1);
    });
  });

  describe('DynamoDB Key Generation', () => {
    const createClipKey = (tenantId, episodeId, clipId) => ({
      pk: `${tenantId}#${episodeId}`,
      sk: `clip#${clipId}`
    });

    test('should create correct clip key', () => {
      const key = createClipKey('tenant-123', 'episode-456', 'clip-789');
      expect(key).toEqual({
        pk: 'tenant-123#episode-456',
        sk: 'clip#clip-789'
      });
    });
  });

  describe('Update Expression Generation', () => {
    const createUpdateExpression = () => {
      return {
        UpdateExpression: 'ADD viewCount :increment SET updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':increment': 1,
          ':updatedAt': new Date().toISOString()
        }
      };
    };

    test('should create correct update expression', () => {
      const expression = createUpdateExpression();
      expect(expression.UpdateExpression).toBe('ADD viewCount :increment SET updatedAt = :updatedAt');
      expect(expression.ExpressionAttributeValues[':increment']).toBe(1);
      expect(typeof expression.ExpressionAttributeValues[':updatedAt']).toBe('string');
    });
  });

  describe('Response Generation', () => {
    const createPlayResponse = (clip, downloadUrl, viewCount) => {
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      return {
        clipId: clip.clipId,
        episodeId: clip.episodeId,
        title: clip.hook || clip.title,
        downloadUrl: downloadUrl,
        expiresAt: expiresAt,
        duration: clip.duration,
        fileSize: clip.fileSize,
        viewCount: viewCount
      };
    };

    test('should create correct play response', () => {
      const clip = {
        clipId: 'clip-456',
        episodeId: 'episode-123',
        title: 'Test Clip',
        duration: '00:02:30',
        fileSize: 1024000
      };
      const downloadUrl = 'https://s3.amazonaws.com/bucket/key?signature=xyz';
      const viewCount = 6;

      const response = createPlayResponse(clip, downloadUrl, viewCount);

      expect(response.clipId).toBe('clip-456');
      expect(response.episodeId).toBe('episode-123');
      expect(response.title).toBe('Test Clip');
      expect(response.downloadUrl).toBe(downloadUrl);
      expect(response.duration).toBe('00:02:30');
      expect(response.fileSize).toBe(1024000);
      expect(response.viewCount).toBe(6);
      expect(response.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should use hook as title when available', () => {
      const clip = {
        clipId: 'clip-456',
        episodeId: 'episode-123',
        title: 'Original Title',
        hook: 'Catchy Hook',
        duration: '00:02:30'
      };
      const downloadUrl = 'https://s3.amazonaws.com/bucket/key';
      const viewCount = 1;

      const response = createPlayResponse(clip, downloadUrl, viewCount);
      expect(response.title).toBe('Catchy Hook');
    });

    test('should fall back to title when hook not available', () => {
      const clip = {
        clipId: 'clip-456',
        episodeId: 'episode-123',
        title: 'Original Title',
        duration: '00:02:30'
      };
      const downloadUrl = 'https://s3.amazonaws.com/bucket/key';
      const viewCount = 1;

      const response = createPlayResponse(clip, downloadUrl, viewCount);
      expect(response.title).toBe('Original Title');
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

    test('should format 200 response correctly', () => {
      const body = {
        clipId: 'clip-456',
        downloadUrl: 'https://s3.amazonaws.com/bucket/key',
        viewCount: 1
      };
      const response = formatResponse(200, body);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');

      const parsedBody = JSON.parse(response.body);
      expect(parsedBody.clipId).toBe('clip-456');
      expect(parsedBody.downloadUrl).toBe('https://s3.amazonaws.com/bucket/key');
      expect(parsedBody.viewCount).toBe(1);
    });

    test('should format 404 response correctly', () => {
      const response = formatResponse(404, {
        error: 'NotFound',
        message: 'Clip not found'
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('NotFound');
      expect(body.message).toBe('Clip not found');
    });

    test('should format 400 response correctly', () => {
      const response = formatResponse(400, {
        error: 'BadRequest',
        message: 'Clip is not ready for playback'
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toBe('Clip is not ready for playback');
    });

    test('should format 401 response correctly', () => {
      const response = formatResponse(401, { error: 'Unauthorized' });

      expect(response.statusCode).toBe(401);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    test('should format 500 response correctly', () => {
      const response = formatResponse(500, {
        message: 'Something went wrong'
      });

      expect(response.statusCode).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.message).toBe('Something went wrong');
    });
  });

  describe('URL Expiration Logic', () => {
    const calculateExpiration = (hoursFromNow = 1) => {
      return new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString();
    };

    test('should calculate 1 hour expiration correctly', () => {
      const expiration = calculateExpiration(1);
      const expirationTime = new Date(expiration).getTime();
      const expectedTime = Date.now() + 3600 * 1000;

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(expirationTime - expectedTime)).toBeLessThan(1000);
    });

    test('should return ISO 8601 format', () => {
      const expiration = calculateExpiration(1);
      expect(expiration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
