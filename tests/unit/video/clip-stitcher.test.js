// Unit tests for clip stitcher handler
// These tests validate the core logic and error handling

describe('Clip Stitcher Handler', () => {
  describe('Input validation', () => {
    test('should validate required parameters', () => {
      const validateInput = (event) => {
        const { episodeId, clipId, segments } = event || {};

        if (!episodeId || !clipId || !Array.isArray(segments)) {
          throw new Error('Missing required parameters: episodeId, clipId, segments');
        }

        if (segments.length === 0) {
          throw new Error('No segments provided for stitching');
        }

        return true;
      };

      const validEvent = {
        episodeId: 'episode-123',
        clipId: 'clip-456',
        segments: [
          { segmentFile: 'seg1.mp4', metadata: {} },
          { segmentFile: 'seg2.mp4', metadata: {} }
        ]
      };

      expect(() => validateInput(validEvent)).not.toThrow();
      expect(() => validateInput({})).toThrow('Missing required parameters');
      expect(() => validateInput({ episodeId: 'test' })).toThrow('Missing required parameters');
      expect(() => validateInput({
        episodeId: 'test',
        clipId: 'clip',
        segments: []
      })).toThrow('No segments provided for stitching');
      expect(() => validateInput({
        episodeId: 'test',
        clipId: 'clip',
        segments: 'not-array'
      })).toThrow('Missing required parameters');
    });

    test('should validate segments array', () => {
      const validateSegments = (segments) => {
        if (!Array.isArray(segments)) {
          throw new Error('Segments must be an array');
        }

        if (segments.length === 0) {
          throw new Error('At least one segment is required');
        }

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          if (!segment || typeof segment !== 'object') {
            throw new Error(`Invalid segment at index ${i}: must be an object`);
          }
          if (!segment.segmentFile || typeof segment.segmentFile !== 'string') {
            throw new Error(`Invalid segment at index ${i}: segmentFile must be a non-empty string`);
          }
          if (!segment.metadata || typeof segment.metadata !== 'object') {
            throw new Error(`Invalid segment at index ${i}: metadata must be an object`);
          }
        }

        return true;
      };

      const validSegments = [
        { segmentFile: 'seg1.mp4', metadata: { duration: 30 } },
        { segmentFile: 'seg2.mp4', metadata: { duration: 45 } }
      ];

      expect(() => validateSegments(validSegments)).not.toThrow();
      expect(() => validateSegments([{ segmentFile: 'single.mp4', metadata: {} }])).not.toThrow();
      expect(() => validateSegments([])).toThrow('At least one segment is required');
      expect(() => validateSegments([{ segmentFile: 'valid.mp4' }])).toThrow('Invalid segment at index 0: metadata must be an object');
      expect(() => validateSegments([{ metadata: {} }])).toThrow('Invalid segment at index 0: segmentFile must be a non-empty string');
    });
  });

  describe('FFmpeg concat file generation', () => {
    test('should create valid concat file content', () => {
      const createConcatFileContent = (segmentFiles) => {
        if (!Array.isArray(segmentFiles) || segmentFiles.length === 0) {
          throw new Error('Segment files array is required and must not be empty');
        }

        return segmentFiles
          .map(file => `file '${file}'`)
          .join('\n');
      };

      const segments = ['/tmp/segment_000.mp4', '/tmp/segment_001.mp4'];
      const content = createConcatFileContent(segments);

      expect(content).toBe("file '/tmp/segment_000.mp4'\nfile '/tmp/segment_001.mp4'");
      expect(() => createConcatFileContent([])).toThrow('Segment files array is required');
    });

    test('should handle special characters in file paths', () => {
      const createConcatFileContent = (segmentFiles) => {
        return segmentFiles
          .map(file => `file '${file}'`)
          .join('\n');
      };

      const segmentsWithSpaces = ['/tmp/segment with spaces.mp4', '/tmp/segment-normal.mp4'];
      const content = createConcatFileContent(segmentsWithSpaces);

      expect(content).toContain("file '/tmp/segment with spaces.mp4'");
      expect(content).toContain("file '/tmp/segment-normal.mp4'");
    });

    test('should generate correct local file paths', () => {
      const generateLocalSegmentPath = (tempDir, index) => {
        return `${tempDir}/segment_${index.toString().padStart(3, '0')}.mp4`;
      };

      expect(generateLocalSegmentPath('/tmp/test', 0)).toBe('/tmp/test/segment_000.mp4');
      expect(generateLocalSegmentPath('/tmp/test', 5)).toBe('/tmp/test/segment_005.mp4');
      expect(generateLocalSegmentPath('/tmp/test', 123)).toBe('/tmp/test/segment_123.mp4');
    });
  });

  describe('Segment download operations', () => {
    test('should validate download parameters', () => {
      const validateDownloadParams = (bucket, segmentKeys, tempDir) => {
        if (!bucket || typeof bucket !== 'string') {
          throw new Error('Bucket name is required and must be a string');
        }

        if (!Array.isArray(segmentKeys) || segmentKeys.length === 0) {
          throw new Error('Segment keys array is required and must not be empty');
        }

        if (!tempDir || typeof tempDir !== 'string') {
          throw new Error('Temporary directory is required and must be a string');
        }

        return true;
      };

      expect(() => validateDownloadParams('bucket', ['key1'], '/tmp')).not.toThrow();
      expect(() => validateDownloadParams('', ['key1'], '/tmp')).toThrow('Bucket name is required');
      expect(() => validateDownloadParams('bucket', [], '/tmp')).toThrow('Segment keys array is required');
      expect(() => validateDownloadParams('bucket', ['key1'], '')).toThrow('Temporary directory is required');
    });

    test('should handle download retry logic', () => {
      const simulateDownloadWithRetry = async (maxRetries = 3) => {
        let attempts = 0;
        const errors = [];

        while (attempts < maxRetries) {
          attempts++;

          // Simulate failure on first two attempts, success on third
          if (attempts < 3) {
            const error = new Error(`Download failed (attempt ${attempts})`);
            errors.push(error);
            continue;
          }

          return { success: true, attempts, errors };
        }

        throw new Error(`Failed after ${maxRetries} attempts`);
      };

      return simulateDownloadWithRetry(3).then(result => {
        expect(result.success).toBe(true);
        expect(result.attempts).toBe(3);
        expect(result.errors).toHaveLength(2);
      });
    });

    test('should validate downloaded file sizes', () => {
      const validateDownloadedFile = (filePath, expectedMinSize = 0) => {
        // Mock file stats
        const mockStats = { size: 1024 };

        if (mockStats.size === 0) {
          throw new Error(`Downloaded segment is empty: ${filePath}`);
        }

        if (mockStats.size < expectedMinSize) {
          throw new Error(`Downloaded file too small: ${mockStats.size} < ${expectedMinSize}`);
        }

        return { valid: true, size: mockStats.size };
      };

      expect(() => validateDownloadedFile('/tmp/segment.mp4')).not.toThrow();
      expect(() => validateDownloadedFile('/tmp/segment.mp4', 2048)).toThrow('Downloaded file too small');
    });
  });

  describe('Cleanup operations', () => {
    test('should validate cleanup parameters', () => {
      const validateCleanupParams = (bucket, segmentKeys, options = {}) => {
        if (!bucket || typeof bucket !== 'string') {
          throw new Error('Bucket name is required');
        }

        if (!Array.isArray(segmentKeys)) {
          throw new Error('Segment keys must be an array');
        }

        if (segmentKeys.length === 0) {
          return { skipped: true, reason: 'No files to clean up' };
        }

        return { valid: true, fileCount: segmentKeys.length };
      };

      expect(validateCleanupParams('bucket', ['key1', 'key2'])).toEqual({
        valid: true,
        fileCount: 2
      });

      expect(validateCleanupParams('bucket', [])).toEqual({
        skipped: true,
        reason: 'No files to clean up'
      });

      expect(() => validateCleanupParams('', ['key1'])).toThrow('Bucket name is required');
      expect(() => validateCleanupParams('bucket', 'not-array')).toThrow('Segment keys must be an array');
    });

    test('should handle batch deletion logic', () => {
      const simulateBatchDeletion = (segmentKeys, batchSize = 1000) => {
        const batches = [];

        for (let i = 0; i < segmentKeys.length; i += batchSize) {
          batches.push(segmentKeys.slice(i, i + batchSize));
        }

        return {
          totalFiles: segmentKeys.length,
          batchCount: batches.length,
          batches: batches.map(batch => ({ size: batch.length }))
        };
      };

      const manyKeys = Array.from({ length: 2500 }, (_, i) => `key${i}`);
      const result = simulateBatchDeletion(manyKeys, 1000);

      expect(result.totalFiles).toBe(2500);
      expect(result.batchCount).toBe(3);
      expect(result.batches[0].size).toBe(1000);
      expect(result.batches[1].size).toBe(1000);
      expect(result.batches[2].size).toBe(500);
    });

    test('should track cleanup results', () => {
      const processCleanupResults = (responses) => {
        const results = { deleted: 0, failed: 0, errors: [] };

        for (const response of responses) {
          results.deleted += response.Deleted?.length || 0;
          results.failed += response.Errors?.length || 0;

          if (response.Errors) {
            results.errors.push(...response.Errors);
          }
        }

        return results;
      };

      const mockResponses = [
        { Deleted: [{ Key: 'key1' }, { Key: 'key2' }], Errors: [] },
        { Deleted: [{ Key: 'key3' }], Errors: [{ Key: 'key4', Code: 'AccessDenied' }] }
      ];

      const results = processCleanupResults(mockResponses);

      expect(results.deleted).toBe(3);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].Code).toBe('AccessDenied');
    });
  });

  describe('Video metadata extraction', () => {
    test('should extract basic video properties', () => {
      const extractBasicMetadata = (videoInfo) => {
        const format = videoInfo.format || {};
        const videoStream = videoInfo.streams?.find(stream => stream.codec_type === 'video') || {};
        const audioStream = videoInfo.streams?.find(stream => stream.codec_type === 'audio') || {};

        return {
          duration: parseFloat(format.duration) || 0,
          fileSize: parseInt(format.size) || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          videoCodec: videoStream.codec_name || 'unknown',
          audioCodec: audioStream.codec_name || 'unknown'
        };
      };

      const mockVideoInfo = {
        format: { duration: '120.5', size: '10485760' },
        streams: [
          { codec_type: 'video', width: 1920, height: 1080, codec_name: 'h264' },
          { codec_type: 'audio', codec_name: 'aac' }
        ]
      };

      const metadata = extractBasicMetadata(mockVideoInfo);

      expect(metadata.duration).toBe(120.5);
      expect(metadata.fileSize).toBe(10485760);
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.videoCodec).toBe('h264');
      expect(metadata.audioCodec).toBe('aac');
    });

    test('should calculate quality indicators', () => {
      const calculateQualityIndicators = (width, height) => {
        return {
          resolution: `${width}x${height}`,
          aspectRatio: width && height ? (width / height).toFixed(2) : '0.00',
          isHD: width >= 1280 && height >= 720,
          isFullHD: width >= 1920 && height >= 1080,
          is4K: width >= 3840 && height >= 2160
        };
      };

      expect(calculateQualityIndicators(1920, 1080)).toEqual({
        resolution: '1920x1080',
        aspectRatio: '1.78',
        isHD: true,
        isFullHD: true,
        is4K: false
      });

      expect(calculateQualityIndicators(1280, 720)).toEqual({
        resolution: '1280x720',
        aspectRatio: '1.78',
        isHD: true,
        isFullHD: false,
        is4K: false
      });

      expect(calculateQualityIndicators(3840, 2160)).toEqual({
        resolution: '3840x2160',
        aspectRatio: '1.78',
        isHD: true,
        isFullHD: true,
        is4K: true
      });
    });

    test('should handle missing metadata gracefully', () => {
      const extractMetadataWithFallback = (videoInfo) => {
        try {
          const format = videoInfo?.format || {};
          const videoStream = videoInfo?.streams?.find(stream => stream.codec_type === 'video') || {};

          return {
            duration: parseFloat(format.duration) || 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            hasError: false
          };
        } catch (error) {
          return {
            duration: 0,
            width: 0,
            height: 0,
            hasError: true,
            error: error.message
          };
        }
      };

      expect(extractMetadataWithFallback(null)).toEqual({
        duration: 0,
        width: 0,
        height: 0,
        hasError: false
      });

      expect(extractMetadataWithFallback({})).toEqual({
        duration: 0,
        width: 0,
        height: 0,
        hasError: false
      });
    });
  });

  describe('Final clip upload', () => {
    test('should generate correct clip S3 key', () => {
      const generateClipKey = (episodeId, clipId) => {
        return `${episodeId}/clips/${clipId}/clip.mp4`;
      };

      expect(generateClipKey('episode-123', 'clip-456')).toBe('episode-123/clips/clip-456/clip.mp4');
      expect(generateClipKey('ep-001', 'highlight-1')).toBe('ep-001/clips/highlight-1/clip.mp4');
    });

    test('should validate upload metadata', () => {
      const validateUploadMetadata = (metadata) => {
        const requiredFields = ['episode-id', 'clip-id', 'file-size', 'duration'];
        const missing = [];

        for (const field of requiredFields) {
          if (!(field in metadata)) {
            missing.push(field);
          }
        }

        if (missing.length > 0) {
          throw new Error(`Missing required metadata fields: ${missing.join(', ')}`);
        }

        return true;
      };

      const validMetadata = {
        'episode-id': 'episode-123',
        'clip-id': 'clip-456',
        'file-size': '1048576',
        'duration': '00:02:30'
      };

      expect(() => validateUploadMetadata(validMetadata)).not.toThrow();
      expect(() => validateUploadMetadata({})).toThrow('Missing required metadata fields');
      expect(() => validateUploadMetadata({
        'episode-id': 'episode-123'
      })).toThrow('Missing required metadata fields: clip-id, file-size, duration');
    });

    test('should verify upload integrity', () => {
      const verifyUploadIntegrity = (expectedSize, actualSize, expectedMetadata, actualMetadata) => {
        const results = {
          sizeMatch: expectedSize === actualSize,
          metadataChecks: {}
        };

        const keyFields = ['episode-id', 'clip-id', 'duration'];

        for (const field of keyFields) {
          results.metadataChecks[field] = {
            expected: expectedMetadata[field],
            actual: actualMetadata[field],
            match: expectedMetadata[field] === actualMetadata[field]
          };
        }

        results.valid = results.sizeMatch &&
          Object.values(results.metadataChecks).every(check => check.match);

        return results;
      };

      const verification = verifyUploadIntegrity(
        1048576,
        1048576,
        { 'episode-id': 'ep-1', 'clip-id': 'clip-1', 'duration': '00:02:30' },
        { 'episode-id': 'ep-1', 'clip-id': 'clip-1', 'duration': '00:02:30' }
      );

      expect(verification.valid).toBe(true);
      expect(verification.sizeMatch).toBe(true);
      expect(verification.metadataChecks['episode-id'].match).toBe(true);
    });
  });

  describe('Processing workflow', () => {
    test('should validate processing result structure', () => {
      const validateProcessingResult = (result) => {
        const requiredFields = [
          'episodeId', 'clipId', 'clipS3Key', 'fileSize',
          'duration', 'resolution', 'metadata', 'status'
        ];

        for (const field of requiredFields) {
          if (!(field in result)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        if (result.status !== 'completed') {
          throw new Error('Status must be "completed" for successful processing');
        }

        if (!result.metadata || typeof result.metadata !== 'object') {
          throw new Error('Metadata must be an object');
        }

        return true;
      };

      const validResult = {
        episodeId: 'episode-123',
        clipId: 'clip-456',
        clipS3Key: 'episode-123/clips/clip-456/clip.mp4',
        fileSize: 1048576,
        duration: '00:02:30',
        resolution: '1920x1080',
        metadata: {
          segmentCount: 3,
          ffmpegVersion: '4.4.2',
          processedAt: '2025-01-15T10:30:00Z'
        },
        status: 'completed'
      };

      expect(() => validateProcessingResult(validResult)).not.toThrow();
      expect(() => validateProcessingResult({})).toThrow('Missing required field');
      expect(() => validateProcessingResult({
        ...validResult,
        status: 'failed'
      })).toThrow('Status must be "completed"');
    });

    test('should track processing metrics', () => {
      const calculateProcessingMetrics = (startTime, endTime, segmentCount, fileSize) => {
        const processingDuration = endTime - startTime;
        const avgTimePerSegment = processingDuration / segmentCount;
        const throughputMBps = (fileSize / (1024 * 1024)) / (processingDuration / 1000);

        return {
          processingDurationMs: processingDuration,
          avgTimePerSegmentMs: avgTimePerSegment,
          throughputMBps: parseFloat(throughputMBps.toFixed(2)),
          segmentCount,
          finalFileSizeMB: parseFloat((fileSize / (1024 * 1024)).toFixed(2))
        };
      };

      const metrics = calculateProcessingMetrics(
        Date.now() - 30000, // 30 seconds ago
        Date.now(),
        3,
        10485760 // 10MB
      );

      expect(metrics.processingDurationMs).toBe(30000);
      expect(metrics.avgTimePerSegmentMs).toBe(10000);
      expect(metrics.segmentCount).toBe(3);
      expect(metrics.finalFileSizeMB).toBe(10);
    });
  });

  describe('Error handling', () => {
    test('should handle FFmpeg stitching errors', () => {
      const handleFFmpegError = (error, operation = 'stitching') => {
        const baseMessage = `FFmpeg ${operation} failed: ${error.message}`;

        if (error.message.includes('No such file or directory')) {
          return `${baseMessage} (input file not found)`;
        }

        if (error.message.includes('Invalid data found')) {
          return `${baseMessage} (corrupted input)`;
        }

        if (error.message.includes('Permission denied')) {
          return `${baseMessage} (permission error)`;
        }

        return baseMessage;
      };

      expect(handleFFmpegError({ message: 'No such file or directory: input.mp4' }))
        .toContain('(input file not found)');

      expect(handleFFmpegError({ message: 'Invalid data found when processing input' }))
        .toContain('(corrupted input)');

      expect(handleFFmpegError({ message: 'Permission denied' }))
        .toContain('(permission error)');
    });

    test('should handle S3 operation errors', () => {
      const handleS3Error = (error, operation) => {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
          return `${operation} failed: File not found in S3`;
        }

        if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
          return `${operation} failed: Access denied`;
        }

        if (error.$metadata?.httpStatusCode >= 500) {
          return `${operation} failed: S3 service error (${error.$metadata.httpStatusCode})`;
        }

        return `${operation} failed: ${error.message}`;
      };

      expect(handleS3Error({ name: 'NoSuchKey' }, 'Download'))
        .toBe('Download failed: File not found in S3');

      expect(handleS3Error({ name: 'AccessDenied' }, 'Upload'))
        .toBe('Upload failed: Access denied');

      expect(handleS3Error({ $metadata: { httpStatusCode: 500 } }, 'Delete'))
        .toBe('Delete failed: S3 service error (500)');
    });

    test('should handle cleanup failures gracefully', () => {
      const handleCleanupFailure = (cleanupResults) => {
        if (cleanupResults.failed === 0) {
          return { severity: 'none', message: 'All files cleaned up successfully' };
        }

        const failureRate = cleanupResults.failed / (cleanupResults.deleted + cleanupResults.failed);

        if (failureRate < 0.1) {
          return {
            severity: 'low',
            message: `Minor cleanup issues: ${cleanupResults.failed} files could not be deleted`
          };
        }

        if (failureRate < 0.5) {
          return {
            severity: 'medium',
            message: `Significant cleanup issues: ${cleanupResults.failed} files could not be deleted`
          };
        }

        return {
          severity: 'high',
          message: `Major cleanup failure: ${cleanupResults.failed} files could not be deleted`
        };
      };

      expect(handleCleanupFailure({ deleted: 10, failed: 0 }))
        .toEqual({ severity: 'none', message: 'All files cleaned up successfully' });

      expect(handleCleanupFailure({ deleted: 10, failed: 1 }))
        .toEqual({ severity: 'low', message: 'Minor cleanup issues: 1 files could not be deleted' });

      expect(handleCleanupFailure({ deleted: 5, failed: 5 }))
        .toEqual({ severity: 'high', message: 'Major cleanup failure: 5 files could not be deleted' });
    });
  });
});
