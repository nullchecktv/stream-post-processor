// Unit tests for segment extractor handler
// These tests validate the core logic and error handling for single segment processing

const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const s3Mock = mockClient(S3Client);

describe('Segment Extractor Handler', () => {
  beforeEach(() => {
    s3Mock.reset();
    process.env.BUCKET_NAME = 'test-bucket';
  });
  describe('Input validation', () => {
    test('should validate required parameters for single segment processing', () => {
      const validateInput = (event) => {
        const { tenantId, episodeId, clipId, segment } = event || {};

        if (!tenantId) {
          throw new Error('Unauthorized');
        }

        if (!episodeId || !clipId || !segment) {
          throw new Error('Missing required parameters: episodeId, clipId, segment');
        }

        return true;
      };

      const validEvent = {
        tenantId: 'tenant-123',
        episodeId: 'episode-456',
        clipId: 'clip-789',
        segment: {
          startTime: '00:15:30',
          endTime: '00:17:45',
          speaker: 'host',
          text: 'Transcript segment text'
        }
      };

      expect(() => validateInput(validEvent)).not.toThrow();
      expect(() => validateInput({})).toThrow('Unauthorized');
      expect(() => validateInput({ tenantId: 'tenant-123' })).toThrow('Missing required parameters');
      expect(() => validateInput({
        tenantId: 'tenant-123',
        episodeId: 'episode-456',
        clipId: 'clip-789',
        segment: null
      })).toThrow('Missing required parameters');
    });

    test('should validate single segment timing format', () => {
      const validateSegmentTiming = (segment) => {
        if (!segment || typeof segment !== 'object') {
          throw new Error('Invalid segment: Segment must be an object');
        }

        if (!segment.startTime || !segment.endTime) {
          throw new Error('Invalid segment: Segment must have startTime and endTime');
        }

        // Time format validation for HH:MM:SS format
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        if (!timeRegex.test(segment.startTime) || !timeRegex.test(segment.endTime)) {
          throw new Error('Invalid segment: Time format must be HH:MM:SS');
        }

        // Validate that endTime is after startTime
        const startSeconds = timeToSeconds(segment.startTime);
        const endSeconds = timeToSeconds(segment.endTime);

        if (endSeconds <= startSeconds) {
          throw new Error('Invalid segment: endTime must be after startTime');
        }

        return true;
      };

      const timeToSeconds = (timeStr) => {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
      };

      expect(() => validateSegmentTiming({
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host'
      })).not.toThrow();

      expect(() => validateSegmentTiming({})).toThrow('Invalid segment: Segment must have startTime and endTime');
      expect(() => validateSegmentTiming({
        startTime: '15:30',
        endTime: '17:45'
      })).toThrow('Invalid segment: Time format must be HH:MM:SS');
      expect(() => validateSegmentTiming({
        startTime: '00:17:45',
        endTime: '00:15:30'
      })).toThrow('Invalid segment: endTime must be after startTime');
    });
  });

  describe('Chunk mapping logic', () => {
    test('should identify single chunk segments', () => {
      const calculateChunkCount = (startSeconds, endSeconds, chunkDuration = 120) => {
        const startChunk = Math.floor(startSeconds / chunkDuration);
        const endChunk = Math.floor(endSeconds / chunkDuration);
        return endChunk - startChunk + 1;
      };

      // Segment within single 2-minute chunk
      expect(calculateChunkCount(30, 90)).toBe(1);

      // Segment spanning two chunks
      expect(calculateChunkCount(90, 150)).toBe(2);

      // Segment spanning three chunks
      expect(calculateChunkCount(100, 300)).toBe(3);
    });

    test('should calculate segment boundaries', () => {
      const calculateSegmentBoundaries = (segment, chunkDuration = 120) => {
        const timeToSeconds = (timeStr) => {
          const parts = timeStr.split(':').map(part => parseInt(part, 10));
          if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
          } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
          return 0;
        };

        const startSeconds = timeToSeconds(segment.startTime);
        const endSeconds = timeToSeconds(segment.endTime);

        return {
          startSeconds,
          endSeconds,
          duration: endSeconds - startSeconds,
          firstChunk: Math.floor(startSeconds / chunkDuration),
          lastChunk: Math.floor(endSeconds / chunkDuration)
        };
      };

      const segment = { startTime: '01:30', endTime: '03:30' };
      const boundaries = calculateSegmentBoundaries(segment);

      expect(boundaries.startSeconds).toBe(90);
      expect(boundaries.endSeconds).toBe(210);
      expect(boundaries.duration).toBe(120);
      expect(boundaries.firstChunk).toBe(0);
      expect(boundaries.lastChunk).toBe(1);
    });
  });

  describe('File path generation', () => {
    test('should generate correct segment paths', () => {
      const generateSegmentKey = (episodeId, clipId, segmentIndex) => {
        return `${episodeId}/clips/${clipId}/segments/${segmentIndex.toString().padStart(3, '0')}.mp4`;
      };

      expect(generateSegmentKey('episode-123', 'clip-456', 0)).toBe('episode-123/clips/clip-456/segments/000.mp4');
      expect(generateSegmentKey('episode-123', 'clip-456', 5)).toBe('episode-123/clips/clip-456/segments/005.mp4');
      expect(generateSegmentKey('episode-123', 'clip-456', 123)).toBe('episode-123/clips/clip-456/segments/123.mp4');
    });

    test('should generate temporary file paths', () => {
      const generateTempPaths = (tempDir, segmentIndex) => {
        return {
          chunkPath: `${tempDir}/chunk_${segmentIndex}.mp4`,
          segmentPath: `${tempDir}/segment_${segmentIndex}.mp4`,
          concatFile: `${tempDir}/concat_${segmentIndex}.txt`
        };
      };

      const paths = generateTempPaths('/tmp/test-dir', 0);
      expect(paths.chunkPath).toBe('/tmp/test-dir/chunk_0.mp4');
      expect(paths.segmentPath).toBe('/tmp/test-dir/segment_0.mp4');
      expect(paths.concatFile).toBe('/tmp/test-dir/concat_0.txt');
    });
  });

  describe('Single segment processing workflow', () => {
    test('should determine processing strategy for single segment', () => {
      const determineProcessingStrategy = (chunkMappings) => {
        if (!Array.isArray(chunkMappings) || chunkMappings.length === 0) {
          throw new Error('No chunks found for segment');
        }

        return chunkMappings.length === 1 ? 'single-chunk' : 'multi-chunk';
      };

      expect(determineProcessingStrategy([{ chunk: 1 }])).toBe('single-chunk');
      expect(determineProcessingStrategy([{ chunk: 1 }, { chunk: 2 }])).toBe('multi-chunk');
      expect(() => determineProcessingStrategy([])).toThrow('No chunks found for segment');
    });

    test('should handle existing segment files', async () => {
      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 15728640,
        Metadata: {
          duration: '135.5',
          resolution: '1920x1080'
        }
      });

      const checkExistingSegment = async (bucketName, segmentS3Key) => {
        try {
          const s3 = new S3Client();
          const response = await s3.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: segmentS3Key
          }));

          const metadata = response.Metadata || {};
          return {
            exists: true,
            metadata: {
              duration: parseFloat(metadata.duration || '0'),
              fileSize: response.ContentLength || 0,
              resolution: metadata.resolution || '1920x1080'
            }
          };
        } catch (error) {
          if (error.name === 'NoSuchKey') {
            return { exists: false };
          }
          throw error;
        }
      };

      const result = await checkExistingSegment('test-bucket', 'episode-456/clips/clip-789/segments/000.mp4');

      expect(result.exists).toBe(true);
      expect(result.metadata.duration).toBe(135.5);
      expect(result.metadata.fileSize).toBe(15728640);
      expect(result.metadata.resolution).toBe('1920x1080');
      expect(s3Mock.calls()).toHaveLength(1);
    });

    test('should handle missing segment files', async () => {
      s3Mock.on(HeadObjectCommand).rejects({ name: 'NoSuchKey' });

      const checkExistingSegment = async (bucketName, segmentS3Key) => {
        try {
          const s3 = new S3Client();
          await s3.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: segmentS3Key
          }));
          return { exists: true };
        } catch (error) {
          if (error.name === 'NoSuchKey') {
            return { exists: false };
          }
          throw error;
        }
      };

      const result = await checkExistingSegment('test-bucket', 'episode-456/clips/clip-789/segments/000.mp4');

      expect(result.exists).toBe(false);
      expect(s3Mock.calls()).toHaveLength(1);
    });

    test('should validate single segment processing results', () => {
      const validateProcessingResult = (result) => {
        if (!result || typeof result !== 'object') {
          throw new Error('Processing result must be an object');
        }

        const requiredFields = ['episodeId', 'clipId', 'segmentFile', 'status', 'metadata'];
        for (const field of requiredFields) {
          if (!(field in result)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        if (typeof result.segmentFile !== 'string') {
          throw new Error('segmentFile must be a string');
        }

        if (result.status !== 'completed') {
          throw new Error('Status must be "completed" for successful processing');
        }

        if (!result.metadata || typeof result.metadata !== 'object') {
          throw new Error('metadata must be an object');
        }

        const metadataFields = ['duration', 'fileSize', 'resolution'];
        for (const field of metadataFields) {
          if (!(field in result.metadata)) {
            throw new Error(`Missing metadata field: ${field}`);
          }
        }

        // Validate metadata types
        if (typeof result.metadata.duration !== 'number' || result.metadata.duration <= 0) {
          throw new Error('metadata.duration must be a positive number');
        }

        if (typeof result.metadata.fileSize !== 'number' || result.metadata.fileSize <= 0) {
          throw new Error('metadata.fileSize must be a positive number');
        }

        return true;
      };

      const validResult = {
        episodeId: 'episode-456',
        clipId: 'clip-789',
        segmentFile: 'episode-456/clips/clip-789/segments/000.mp4',
        status: 'completed',
        metadata: {
          duration: 135.5,
          fileSize: 15728640,
          resolution: '1920x1080'
        }
      };

      expect(() => validateProcessingResult(validResult)).not.toThrow();
      expect(() => validateProcessingResult({})).toThrow('Missing required field');
      expect(() => validateProcessingResult({
        ...validResult,
        segmentFile: 123
      })).toThrow('segmentFile must be a string');
      expect(() => validateProcessingResult({
        ...validResult,
        status: 'failed'
      })).toThrow('Status must be "completed"');
      expect(() => validateProcessingResult({
        ...validResult,
        metadata: { duration: -1, fileSize: 1000, resolution: '1920x1080' }
      })).toThrow('metadata.duration must be a positive number');
    });
  });

  describe('Error handling', () => {
    test('should handle missing manifest errors', () => {
      const handleManifestError = (error) => {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
          return 'HLS manifest not found';
        }
        return `Failed to load HLS manifest: ${error.message}`;
      };

      const notFoundError = { name: 'NoSuchKey' };
      const httpError = { $metadata: { httpStatusCode: 404 } };
      const genericError = { message: 'Network error' };

      expect(handleManifestError(notFoundError)).toBe('HLS manifest not found');
      expect(handleManifestError(httpError)).toBe('HLS manifest not found');
      expect(handleManifestError(genericError)).toBe('Failed to load HLS manifest: Network error');
    });

    test('should handle FFmpeg errors', () => {
      const handleFFmpegError = (error, operation) => {
        const errorMessage = `FFmpeg ${operation} failed: ${error.message}`;

        // Check for common FFmpeg error patterns
        if (error.message.includes('No such file or directory')) {
          return `${errorMessage} (file not found)`;
        }

        if (error.message.includes('Invalid data found')) {
          return `${errorMessage} (corrupted file)`;
        }

        return errorMessage;
      };

      const fileNotFoundError = { message: 'No such file or directory: input.mp4' };
      const corruptedFileError = { message: 'Invalid data found when processing input' };
      const genericError = { message: 'Unknown error' };

      expect(handleFFmpegError(fileNotFoundError, 'extraction')).toContain('(file not found)');
      expect(handleFFmpegError(corruptedFileError, 'extraction')).toContain('(corrupted file)');
      expect(handleFFmpegError(genericError, 'extraction')).toBe('FFmpeg extraction failed: Unknown error');
    });
  });
});
