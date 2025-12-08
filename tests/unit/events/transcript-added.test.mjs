import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall } from '@aws-sdk/util-dynamodb';
import { sdkStreamMixin } from '@smithy/util-stream';
import { Readable } from 'stream';

const ddbClientMock = mockClient(DynamoDBClient);
const ddbDocMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);
const eventBridgeMock = mockClient(EventBridgeClient);

const createMockStream = (content) => {
  const stream = new Readable();
  stream.push(content);
  stream.push(null);
  return sdkStreamMixin(stream);
};

describe('Transcript Added Handler', () => {
  beforeEach(() => {
    ddbClientMock.reset();
    ddbDocMock.reset();
    s3Mock.reset();
    eventBridgeMock.reset();
    process.env.TABLE_NAME = 'test-table';
    process.env.BUCKET_NAME = 'test-bucket';
  });

  afterEach(() => {
    ddbClientMock.reset();
    ddbDocMock.reset();
    s3Mock.reset();
    eventBridgeMock.reset();
  });

  describe('SRT parsing with valid entries', () => {
    it('should parse valid SRT content correctly', async () => {
      const srtContent = `1
00:00:00,000 --> 00:00:05,000
Allen: Hello there

2
00:00:05,500 --> 00:00:10,000
Andres: How are you doing?`;

      s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: createMockStream(srtContent) }));

      const episode = {
        pk: 'tenant123#episode-456',
        sk: 'metadata',
        title: 'Test Episode',
        speakers: []
      };

      ddbClientMock.on(GetItemCommand).resolves({ Item: marshall(episode) });
      ddbClientMock.on(UpdateItemCommand).resolves({});
      ddbClientMock.on(DeleteItemCommand).resolves({});
      ddbDocMock.on(UpdateCommand).resolves({});
      s3Mock.on(PutObjectCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const { handler } = await import('../../../functions/events/transcript-added.mjs');

      const event = {
        detail: {
          object: {
            key: 'tenant123/episode-456/transcript.srt'
          }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(s3Mock.calls().length).toBeGreaterThan(0);

      const putObjectCalls = s3Mock.commandCalls(PutObjectCommand);
      expect(putObjectCalls.length).toBe(1);
      expect(putObjectCalls[0].args[0].input.Key).toBe('tenant123/episode-456/transcript.md');
    });
  });

  describe('Speaker detection with various formats', () => {
    it('should handle speaker-attributed SRT entries', async () => {
      const srtContent = `1
00:00:00,000 --> 00:00:05,000
Allen: This is a test

2
00:00:05,500 --> 00:00:10,000
Andres: Another test`;

      s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: createMockStream(srtContent) }));

      const episode = {
        pk: 'tenant123#episode-456',
        sk: 'metadata',
        speakers: []
      };

      ddbClientMock.on(GetItemCommand).resolves({ Item: marshall(episode) });
      ddbClientMock.on(UpdateItemCommand).resolves({});
      ddbClientMock.on(DeleteItemCommand).resolves({});
      ddbDocMock.on(UpdateCommand).resolves({});
      s3Mock.on(PutObjectCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const { handler } = await import('../../../functions/events/transcript-added.mjs');

      const event = {
        detail: {
          object: {
            key: 'tenant123/episode-456/transcript.srt'
          }
        }
      };

      await handler(event);

      const putObjectCalls = s3Mock.commandCalls(PutObjectCommand);
      expect(putObjectCalls.length).toBe(1);

      const uploadedContent = putObjectCalls[0].args[0].input.Body;
      expect(uploadedContent).toContain('Allen:');
      expect(uploadedContent).toContain('Andres:');
    });


  });

  describe('Handling of malformed entries', () => {
    it('should skip invalid SRT entries and continue processing', async () => {
      const srtContent = `1
00:00:00,000 --> 00:00:05,000
Valid entry

INVALID ENTRY

2
00:00:05,500 --> 00:00:10,000
Another valid entry`;

      s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: createMockStream(srtContent) }));

      const episode = {
        pk: 'tenant123#episode-456',
        sk: 'metadata',
        speakers: []
      };

      ddbClientMock.on(GetItemCommand).resolves({ Item: marshall(episode) });
      ddbClientMock.on(UpdateItemCommand).resolves({});
      ddbClientMock.on(DeleteItemCommand).resolves({});
      ddbDocMock.on(UpdateCommand).resolves({});
      s3Mock.on(PutObjectCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const { handler } = await import('../../../functions/events/transcript-added.mjs');

      const event = {
        detail: {
          object: {
            key: 'tenant123/episode-456/transcript.srt'
          }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const putObjectCalls = s3Mock.commandCalls(PutObjectCommand);
      expect(putObjectCalls.length).toBe(1);
    });
  });

  describe('S3 upload of transcript.md', () => {
    it('should upload cleaned transcript to S3 with correct key', async () => {
      const srtContent = `1
00:00:00,000 --> 00:00:05,000
Test content`;

      s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: createMockStream(srtContent) }));

      const episode = {
        pk: 'tenant123#episode-456',
        sk: 'metadata',
        speakers: []
      };

      ddbClientMock.on(GetItemCommand).resolves({ Item: marshall(episode) });
      ddbClientMock.on(UpdateItemCommand).resolves({});
      ddbClientMock.on(DeleteItemCommand).resolves({});
      ddbDocMock.on(UpdateCommand).resolves({});
      s3Mock.on(PutObjectCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const { handler } = await import('../../../functions/events/transcript-added.mjs');

      const event = {
        detail: {
          object: {
            key: 'tenant123/episode-456/transcript.srt'
          }
        }
      };

      await handler(event);

      const putObjectCalls = s3Mock.commandCalls(PutObjectCommand);
      expect(putObjectCalls.length).toBe(1);
      expect(putObjectCalls[0].args[0].input.Bucket).toBe('test-bucket');
      expect(putObjectCalls[0].args[0].input.Key).toBe('tenant123/episode-456/transcript.md');
      expect(putObjectCalls[0].args[0].input.ContentType).toBe('text/markdown');
    });
  });

  describe('Existing metadata update still works', () => {
    it('should update episode metadata with transcript key', async () => {
      const srtContent = `1
00:00:00,000 --> 00:00:05,000
Test content`;

      s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: createMockStream(srtContent) }));

      const episode = {
        pk: 'tenant123#episode-456',
        sk: 'metadata',
        speakers: []
      };

      ddbClientMock.on(GetItemCommand).resolves({ Item: marshall(episode) });
      ddbClientMock.on(UpdateItemCommand).resolves({});
      ddbClientMock.on(DeleteItemCommand).resolves({});
      ddbDocMock.on(UpdateCommand).resolves({});
      s3Mock.on(PutObjectCommand).resolves({});
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const { handler } = await import('../../../functions/events/transcript-added.mjs');

      const event = {
        detail: {
          object: {
            key: 'tenant123/episode-456/transcript.srt'
          }
        }
      };

      await handler(event);

      const updateCalls = ddbClientMock.commandCalls(UpdateItemCommand);
      expect(updateCalls.length).toBeGreaterThan(0);

      const updateCall = updateCalls[0];
      expect(updateCall.args[0].input.TableName).toBe('test-table');
    });
  });

  describe('Error handling when .md upload fails', () => {
    it('should continue with metadata update even if .md upload fails', async () => {
      const srtContent = `1
00:00:00,000 --> 00:00:05,000
Test content`;

      s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: createMockStream(srtContent) }));

      const episode = {
        pk: 'tenant123#episode-456',
        sk: 'metadata',
        speakers: []
      };

      ddbClientMock.on(GetItemCommand).resolves({ Item: marshall(episode) });
      ddbClientMock.on(UpdateItemCommand).resolves({});
      ddbClientMock.on(DeleteItemCommand).resolves({});
      ddbDocMock.on(UpdateCommand).resolves({});
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 upload failed'));
      eventBridgeMock.on(PutEventsCommand).resolves({});

      const { handler } = await import('../../../functions/events/transcript-added.mjs');

      const event = {
        detail: {
          object: {
            key: 'tenant123/episode-456/transcript.srt'
          }
        }
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      const updateCalls = ddbClientMock.commandCalls(UpdateItemCommand);
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });
});

