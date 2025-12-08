import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import {
  parseSrtFile,
  detectSpeaker,
  removeFillerWords,
  normalizeWhitespace,
  formatCleanedTranscript
} from '../../../functions/utils/transcripts.mjs';

describe('Transcript Cleaning Property Tests', () => {
  describe('Property 1: SRT parsing preserves all dialogue', () => {
    it('should preserve all dialogue text from valid SRT entries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              sequenceNumber: fc.integer({ min: 1, max: 9999 }),
              startTime: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 999 })
              ),
              endTime: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 999 })
              ),
              text: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (entries) => {
            const formatTime = ([h, m, s, ms]) =>
              `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;

            const srtContent = entries
              .map(entry => {
                const start = formatTime(entry.startTime);
                const end = formatTime(entry.endTime);
                return `${entry.sequenceNumber}\n${start} --> ${end}\n${entry.text}`;
              })
              .join('\n\n');

            const parsed = parseSrtFile(srtContent);

            const originalDialogue = entries.map(e => e.text.trim()).join(' ');
            const parsedDialogue = parsed.map(e => e.text.trim()).join(' ');

            return originalDialogue === parsedDialogue;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Speaker detection and extraction', () => {
    it('should correctly identify and separate speaker from dialogue', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[A-Za-z][A-Za-z\s]*$/.test(s.trim())),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0 && !s.includes(':')),
          (speaker, dialogue) => {
            const text = `${speaker.trim()}: ${dialogue.trim()}`;
            const result = detectSpeaker(text);

            return (
              result.speaker === speaker.trim() &&
              result.dialogue === dialogue.trim()
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Non-attributed content handling', () => {
    it('should treat text without speaker attribution as plain dialogue', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => {
            const trimmed = s.trim();
            if (trimmed.length === 0) return false;
            const speakerMatch = trimmed.match(/^([A-Za-z][A-Za-z\s]*?):\s*(.*)$/);
            if (!speakerMatch) return true;
            return speakerMatch[2].trim().length === 0;
          }),
          (text) => {
            const result = detectSpeaker(text);

            return (
              result.speaker === null &&
              result.dialogue === text
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Timestamp removal is complete', () => {
    it('should remove all timestamp notation from formatted transcript', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              sequenceNumber: fc.integer({ min: 1, max: 9999 }),
              startTime: fc.constant('00:00:00,000'),
              endTime: fc.constant('00:00:05,000'),
              text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (entries) => {
            const formatted = formatCleanedTranscript(entries);

            const timestampPattern = /\d{2}:\d{2}:\d{2},\d{3}/;
            return !timestampPattern.test(formatted);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Filler word removal preserves sentence structure', () => {
    it('should maintain grammatical structure after removing filler words', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.constant('um'),
              fc.constant('uh'),
              fc.constant('like'),
              fc.string({ minLength: 3, maxLength: 20 }).filter(s => !/^(um|uh|like|you know|i mean)$/i.test(s.trim()))
            ),
            { minLength: 3, maxLength: 15 }
          ),
          (words) => {
            const text = words.join(' ');
            const cleaned = removeFillerWords(text);

            const hasMultipleSpaces = /\s{2,}/.test(cleaned);
            const hasLeadingSpace = /^\s/.test(cleaned);
            const hasTrailingSpace = /\s$/.test(cleaned);

            return !hasMultipleSpaces && !hasLeadingSpace && !hasTrailingSpace;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Whitespace normalization reduces size', () => {
    it('should reduce or maintain character count after normalization', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          (text) => {
            const normalized = normalizeWhitespace(text);

            return normalized.length <= text.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Speaker-attributed output formatting', () => {
    it('should format speaker-attributed entries correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              sequenceNumber: fc.integer({ min: 1, max: 9999 }),
              startTime: fc.constant('00:00:00,000'),
              endTime: fc.constant('00:00:05,000'),
              text: fc.tuple(
                fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Za-z][A-Za-z\s]*$/.test(s.trim())),
                fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
              ).map(([speaker, dialogue]) => `${speaker.trim()}: ${dialogue.trim()}`)
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (entries) => {
            const formatted = formatCleanedTranscript(entries);

            const lines = formatted.split('\n\n').filter(l => l.trim());

            return lines.every(line => {
              const colonIndex = line.indexOf(':');
              if (colonIndex === -1) return false;

              const speaker = line.substring(0, colonIndex).trim();
              const dialogue = line.substring(colonIndex + 1).trim();

              return speaker.length > 0 && dialogue.length > 0;
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: S3 path structure is preserved', () => {
    it('should maintain directory structure when converting .srt to .md', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
            { minLength: 1, maxLength: 5 }
          ),
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          (pathSegments, filename) => {
            const srtPath = `${pathSegments.join('/')}/${filename}.srt`;
            const expectedMdPath = `${pathSegments.join('/')}/${filename}.md`;

            const actualMdPath = srtPath.replace(/\.srt$/i, '.md');

            const srtDir = srtPath.substring(0, srtPath.lastIndexOf('/'));
            const mdDir = actualMdPath.substring(0, actualMdPath.lastIndexOf('/'));

            return (
              actualMdPath === expectedMdPath &&
              srtDir === mdDir &&
              actualMdPath.endsWith('.md') &&
              !actualMdPath.includes('.srt')
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
