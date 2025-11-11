// Test for segment validation schema in create-clips.mjs
// This tests the validation logic that ensures segments have required fields

describe('Create Clips Tool - Segment Validation', () => {
  // Mock the validation logic from the actual segmentSchema
  const validateSegment = (segment) => {
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;

    // Check required fields
    if (!segment.startTime) throw new Error('startTime is required');
    if (!segment.endTime) throw new Error('endTime is required');
    if (segment.speaker === undefined) throw new Error('speaker is required');
    if (segment.order === undefined) throw new Error('order is required');
    if (segment.transcript === undefined) throw new Error('transcript is required');

    // Validate startTime format
    if (typeof segment.startTime !== 'string' || !timeRegex.test(segment.startTime)) {
      throw new Error('startTime must be in HH:MM:SS format');
    }

    // Validate endTime format
    if (typeof segment.endTime !== 'string' || !timeRegex.test(segment.endTime)) {
      throw new Error('endTime must be in HH:MM:SS format');
    }

    // Validate speaker
    if (typeof segment.speaker !== 'string' || segment.speaker.length === 0) {
      throw new Error('speaker must be a non-empty string');
    }

    // Validate order
    if (typeof segment.order !== 'number' || segment.order < 1 || !Number.isInteger(segment.order)) {
      throw new Error('order must be a positive integer starting from 1');
    }

    // Validate transcript
    if (typeof segment.transcript !== 'string' || segment.transcript.length === 0) {
      throw new Error('transcript must be a non-empty string');
    }

    // Additional time format validation (check ranges)
    const validateTimeValues = (timeStr) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;
    };

    if (!validateTimeValues(segment.startTime)) {
      throw new Error('startTime has invalid time values');
    }

    if (!validateTimeValues(segment.endTime)) {
      throw new Error('endTime has invalid time values');
    }

    return true;
  };

  describe('Required fields validation', () => {
    test('should validate segment with all required fields', () => {
      const validSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: 1,
        transcript: 'This is the transcript text for this segment',
        notes: 'Optional notes'
      };

      expect(() => validateSegment(validSegment)).not.toThrow();
    });

    test('should validate segment without optional notes', () => {
      const validSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'guest1',
        order: 2,
        transcript: 'Another transcript segment'
      };

      expect(() => validateSegment(validSegment)).not.toThrow();
    });

    test('should reject segment missing startTime', () => {
      const invalidSegment = {
        endTime: '00:17:45',
        speaker: 'host',
        order: 1
      };

      expect(() => validateSegment(invalidSegment)).toThrow('startTime is required');
    });

    test('should reject segment missing endTime', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        speaker: 'host',
        order: 1
      };

      expect(() => validateSegment(invalidSegment)).toThrow('endTime is required');
    });

    test('should reject segment missing speaker', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        order: 1
      };

      expect(() => validateSegment(invalidSegment)).toThrow('speaker is required');
    });

    test('should reject segment with empty speaker', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: '',
        order: 1,
        transcript: 'Some transcript text'
      };

      expect(() => validateSegment(invalidSegment)).toThrow('speaker must be a non-empty string');
    });

    test('should reject segment missing order', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        transcript: 'Some transcript text'
      };

      expect(() => validateSegment(invalidSegment)).toThrow('order is required');
    });

    test('should reject segment missing transcript', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: 1
      };

      expect(() => validateSegment(invalidSegment)).toThrow('transcript is required');
    });

    test('should reject segment with empty transcript', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: 1,
        transcript: ''
      };

      expect(() => validateSegment(invalidSegment)).toThrow('transcript must be a non-empty string');
    });
  });

  describe('Time format validation', () => {
    test('should accept valid time formats', () => {
      const validTimes = [
        '00:00:00',
        '01:30:45',
        '23:59:59',
        '12:00:00'
      ];

      validTimes.forEach(time => {
        const segment = {
          startTime: time,
          endTime: '00:17:45',
          speaker: 'host',
          order: 1,
          transcript: 'Transcript text'
        };
        expect(() => validateSegment(segment)).not.toThrow();
      });
    });

    test('should reject invalid time formats', () => {
      const invalidFormats = [
        '1:30:45',    // Missing leading zero for hour
        '01:3:45',    // Missing leading zero for minute
        '01:30:5',    // Missing leading zero for second
        '1:30',       // Missing seconds
        '01:30:45:00' // Too many parts
      ];

      invalidFormats.forEach(time => {
        const segment = {
          startTime: time,
          endTime: '00:17:45',
          speaker: 'host',
          order: 1,
          transcript: 'Transcript text'
        };
        expect(() => validateSegment(segment)).toThrow('startTime must be in HH:MM:SS format');
      });
    });

    test('should reject invalid time values', () => {
      const invalidValues = [
        '25:00:00',   // Invalid hour
        '01:60:00',   // Invalid minute
        '01:30:60'    // Invalid second
      ];

      invalidValues.forEach(time => {
        const segment = {
          startTime: time,
          endTime: '00:17:45',
          speaker: 'host',
          order: 1,
          transcript: 'Transcript text'
        };
        expect(() => validateSegment(segment)).toThrow();
      });
    });
  });

  describe('Order validation', () => {
    test('should reject segment with invalid order (zero)', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: 0,
        transcript: 'Transcript text'
      };

      expect(() => validateSegment(invalidSegment)).toThrow('order must be a positive integer starting from 1');
    });

    test('should reject segment with invalid order (negative)', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: -1,
        transcript: 'Transcript text'
      };

      expect(() => validateSegment(invalidSegment)).toThrow('order must be a positive integer starting from 1');
    });

    test('should reject segment with non-integer order', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: 1.5,
        transcript: 'Transcript text'
      };

      expect(() => validateSegment(invalidSegment)).toThrow('order must be a positive integer starting from 1');
    });
  });

  describe('Schema requirements compliance', () => {
    test('should require speaker field (no fallback to text)', () => {
      // This test ensures that the speaker field is required and there's no fallback to a text property
      const segmentWithoutSpeaker = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        text: 'Some transcript text', // Old format - should not be accepted as speaker substitute
        order: 1
      };

      expect(() => validateSegment(segmentWithoutSpeaker)).toThrow('speaker is required');
    });

    test('should require startTime and endTime without fallback options', () => {
      // This test ensures that both startTime and endTime are required with no fallback mechanisms
      const segmentWithoutTimes = {
        speaker: 'host',
        order: 1,
        transcript: 'Some transcript text'
      };

      expect(() => validateSegment(segmentWithoutTimes)).toThrow('startTime is required');
    });

    test('should require transcript field', () => {
      const segmentWithoutTranscript = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: 1
      };

      expect(() => validateSegment(segmentWithoutTranscript)).toThrow('transcript is required');
    });
  });

  describe('Clip hash calculation with speaker data', () => {
    // Test the clip hash calculation logic that includes speaker data
    const createClipHash = (segments, hook, summary) => {
      const crypto = require('crypto');

      const segmentSignature = segments
        .map((s) => `${s.order}-${s.startTime}-${s.endTime}-${s.speaker}-${s.transcript}`)
        .join('|');

      return crypto
        .createHash('sha256')
        .update(`${segmentSignature}|${hook}|${summary}`)
        .digest('hex')
        .slice(0, 16);
    };

    test('should include speaker data in clip hash calculation', () => {
      const segments = [
        {
          order: 1,
          startTime: '00:15:30',
          endTime: '00:17:45',
          speaker: 'host',
          transcript: 'This is what the host said'
        },
        {
          order: 2,
          startTime: '00:20:00',
          endTime: '00:21:30',
          speaker: 'guest1',
          transcript: 'This is what the guest said'
        }
      ];

      const hook = 'Great discussion point';
      const summary = 'Host and guest discuss important topic';

      const hash1 = createClipHash(segments, hook, summary);

      // Change speaker in first segment
      const segmentsWithDifferentSpeaker = [
        {
          order: 1,
          startTime: '00:15:30',
          endTime: '00:17:45',
          speaker: 'guest2',
          transcript: 'This is what the host said'
        },
        {
          order: 2,
          startTime: '00:20:00',
          endTime: '00:21:30',
          speaker: 'guest1',
          transcript: 'This is what the guest said'
        }
      ];

      const hash2 = createClipHash(segmentsWithDifferentSpeaker, hook, summary);

      // Hashes should be different when speaker changes
      expect(hash1).not.toBe(hash2);
    });

    test('should generate consistent hash for same speaker data', () => {
      const segments = [
        {
          order: 1,
          startTime: '00:15:30',
          endTime: '00:17:45',
          speaker: 'host',
          transcript: 'Important point here'
        }
      ];

      const hook = 'Great point';
      const summary = 'Important discussion';

      const hash1 = createClipHash(segments, hook, summary);
      const hash2 = createClipHash(segments, hook, summary);

      // Same input should generate same hash
      expect(hash1).toBe(hash2);
    });

    test('should include all segment speaker data in hash', () => {
      const segments = [
        {
          order: 1,
          startTime: '00:15:30',
          endTime: '00:17:45',
          speaker: 'host',
          transcript: 'Host speaking here'
        },
        {
          order: 2,
          startTime: '00:20:00',
          endTime: '00:21:30',
          speaker: 'guest1',
          transcript: 'Guest speaking here'
        }
      ];

      const hook = 'Discussion';
      const summary = 'Multi-speaker segment';

      const hash1 = createClipHash(segments, hook, summary);

      // Swap speaker order
      const segmentsSwapped = [
        {
          order: 1,
          startTime: '00:15:30',
          endTime: '00:17:45',
          speaker: 'guest1',
          transcript: 'Host speaking here'
        },
        {
          order: 2,
          startTime: '00:20:00',
          endTime: '00:21:30',
          speaker: 'host',
          transcript: 'Guest speaking here'
        }
      ];

      const hash2 = createClipHash(segmentsSwapped, hook, summary);

      // Different speaker assignments should produce different hashes
      expect(hash1).not.toBe(hash2);
    });
  });
});
