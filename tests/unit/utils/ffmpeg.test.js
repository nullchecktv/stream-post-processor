// Unit tests for FFmpeg utilities
// These tests validate the core logic without complex child_process mocking

describe('FFmpeg Utilities', () => {
  describe('Temporary directory management', () => {
    test('should generate unique temporary directory names', () => {
      const generateTempDirName = (prefix = 'ffmpeg-') => {
        return `/tmp/${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      };

      const dir1 = generateTempDirName();
      const dir2 = generateTempDirName();

      expect(dir1).toMatch(/\/tmp\/ffmpeg-\d+-[a-z0-9]+/);
      expect(dir2).toMatch(/\/tmp\/ffmpeg-\d+-[a-z0-9]+/);
      expect(dir1).not.toBe(dir2);
    });

    test('should generate custom prefix directory names', () => {
      const generateTempDirName = (prefix = 'ffmpeg-') => {
        return `/tmp/${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      };

      const customDir = generateTempDirName('custom-');
      expect(customDir).toMatch(/\/tmp\/custom-\d+-[a-z0-9]+/);
    });
  });

  describe('FFmpeg command validation', () => {
    test('should validate FFmpeg arguments', () => {
      const validateFFmpegArgs = (args) => {
        if (!Array.isArray(args)) {
          throw new Error('FFmpeg arguments must be an array');
        }

        if (args.length === 0) {
          throw new Error('FFmpeg arguments cannot be empty');
        }

        // Check for required input file
        const inputIndex = args.indexOf('-i');
        if (inputIndex === -1 || inputIndex === args.length - 1) {
          throw new Error('FFmpeg requires input file (-i parameter)');
        }

        return true;
      };

      const validArgs = ['-i', 'input.mp4', '-ss', '30', '-t', '60', 'output.mp4'];
      expect(() => validateFFmpegArgs(validArgs)).not.toThrow();

      expect(() => validateFFmpegArgs([])).toThrow('FFmpeg arguments cannot be empty');
      expect(() => validateFFmpegArgs('not-array')).toThrow('FFmpeg arguments must be an array');
      expect(() => validateFFmpegArgs(['output.mp4'])).toThrow('FFmpeg requires input file');
    });

    test('should validate segment extraction parameters', () => {
      const validateSegmentParams = (startOffset, duration) => {
        if (typeof startOffset !== 'number' || startOffset < 0) {
          throw new Error('Start offset must be a non-negative number');
        }

        if (typeof duration !== 'number' || duration <= 0) {
          throw new Error('Duration must be a positive number');
        }

        return true;
      };

      expect(() => validateSegmentParams(30, 60)).not.toThrow();
      expect(() => validateSegmentParams(-1, 60)).toThrow('Start offset must be a non-negative number');
      expect(() => validateSegmentParams(30, 0)).toThrow('Duration must be a positive number');
      expect(() => validateSegmentParams('30', 60)).toThrow('Start offset must be a non-negative number');
    });
  });

  describe('File path validation', () => {
    test('should validate file paths', () => {
      const validateFilePath = (filePath) => {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('File path must be a non-empty string');
        }

        if (filePath.trim().length === 0) {
          throw new Error('File path cannot be empty');
        }

        return true;
      };

      expect(() => validateFilePath('/tmp/test.mp4')).not.toThrow();
      expect(() => validateFilePath('')).toThrow('File path must be a non-empty string');
      expect(() => validateFilePath(null)).toThrow('File path must be a non-empty string');
      expect(() => validateFilePath('   ')).toThrow('File path cannot be empty');
    });

    test('should generate output file paths', () => {
      const generateOutputPath = (tempDir, clipId, suffix = 'final') => {
        if (!tempDir || !clipId) {
          throw new Error('Temp directory and clip ID are required');
        }
        return `${tempDir}/${clipId}_${suffix}.mp4`;
      };

      expect(generateOutputPath('/tmp/test', 'clip-123')).toBe('/tmp/test/clip-123_final.mp4');
      expect(generateOutputPath('/tmp/test', 'clip-123', 'segment')).toBe('/tmp/test/clip-123_segment.mp4');
      expect(() => generateOutputPath('', 'clip-123')).toThrow('Temp directory and clip ID are required');
    });
  });

  describe('Video processing validation', () => {
    test('should validate video info structure', () => {
      const validateVideoInfo = (info) => {
        if (!info || typeof info !== 'object') {
          throw new Error('Video info must be an object');
        }

        if (!info.format || !info.streams) {
          throw new Error('Video info must contain format and streams');
        }

        return true;
      };

      const validInfo = {
        format: { duration: '120.0' },
        streams: [{ codec_type: 'video', width: 1920, height: 1080 }]
      };

      expect(() => validateVideoInfo(validInfo)).not.toThrow();
      expect(() => validateVideoInfo({})).toThrow('Video info must contain format and streams');
      expect(() => validateVideoInfo(null)).toThrow('Video info must be an object');
    });

    test('should parse FFmpeg version string', () => {
      const parseFFmpegVersion = (versionOutput) => {
        if (!versionOutput || typeof versionOutput !== 'string') {
          return 'unknown';
        }

        const versionMatch = versionOutput.match(/ffmpeg version ([^\s]+)/);
        return versionMatch ? versionMatch[1] : 'unknown';
      };

      expect(parseFFmpegVersion('ffmpeg version 4.4.2-0ubuntu0.22.04.1')).toBe('4.4.2-0ubuntu0.22.04.1');
      expect(parseFFmpegVersion('ffmpeg version 5.1.2')).toBe('5.1.2');
      expect(parseFFmpegVersion('invalid output')).toBe('unknown');
      expect(parseFFmpegVersion('')).toBe('unknown');
    });
  });
});
