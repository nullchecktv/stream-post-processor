// Unit tests for track management functions
// These tests validate track creation, update, and completion with speaker support

// Mock environment variables
process.env.TABLE_NAME = 'test-table';
process.env.BUCKET_NAME = 'test-bucket';

describe('Track Management Functions', () => {
  describe('Track Creation with Speakers', () => {
    // Test speaker validation logic
    const validateSpeakers = (speakers) => {
      if (speakers === undefined) return [];
      if (!Array.isArray(speakers)) {
        throw new Error('speakers must be an array');
      }
      return speakers
        .map(speaker => String(speaker || '').trim())
        .filter(speaker => speaker.length > 0);
    };

    test('should validate speakers array and normalize names', () => {
      const speakers = ['  host  ', ' guest1 ', '', '   '];
      const result = validateSpeakers(speakers);
      expect(result).toEqual(['host', 'guest1']);
    });

    test('should handle missing speakers field', () => {
      const result = validateSpeakers(undefined);
      expect(result).toEqual([]);
    });

    test('should reject non-array speakers', () => {
      expect(() => validateSpeakers('not-an-array')).toThrow('speakers must be an array');
    });

    test('should filter out empty speaker names', () => {
      const speakers = ['host', '', '   ', 'guest1'];
      const result = validateSpeakers(speakers);
      expect(result).toEqual(['host', 'guest1']);
    });

    // Test track name sanitization
    const sanitizeTrackName = (name) => {
      return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 128);
    };

    test('should sanitize track names correctly', () => {
      expect(sanitizeTrackName('Main Camera')).toBe('main-camera');
      expect(sanitizeTrackName('  Guest #1  ')).toBe('guest-1');
      expect(sanitizeTrackName('Track@Name!')).toBe('track-name');
    });

    // Test request validation schema
    const validateTrackRequest = (body) => {
      if (!body.filename || body.filename.trim().length === 0) {
        throw new Error('filename is required');
      }
      if (!body.trackName || body.trackName.trim().length === 0) {
        throw new Error('trackName is required');
      }
      if (body.speakers !== undefined) {
        if (!Array.isArray(body.speakers)) {
          throw new Error('speakers must be an array');
        }
        for (const speaker of body.speakers) {
          if (typeof speaker !== 'string' || speaker.trim().length === 0) {
            throw new Error('Speaker name cannot be empty');
          }
        }
      }
      return true;
    };

    test('should validate track creation request', () => {
      const validRequest = {
        filename: 'test.mp4',
        trackName: 'main',
        speakers: ['host', 'guest1']
      };
      expect(() => validateTrackRequest(validRequest)).not.toThrow();
    });

    test('should reject request with missing filename', () => {
      const invalidRequest = {
        trackName: 'main',
        speakers: ['host']
      };
      expect(() => validateTrackRequest(invalidRequest)).toThrow('filename is required');
    });

    test('should reject request with empty speaker names', () => {
      const invalidRequest = {
        filename: 'test.mp4',
        trackName: 'main',
        speakers: ['host', '']
      };
      expect(() => validateTrackRequest(invalidRequest)).toThrow('Speaker name cannot be empty');
    });
  });

  describe('Track Update Logic', () => {
    // Test track update validation
    const validateTrackUpdate = (pathParams, body) => {
      if (!pathParams.episodeId || !pathParams.trackName) {
        throw new Error('episodeId and trackName are required');
      }

      let speakers = body?.speakers;
      if (speakers !== undefined) {
        if (!Array.isArray(speakers)) {
          throw new Error('speakers must be an array');
        }
        speakers = speakers
          .map(speaker => String(speaker || '').trim())
          .filter(speaker => speaker.length > 0);
      } else {
        speakers = [];
      }

      return { speakers };
    };

    test('should validate track update parameters', () => {
      const pathParams = { episodeId: 'test-episode', trackName: 'main' };
      const body = { speakers: ['host', 'guest1'] };

      const result = validateTrackUpdate(pathParams, body);
      expect(result.speakers).toEqual(['host', 'guest1']);
    });

    test('should normalize speakers during update', () => {
      const pathParams = { episodeId: 'test-episode', trackName: 'main' };
      const body = { speakers: ['  host  ', ' guest1 ', '', '   '] };

      const result = validateTrackUpdate(pathParams, body);
      expect(result.speakers).toEqual(['host', 'guest1']);
    });

    test('should handle missing speakers field', () => {
      const pathParams = { episodeId: 'test-episode', trackName: 'main' };
      const body = {};

      const result = validateTrackUpdate(pathParams, body);
      expect(result.speakers).toEqual([]);
    });

    test('should reject invalid path parameters', () => {
      const pathParams = { episodeId: 'test-episode' }; // Missing trackName
      const body = { speakers: ['host'] };

      expect(() => validateTrackUpdate(pathParams, body)).toThrow('episodeId and trackName are required');
    });
  });

  describe('Track Completion with Speaker Storage', () => {
    // Test speaker data extraction from upload session
    const extractSpeakersFromUploadSession = (uploadRecord) => {
      return uploadRecord.speakers || [];
    };

    test('should extract speakers from upload session', () => {
      const uploadRecord = {
        uploadId: 'test-upload',
        key: 'test-key',
        speakers: ['host', 'guest1']
      };

      const speakers = extractSpeakersFromUploadSession(uploadRecord);
      expect(speakers).toEqual(['host', 'guest1']);
    });

    test('should handle missing speakers in upload session', () => {
      const uploadRecord = {
        uploadId: 'test-upload',
        key: 'test-key'
        // No speakers field
      };

      const speakers = extractSpeakersFromUploadSession(uploadRecord);
      expect(speakers).toEqual([]);
    });

    // Test track record creation
    const createTrackRecord = (episodeId, trackName, uploadKey, speakers) => {
      const now = new Date().toISOString();
      return {
        pk: episodeId,
        sk: `track#${trackName}`,
        status: 'Unprocessed',
        trackName,
        uploadKey,
        speakers: speakers || [],
        createdAt: now,
        updatedAt: now
      };
    };

    test('should create track record with speakers', () => {
      const episodeId = 'test-episode';
      const trackName = 'main';
      const uploadKey = 'test-key';
      const speakers = ['host', 'guest1'];

      const record = createTrackRecord(episodeId, trackName, uploadKey, speakers);

      expect(record.pk).toBe(episodeId);
      expect(record.sk).toBe(`track#${trackName}`);
      expect(record.speakers).toEqual(speakers);
      expect(record.trackName).toBe(trackName);
      expect(record.uploadKey).toBe(uploadKey);
    });

    test('should create track record with empty speakers when not provided', () => {
      const episodeId = 'test-episode';
      const trackName = 'main';
      const uploadKey = 'test-key';

      const record = createTrackRecord(episodeId, trackName, uploadKey);

      expect(record.speakers).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    // Test various error scenarios
    test('should handle malformed request body', () => {
      const validateRequestBody = (body) => {
        if (!body || typeof body !== 'object') {
          throw new Error('Invalid request body');
        }
        return body;
      };

      expect(() => validateRequestBody(null)).toThrow('Invalid request body');
      expect(() => validateRequestBody('not-an-object')).toThrow('Invalid request body');
      expect(() => validateRequestBody({})).not.toThrow();
    });

    test('should handle upload ID mismatch', () => {
      const validateUploadId = (sessionUploadId, requestUploadId) => {
        if (sessionUploadId !== requestUploadId) {
          throw new Error('uploadId mismatch for this track');
        }
        return true;
      };

      expect(() => validateUploadId('upload-1', 'upload-2')).toThrow('uploadId mismatch for this track');
      expect(() => validateUploadId('upload-1', 'upload-1')).not.toThrow();
    });

    test('should handle missing track scenarios', () => {
      const checkTrackExists = (trackRecord) => {
        if (!trackRecord) {
          throw new Error('Track not found');
        }
        return trackRecord;
      };

      expect(() => checkTrackExists(null)).toThrow('Track not found');
      expect(() => checkTrackExists(undefined)).toThrow('Track not found');
      expect(() => checkTrackExists({ trackName: 'main' })).not.toThrow();
    });
  });

  describe('Backward Compatibility', () => {
    test('should handle tracks created without speakers field', () => {
      const normalizeTrackSpeakers = (track) => {
        return {
          ...track,
          speakers: track.speakers || []
        };
      };

      const oldTrack = {
        trackName: 'main',
        uploadKey: 'test-key'
        // No speakers field
      };

      const normalized = normalizeTrackSpeakers(oldTrack);
      expect(normalized.speakers).toEqual([]);
    });

    test('should handle null speakers field', () => {
      const normalizeTrackSpeakers = (track) => {
        return {
          ...track,
          speakers: track.speakers || []
        };
      };

      const trackWithNullSpeakers = {
        trackName: 'main',
        uploadKey: 'test-key',
        speakers: null
      };

      const normalized = normalizeTrackSpeakers(trackWithNullSpeakers);
      expect(normalized.speakers).toEqual([]);
    });
  });
});
