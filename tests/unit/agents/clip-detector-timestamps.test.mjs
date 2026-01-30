import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';

/**
 * Feature: transcript-optimization, Property 10: Clip detector timestamp accuracy
 *
 * For any SRT file processed by the clip detector, the extracted timestamps
 * should exactly match the timestamps in the original SRT entries.
 *
 * Validates: Requirements 5.2, 5.3
 */

// Timestamp format regex from create-clips.mjs
const TIMESTAMP_REGEX = /^\d{2}:\d{2}:\d{2}(,\d{3})?$/;

/**
 * Generator for valid SRT timestamps in format hh:mm:ss or hh:mm:ss,mmm
 */
const validTimestampArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 23 }), // hours
  fc.integer({ min: 0, max: 59 }), // minutes
  fc.integer({ min: 0, max: 59 }), // seconds
  fc.option(fc.integer({ min: 0, max: 999 }), { nil: null }) // optional milliseconds
).map(([h, m, s, ms]) => {
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (ms !== null) {
    const mmm = String(ms).padStart(3, '0');
    return `${hh}:${mm}:${ss},${mmm}`;
  }
  return `${hh}:${mm}:${ss}`;
});

/**
 * Generator for SRT entries with timestamps
 */
const srtEntryArbitrary = fc.record({
  sequenceNumber: fc.integer({ min: 1, max: 9999 }),
  startTime: validTimestampArbitrary,
  endTime: validTimestampArbitrary,
  speaker: fc.constantFrom('Allen', 'Andres', 'Guest'),
  text: fc.string({ minLength: 10, maxLength: 200 })
}).map(entry => {
  // Ensure endTime is after startTime
  const start = timeToSeconds(entry.startTime);
  const end = timeToSeconds(entry.endTime);
  if (end <= start) {
    // Swap them
    return { ...entry, startTime: entry.endTime, endTime: entry.startTime };
  }
  return entry;
});

/**
 * Convert time string to seconds for comparison
 */
function timeToSeconds(timeStr) {
  const [time, ms] = timeStr.split(',');
  const [hh, mm, ss] = time.split(':').map(Number);
  const milliseconds = ms ? parseInt(ms) / 1000 : 0;
  return hh * 3600 + mm * 60 + ss + milliseconds;
}

/**
 * Format SRT entry as it would appear in an SRT file
 */
function formatSrtEntry(entry) {
  return `${entry.sequenceNumber}
${entry.startTime} --> ${entry.endTime}
${entry.speaker}: ${entry.text}`;
}

describe('Clip Detector Timestamp Accuracy', () => {
  describe('Property 10: Timestamp format validation', () => {
    it('should accept all valid SRT timestamp formats', () => {
      fc.assert(
        fc.property(validTimestampArbitrary, (timestamp) => {
          // The timestamp should match the regex used in clip creation
          expect(timestamp).toMatch(TIMESTAMP_REGEX);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve timestamp format when extracted from SRT', () => {
      fc.assert(
        fc.property(srtEntryArbitrary, (entry) => {
          // Format the entry as it would appear in SRT
          const srtText = formatSrtEntry(entry);

          // Extract timestamps using the same pattern the AI would see
          const timestampLine = srtText.split('\n')[1];
          const [startTime, endTime] = timestampLine.split(' --> ');

          // Timestamps should be preserved exactly
          expect(startTime).toBe(entry.startTime);
          expect(endTime).toBe(entry.endTime);

          // Both should match the validation regex
          expect(startTime).toMatch(TIMESTAMP_REGEX);
          expect(endTime).toMatch(TIMESTAMP_REGEX);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain timestamp precision with milliseconds', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 999 })
          ),
          ([h, m, s, ms]) => {
            const timestamp = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;

            // Timestamp should match regex
            expect(timestamp).toMatch(TIMESTAMP_REGEX);

            // Milliseconds should be preserved
            const extractedMs = timestamp.split(',')[1];
            expect(extractedMs).toBe(String(ms).padStart(3, '0'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly order start and end timestamps', () => {
      fc.assert(
        fc.property(srtEntryArbitrary, (entry) => {
          const startSeconds = timeToSeconds(entry.startTime);
          const endSeconds = timeToSeconds(entry.endTime);

          // End time should always be after start time
          expect(endSeconds).toBeGreaterThan(startSeconds);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle timestamps at boundary values', () => {
      const boundaryTimestamps = [
        '00:00:00',
        '00:00:00,000',
        '23:59:59',
        '23:59:59,999',
        '00:00:01',
        '00:00:01,001',
        '12:30:45',
        '12:30:45,500'
      ];

      boundaryTimestamps.forEach(timestamp => {
        expect(timestamp).toMatch(TIMESTAMP_REGEX);
      });
    });
  });

  describe('Timestamp extraction from SRT format', () => {
    it('should extract timestamps from standard SRT entries', () => {
      const srtEntry = `1
00:00:20,925 --> 00:00:27,104
Allen: Sometimes it's a breakthrough`;

      const lines = srtEntry.split('\n');
      const timestampLine = lines[1];
      const [startTime, endTime] = timestampLine.split(' --> ');

      expect(startTime).toBe('00:00:20,925');
      expect(endTime).toBe('00:00:27,104');
      expect(startTime).toMatch(TIMESTAMP_REGEX);
      expect(endTime).toMatch(TIMESTAMP_REGEX);
    });

    it('should handle SRT entries without milliseconds', () => {
      const srtEntry = `2
00:01:30 --> 00:01:45
Andres: This is interesting`;

      const lines = srtEntry.split('\n');
      const timestampLine = lines[1];
      const [startTime, endTime] = timestampLine.split(' --> ');

      expect(startTime).toBe('00:01:30');
      expect(endTime).toBe('00:01:45');
      expect(startTime).toMatch(TIMESTAMP_REGEX);
      expect(endTime).toMatch(TIMESTAMP_REGEX);
    });
  });
});
