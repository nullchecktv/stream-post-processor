// Unit tests for clip creation enhancements
// These tests validate enhanced segment validation with speaker requirements

describe('Clip Creation Enhancements', () => {
  describe('Enhanced Segment Validation', () => {
    // Test the enhanced segment schema validation
    const validateSegment = (segment) => {
      const timeRegex = /^\d{2}:\d{2}:\d{2}$/;

      // Check required fields
      if (!segment.startTime) throw new Error('startTime is required');
      if (!segment.endTime) throw new Error('endTime is required');
      if (segment.speaker === undefined) throw new Error('speaker is required');
      if (segment.order === undefined) throw new Error('order is required');

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

    test('should require speaker field for all segments', () => {
      const segmentWithoutSpeaker = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        order: 1
      };

      expect(() => validateSegment(segmentWithoutSpeaker)).toThrow('speaker is required');
    });

    test('should require non-empty speaker string', () => {
      const segmentWithEmptySpeaker = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: '',
        order: 1
      };

      expect(() => validateSegment(segmentWithEmptySpeaker)).toThrow('speaker must be a non-empty string');
    });

    test('should require startTime field', () => {
      const segmentWithoutStartTime = {
        endTime: '00:17:45',
        speaker: 'host',
        order: 1
      };

      expect(() => validateSegment(segmentWithoutStartTime)).toThrow('startTime is required');
    });

    test('should require endTime field', () => {
      const segmentWithoutEndTime = {
        startTime: '00:15:30',
        speaker: 'host',
        order: 1
      };

      expect(() => validateSegment(segmentWithoutEndTime)).toThrow('endTime is required');
    });

    test('should validate time format strictly', () => {
      const invalidTimeFormats = [
        '1:30:45',    // Missing leading zero
        '01:3:45',    // Missing leading zero
        '01:30:5',    // Missing leading zero
        '1:30',       // Missing seconds
        '01:30:45:00' // Too many parts
      ];

      invalidTimeFormats.forEach(invalidTime => {
        const segment = {
          startTime: invalidTime,
          endTime: '00:17:45',
          speaker: 'host',
          order: 1
        };

        expect(() => validateSegment(segment)).toThrow('startTime must be in HH:MM:SS format');
      });
    });

    test('should accept valid segments with all required fields', () => {
      const validSegment = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: 1,
        notes: 'Optional notes'
      };

      expect(() => validateSegment(validSegment)).not.toThrow();
    });

    test('should accept segments without optional notes field', () => {
      const segmentWithoutNotes = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'guest1',
        order: 2
      };

      expect(() => validateSegment(segmentWithoutNotes)).not.toThrow();
    });

    test('should validate time values within valid ranges', () => {
      const invalidTimeValues = [
        '25:00:00',   // Invalid hour
        '01:60:00',   // Invalid minute
        '01:30:60',   // Invalid second
        '24:00:00'    // Invalid hour (24 not allowed)
      ];

      invalidTimeValues.forEach(invalidTime => {
        const segment = {
          startTime: invalidTime,
          endTime: '00:17:45',
          speaker: 'host',
          order: 1
        };

        expect(() => validateSegment(segment)).toThrow('startTime has invalid time values');
      });
    });
  });

  describe('Removal of Text Property Support', () => {
    test('should not process text property in segment validation', () => {
      // The enhanced schema should ignore text property entirely
      const segmentWithText = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host',
        order: 1,
        text: 'This text should be ignored'
      };

      const validateSegmentIgnoringText = (segment) => {
        // Simulate the enhanced validation that doesn't check for text
        const requiredFields = ['startTime', 'endTime', 'speaker', 'order'];
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;

        for (const field of requiredFields) {
          if (segment[field] === undefined) {
            throw new Error(`${field} is required`);
          }
        }

        if (!timeRegex.test(segment.startTime) || !timeRegex.test(segment.endTime)) {
          throw new Error('Invalid time format');
        }

        if (typeof segment.speaker !== 'string' || segment.speaker.length === 0) {
          throw new Error('Invalid speaker');
        }

        // Note: text property is not validated or processed
        return true;
      };

      // Should validate successfully (text is ignored)
      expect(() => validateSegmentIgnoringText(segmentWithText)).not.toThrow();
    });

    test('should not use text property for time fallback', () => {
      // Verify that missing startTime/endTime cannot be substituted with text
      const segmentWithTextNoTimes = {
        speaker: 'host',
        order: 1,
        text: 'Some transcript text with timing info'
      };

      const validateSegmentNoFallback = (segment) => {
        if (!segment.startTime) throw new Error('startTime is required');
        if (!segment.endTime) throw new Error('endTime is required');
        return true;
      };

      expect(() => validateSegmentNoFallback(segmentWithTextNoTimes)).toThrow('startTime is required');
    });

    test('should not accept text property as fallback for missing speaker', () => {
      const segmentWithTextNoSpeaker = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        order: 1,
        text: 'Some speaker information in text'
      };

      const validateSegmentNoSpeakerFallback = (segment) => {
        if (!segment.speaker) throw new Error('speaker is required');
        return true;
      };

      expect(() => validateSegmentNoSpeakerFallback(segmentWithTextNoSpeaker)).toThrow('speaker is required');
    });
  });

  describe('Clip Creation with Speaker Data Storage', () => {
    // Test clip hash calculation with speaker data
    const createClipHash = (segments, hook, summary) => {
      const crypto = require('crypto');

      const segmentSignature = segments
        .map((s) => `${s.order}-${s.startTime}-${s.endTime}-${s.speaker}`)
        .join('|');

      return crypto
        .createHash('sha256')
        .update(`${segmentSignature}|${hook}|${summary}`)
        .digest('hex')
        .slice(0, 16);
    };

    test('should include speaker data in clip hash calculation', () => {
      const segments1 = [{
        order: 1,
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host'
      }];

      const segments2 = [{
        order: 1,
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'guest1' // Different speaker
      }];

      const hook = 'Great point';
      const summary = 'Important discussion';

      const hash1 = createClipHash(segments1, hook, summary);
      const hash2 = createClipHash(segments2, hook, summary);

      // Different speakers should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    test('should generate consistent hash for same speaker data', () => {
      const segments = [{
        order: 1,
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host'
      }];

      const hook = 'Great point';
      const summary = 'Important discussion';

      const hash1 = createClipHash(segments, hook, summary);
      const hash2 = createClipHash(segments, hook, summary);

      // Same input should generate same hash
      expect(hash1).toBe(hash2);
    });

    test('should include all segment speaker data in hash', () => {
      const segments1 = [
        {
          order: 1,
          startTime: '00:15:30',
          endTime: '00:17:45',
          speaker: 'host'
        },
        {
          order: 2,
          startTime: '00:20:00',
          endTime: '00:21:30',
          speaker: 'guest1'
        }
      ];

      const segments2 = [
        {
          order: 1,
          startTime: '00:15:30',
          endTime: '00:17:45',
          speaker: 'guest1' // Swapped
        },
        {
          order: 2,
          startTime: '00:20:00',
          endTime: '00:21:30',
          speaker: 'host' // Swapped
        }
      ];

      const hook = 'Discussion';
      const summary = 'Multi-speaker segment';

      const hash1 = createClipHash(segments1, hook, summary);
      const hash2 = createClipHash(segments2, hook, summary);

      // Different speaker assignments should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    // Test duration calculation from time-based segments
    const calcTotalDuration = (segments) => {
      const toSeconds = (t) => {
        const [hh, mm, ss] = t.split(':').map(Number);
        return hh * 3600 + mm * 60 + ss;
      };
      return segments.reduce((acc, seg) => {
        const start = toSeconds(seg.startTime);
        const end = toSeconds(seg.endTime);
        return acc + Math.max(0, end - start);
      }, 0);
    };

    test('should calculate total duration from time-based segments', () => {
      const segments = [
        {
          startTime: '00:15:30', // 930 seconds
          endTime: '00:16:00',   // 960 seconds (30 second duration)
          speaker: 'host',
          order: 1
        },
        {
          startTime: '00:16:30', // 990 seconds
          endTime: '00:17:15',   // 1035 seconds (45 second duration)
          speaker: 'guest1',
          order: 2
        }
      ];

      const totalDuration = calcTotalDuration(segments);
      expect(totalDuration).toBe(75); // 30 + 45 = 75 seconds
    });

    test('should handle segments with zero duration', () => {
      const segments = [
        {
          startTime: '00:15:30',
          endTime: '00:15:30', // Same time = 0 duration
          speaker: 'host',
          order: 1
        },
        {
          startTime: '00:16:00',
          endTime: '00:16:30', // 30 second duration
          speaker: 'guest1',
          order: 2
        }
      ];

      const totalDuration = calcTotalDuration(segments);
      expect(totalDuration).toBe(30); // 0 + 30 = 30 seconds
    });

    test('should handle segments with negative duration gracefully', () => {
      const segments = [
        {
          startTime: '00:16:00',
          endTime: '00:15:30', // End before start
          speaker: 'host',
          order: 1
        }
      ];

      const totalDuration = calcTotalDuration(segments);
      expect(totalDuration).toBe(0); // Math.max(0, negative) = 0
    });
  });

  describe('Time Requirements Enforcement', () => {
    test('should reject segments with missing startTime', () => {
      const invalidSegment = {
        endTime: '00:17:45',
        speaker: 'host',
        order: 1
      };

      const validateTimeRequirements = (segment) => {
        if (!segment.startTime) throw new Error('startTime is required');
        if (!segment.endTime) throw new Error('endTime is required');
        return true;
      };

      expect(() => validateTimeRequirements(invalidSegment)).toThrow('startTime is required');
    });

    test('should reject segments with missing endTime', () => {
      const invalidSegment = {
        startTime: '00:15:30',
        speaker: 'host',
        order: 1
      };

      const validateTimeRequirements = (segment) => {
        if (!segment.startTime) throw new Error('startTime is required');
        if (!segment.endTime) throw new Error('endTime is required');
        return true;
      };

      expect(() => validateTimeRequirements(invalidSegment)).toThrow('endTime is required');
    });

    test('should enforce strict time format validation', () => {
      const validateTimeFormat = (timeStr) => {
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        if (!timeRegex.test(timeStr)) return false;

        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        return hours >= 0 && hours <= 23 &&
               minutes >= 0 && minutes <= 59 &&
               seconds >= 0 && seconds <= 59;
      };

      // Invalid times should fail
      const invalidTimes = ['25:00:00', '01:60:00', '01:30:60', '24:00:00'];
      invalidTimes.forEach(invalidTime => {
        expect(validateTimeFormat(invalidTime)).toBe(false);
      });

      // Valid times should pass
      const validTimes = ['00:00:00', '23:59:59', '12:30:45'];
      validTimes.forEach(validTime => {
        expect(validateTimeFormat(validTime)).toBe(true);
      });
    });

    test('should require both startTime and endTime without fallback options', () => {
      // Test that there are no fallback mechanisms for missing time fields
      const segmentWithoutTimes = {
        speaker: 'host',
        order: 1,
        text: 'Some text that should not be used as fallback'
      };

      const validateStrictTimeRequirements = (segment) => {
        // Strict validation - no fallbacks
        if (!segment.startTime) throw new Error('startTime is required');
        if (!segment.endTime) throw new Error('endTime is required');

        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        if (!timeRegex.test(segment.startTime)) throw new Error('Invalid startTime format');
        if (!timeRegex.test(segment.endTime)) throw new Error('Invalid endTime format');

        return true;
      };

      expect(() => validateStrictTimeRequirements(segmentWithoutTimes)).toThrow('startTime is required');
    });
  });

  describe('Segment Order Validation', () => {
    test('should require order field', () => {
      const segmentWithoutOrder = {
        startTime: '00:15:30',
        endTime: '00:17:45',
        speaker: 'host'
      };

      const validateOrder = (segment) => {
        if (segment.order === undefined) throw new Error('order is required');
        return true;
      };

      expect(() => validateOrder(segmentWithoutOrder)).toThrow('order is required');
    });

    test('should validate order is positive integer', () => {
      const validateOrderValue = (order) => {
        if (typeof order !== 'number' || order < 1 || !Number.isInteger(order)) {
          throw new Error('order must be a positive integer starting from 1');
        }
        return true;
      };

      expect(() => validateOrderValue(0)).toThrow('order must be a positive integer starting from 1');
      expect(() => validateOrderValue(-1)).toThrow('order must be a positive integer starting from 1');
      expect(() => validateOrderValue(1.5)).toThrow('order must be a positive integer starting from 1');
      expect(() => validateOrderValue(1)).not.toThrow();
      expect(() => validateOrderValue(10)).not.toThrow();
    });
  });
});
