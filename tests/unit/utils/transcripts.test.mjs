import { preprocessTranscript, parseSrtEntry, extractSpeakerFromText, timeToSeconds, secondsToTime } from '../../../functions/utils/transcripts.mjs';

describe('Transcript Processing', () => {
  describe('parseSrtEntry', () => {
    it('should parse valid SRT entry', () => {
      const entry = `37
00:02:21,060 --> 00:02:25,800
Andres: This is Andres Moreno, principal architect at Calin.`;

      const result = parseSrtEntry(entry);

      expect(result).toEqual({
        sequenceNumber: 37,
        startTime: '00:02:21,060',
        endTime: '00:02:25,800',
        text: 'Andres: This is Andres Moreno, principal architect at Calin.'
      });
    });

    it('should return null for invalid entry', () => {
      const entry = 'invalid entry';
      const result = parseSrtEntry(entry);
      expect(result).toBeNull();
    });
  });

  describe('extractSpeakerFromText', () => {
    it('should extract speaker and text', () => {
      const result = extractSpeakerFromText('Allen: This is a test');
      expect(result).toEqual({
        speaker: 'Allen',
        text: 'This is a test'
      });
    });

    it('should handle text without speaker', () => {
      const result = extractSpeakerFromText('Just some text');
      expect(result).toEqual({
        speaker: null,
        text: 'Just some text'
      });
    });
  });

  describe('timeToSeconds', () => {
    it('should convert time string to seconds', () => {
      expect(timeToSeconds('00:02:21,060')).toBe(141.06);
      expect(timeToSeconds('01:30:45,500')).toBe(5445.5);
    });
  });

  describe('secondsToTime', () => {
    it('should convert seconds to time string', () => {
      expect(secondsToTime(141.06)).toBe('00:02:21,060');
      expect(secondsToTime(5445.5)).toBe('01:30:45,500');
    });
  });

  describe('preprocessTranscript', () => {
    it('should merge fragmented segments from same speaker', () => {
      const rawSrt = `37
00:02:21,060 --> 00:02:25,800
Andres: This is Andres Moreno,

38
00:02:27,690 --> 00:02:28,080
principal architect at Calin.

39
00:02:28,080 --> 00:02:30,810
And my coworker here, Brian Tarbox.`;

      const result = preprocessTranscript(rawSrt);

      expect(result).toContain('Andres: This is Andres Moreno, principal architect at Calin. And my coworker here, Brian Tarbox.');
      expect(result).toContain('00:02:21,060 --> 00:02:30,810');
    });

    it('should handle speaker changes', () => {
      const rawSrt = `40
00:02:30,810 --> 00:02:32,100
Hey, how you doing Brian?

41
00:02:33,000 --> 00:02:33,600
Thanks for joining us.

42
00:02:33,600 --> 00:02:33,720
That's

43
00:02:33,720 --> 00:02:33,870
Allen: right.`;

      const result = preprocessTranscript(rawSrt);

      expect(result).toContain('Hey, how you doing Brian? Thanks for joining us. That\'s');
      expect(result).toContain('Allen: right.');
    });

    it('should handle gaps between segments', () => {
      const rawSrt = `44
00:02:33,870 --> 00:02:36,900
Allen: And fellow, uh, fellow AWS hero as well.

45
00:02:36,930 --> 00:02:37,710
You see we're close.

46
00:02:38,100 --> 00:02:38,400
Six

47
00:02:38,400 --> 00:02:41,460
Andres: degrees of separation is just one degree for you and me.`;

      const result = preprocessTranscript(rawSrt);

      expect(result).toContain('Allen: And fellow, uh, fellow AWS hero as well. You see we\'re close. Six');
      expect(result).toContain('Andres: degrees of separation is just one degree for you and me.');
    });

    it('should filter out empty segments', () => {
      const rawSrt = `48
00:02:42,000 --> 00:02:42,420
Uh,

49
00:02:43,080 --> 00:02:43,380
Allen: yes.

50
00:02:44,280 --> 00:02:44,580
Yes.`;

      const result = preprocessTranscript(rawSrt);

      expect(result).toContain('Allen: yes. Yes.');
      expect(result).not.toContain('Uh,');
    });
  });
});
