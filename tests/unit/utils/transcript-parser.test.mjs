import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { extractSpeakersFromTranscript } from '../../../functions/utils/speakers.mjs';
import { Readable } from 'stream';

const s3Mock = mockClient(S3Client);

const createMockStream = (content) => {
  const stream = new Readable();
  stream.push(content);
  stream.push(null);
  stream.transformToString = async () => content;
  return stream;
};

describe('Transcript Parser', () => {
  beforeEach(() => {
    s3Mock.reset();
    process.env.BUCKET_NAME = 'test-bucket';
  });

  describe('extractSpeakersFromTranscript', () => {
    it('should extract speakers with colon format', async () => {
      const transcript = `1
00:00:01,000 --> 00:00:05,000
Alice: Hello everyone, welcome to the show.

2
00:00:06,000 --> 00:00:10,000
Bob: Thanks for having me, Alice.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toContain('Alice');
      expect(speakers).toContain('Bob');
      expect(speakers).toHaveLength(2);
    });

    it('should extract speakers with bracket format', async () => {
      const transcript = `1
00:00:01,000 --> 00:00:05,000
[Alice] Hello everyone, welcome to the show.

2
00:00:06,000 --> 00:00:10,000
[Bob] Thanks for having me, Alice.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toContain('Alice');
      expect(speakers).toContain('Bob');
      expect(speakers).toHaveLength(2);
    });

    it('should extract speakers with angle bracket format', async () => {
      const transcript = `1
00:00:01,000 --> 00:00:05,000
<Alice> Hello everyone, welcome to the show.

2
00:00:06,000 --> 00:00:10,000
<Bob> Thanks for having me, Alice.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toContain('Alice');
      expect(speakers).toContain('Bob');
      expect(speakers).toHaveLength(2);
    });

    it('should deduplicate speaker names', async () => {
      const transcript = `1
00:00:01,000 --> 00:00:05,000
Alice: First line.

2
00:00:06,000 --> 00:00:10,000
Bob: Second line.

3
00:00:11,000 --> 00:00:15,000
Alice: Third line.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toContain('Alice');
      expect(speakers).toContain('Bob');
      expect(speakers).toHaveLength(2);
    });

    it('should handle mixed speaker formats', async () => {
      const transcript = `1
00:00:01,000 --> 00:00:05,000
Alice: First line.

2
00:00:06,000 --> 00:00:10,000
[Bob] Second line.

3
00:00:11,000 --> 00:00:15,000
<Charlie> Third line.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toContain('Alice');
      expect(speakers).toContain('Bob');
      expect(speakers).toContain('Charlie');
      expect(speakers).toHaveLength(3);
    });

    it('should trim whitespace from speaker names', async () => {
      const transcript = `1
00:00:01,000 --> 00:00:05,000
  Alice  : First line.

2
00:00:06,000 --> 00:00:10,000
[  Bob  ] Second line.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toContain('Alice');
      expect(speakers).toContain('Bob');
      expect(speakers).toHaveLength(2);
    });

    it('should return empty array for transcript with no speakers', async () => {
      const transcript = `1
00:00:01,000 --> 00:00:05,000
This is just plain text without speaker annotations.

2
00:00:06,000 --> 00:00:10,000
More text without speakers.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toHaveLength(0);
    });

    it('should return empty array for empty transcript', async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream('')
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toHaveLength(0);
    });

    it('should handle S3 errors gracefully', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 error'));

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toHaveLength(0);
    });

    it('should validate speaker name length', async () => {
      const longName = 'A'.repeat(101);
      const transcript = `1
00:00:01,000 --> 00:00:05,000
${longName}: This speaker name is too long.

2
00:00:06,000 --> 00:00:10,000
Bob: Valid speaker.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).not.toContain(longName);
      expect(speakers).toContain('Bob');
      expect(speakers).toHaveLength(1);
    });

    it('should handle speakers with spaces in names', async () => {
      const transcript = `1
00:00:01,000 --> 00:00:05,000
Alice Johnson: First line.

2
00:00:06,000 --> 00:00:10,000
Bob Smith: Second line.`;

      s3Mock.on(GetObjectCommand).resolves({
        Body: createMockStream(transcript)
      });

      const speakers = await extractSpeakersFromTranscript('test-key');

      expect(speakers).toContain('Alice Johnson');
      expect(speakers).toContain('Bob Smith');
      expect(speakers).toHaveLength(2);
    });
  });
});
