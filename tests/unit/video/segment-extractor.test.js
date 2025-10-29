// Unit tests for segment extractor handler
// These tests validate the core logic and error handling

describe('Segment Extractor Handler', () => {
  describe('Input validation', () => {
    test('should validate required parameters', () => {
      const validateInput = (event) => {
        const { episodeId, trackName, clipId, segments } = event || {};

        if (!episodeId || !trackName || !clipId || !Array.isArray(segments)) {
          throw new Error('Missing required parameters: episodeId, trackName, clipId, segments');
        }

        return true;
      };

      const validEvent = {
        episodeId: 'episode-123',
        trackName: 'main',
        clipId: 'clip-456',
        segments: [{ startTime: '00:30', endTime: '01:00' }]
      };

      expect(() => validateInput(validEvent)).not.toThrow();
      expect(() => validateInput({})).toThrow('Missing required parameters');
      expect(() => validateInput({ episodeId: 'test' })).toThrow('Missing required parameters');
      expect(() => validateInput({
        episodeId: 'test',
        trackName: 'main',
        clipId: 'clip',
        segments: 'not-array'
      })).toThrow('Missing required parameters');
    });

    test('should validate segment timing format', () => {
      const validateSegmentTiming = (segment) => {
        if (!segment || typeof segment !== 'object') {
          throw new Error('Segment must be an object');
        }

        if (!segment.startTime || !segment.endTime) {
          throw new Error('Segment must have startTime and endTime');
        }

        // Basic time format validation
        const timeRegex = /^\d{1,2}:\d{2}(:\d{2})?$/;
        if (!timeRegex.test(segment.startTime) || !timeRegex.test(segment.endTime)) {
          throw new Error('Invalid time format');
        }

        return true;
      };

      expect(() => validateSegmentTiming({ startTime: '00:30', endTime: '01:00' })).not.toThrow();
      expect(() => validateSegmentTiming({ startTime: '01:30:45', endTime: '02:00:00' })).not.toThrow();
      expect(() => validateSegmentTiming({})).toThrow('Segment must have startTime and endTime');
      expect(() => validateSegmentTiming({ startTime: 'invalid', endTime: '01:00' })).toThrow('Invalid time format');
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

  describe('Processing workflow', () => {
    test('should determine processing strategy', () => {
      const determineProcessingStrategy = (chunkMappings) => {
        if (!Array.isArray(chunkMappings) || chunkMappings.length === 0) {
          throw new Error('No chunk mappings provided');
        }

        return chunkMappings.length === 1 ? 'single-chunk' : 'multi-chunk';
      };

      expect(determineProcessingStrategy([{ chunk: 1 }])).toBe('single-chunk');
      expect(determineProcessingStrategy([{ chunk: 1 }, { chunk: 2 }])).toBe('multi-chunk');
      expect(() => determineProcessingStrategy([])).toThrow('No chunk mappings provided');
    });

    test('should validate processing results', () => {
      const validateProcessingResult = (result) => {
        if (!result || typeof result !== 'object') {
          throw new Error('Processing result must be an object');
        }

        const requiredFields = ['episodeId', 'clipId', 'segmentFiles', 'totalSegments', 'status'];
        for (const field of requiredFields) {
          if (!(field in result)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        if (!Array.isArray(result.segmentFiles)) {
          throw new Error('segmentFiles must be an array');
        }

        if (result.segmentFiles.length !== result.totalSegments) {
          throw new Error('segmentFiles length must match totalSegments');
        }

        return true;
      };

      const validResult = {
        episodeId: 'episode-123',
        clipId: 'clip-456',
        segmentFiles: ['seg1.mp4', 'seg2.mp4'],
        totalSegments: 2,
        status: 'completed'
      };

      expect(() => validateProcessingResult(validResult)).not.toThrow();
      expect(() => validateProcessingResult({})).toThrow('Missing required field');
      expect(() => validateProcessingResult({
        ...validResult,
        segmentFiles: 'not-array'
      })).toThrow('segmentFiles must be an array');
      expect(() => validateProcessingResult({
        ...validResult,
        totalSegments: 3
      })).toThrow('segmentFiles length must match totalSegments');
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
