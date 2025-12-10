import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddbMock = mockClient(DynamoDBClient);
const docClientMock = mockClient(DynamoDBDocumentClient);

jest.mock('../../../functions/utils/agents.mjs', () => ({
  converse: jest.fn()
}));

jest.mock('../../../functions/utils/tools.mjs', () => ({
  convertToBedrockTools: jest.fn()
}));

jest.mock('../../../functions/utils/transcripts.mjs', () => ({
  loadTranscript: jest.fn()
}));

jest.mock('../../../functions/utils/workflow-steps.mjs', () => ({
  updateWorkflowStepStatus: jest.fn(),
  WORKFLOW_STEPS: {
    GENERATE_CONTENT: 'generateContent'
  }
}));

jest.mock('../../../functions/utils/agent-status.mjs', () => ({
  AGENT_TYPES: {
    CLIP_DETECTOR: 'clip_detector'
  },
  AGENT_STATUS: {
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    FAILED: 'Failed'
  },
  updateAgentStatus: jest.fn(),
  checkAllAgentsComplete: jest.fn(),
  isContentGenerationComplete: jest.fn()
}));

import { handler } from '../../../functions/agents/clip-detector.mjs';
import { converse } from '../../../functions/utils/agents.mjs';
import { convertToBedrockTools } from '../../../functions/utils/tools.mjs';
import { loadTranscript } from '../../../functions/utils/transcripts.mjs';
import { updateWorkflowStepStatus } from '../../../functions/utils/workflow-steps.mjs';
import { updateAgentStatus, checkAllAgentsComplete, isContentGenerationComplete } from '../../../functions/utils/agent-status.mjs';

describe('Clip Detector Agent', () => {
  beforeEach(() => {
    ddbMock.reset();
    docClientMock.reset();
    converse.mockReset();
    convertToBedrockTools.mockReturnValue([]);
    loadTranscript.mockReset();
    updateWorkflowStepStatus.mockResolvedValue();
    updateAgentStatus.mockResolvedValue();
    checkAllAgentsComplete.mockResolvedValue(false);
    isContentGenerationComplete.mockResolvedValue(false);

    process.env.TABLE_NAME = 'test-table';
    process.env.MODEL_ID = 'us.amazon.nova-pro-v1:0';
    process.env.BUCKET_NAME = 'test-bucket';
  });

  const createS3Event = (key) => ({
    detail: {
      object: {
        key: encodeURIComponent(key)
      }
    }
  });

  const sampleSrtTranscript = `1
00:00:20,925 --> 00:00:27,104
Allen: Sometimes it's a breakthrough

2
00:00:28,000 --> 00:00:30,500
Andres: We try it out live

3
00:00:31,000 --> 00:00:35,000
Allen: That's what makes it interesting`;

  describe('Event triggering and SRT file loading', () => {
    it('should trigger on .srt file upload event', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Clips detected successfully');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode',
          userId: 'user-789'
        })
      });

      const result = await handler(createS3Event(srtKey));

      expect(loadTranscript).toHaveBeenCalledWith(srtKey);
      expect(result.statusCode).toBe(200);
    });

    it('should load .srt file from event key', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await handler(createS3Event(srtKey));

      expect(loadTranscript).toHaveBeenCalledWith(srtKey);
      expect(loadTranscript).toHaveBeenCalledTimes(1);
    });

    it('should handle URL-encoded S3 keys', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';
      const encodedKey = encodeURIComponent(srtKey);

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await handler({
        detail: {
          object: {
            key: encodedKey
          }
        }
      });

      expect(loadTranscript).toHaveBeenCalledWith(srtKey);
    });

    it('should skip processing if content generation already complete', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      isContentGenerationComplete.mockResolvedValue(true);

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Content already generated');
      expect(loadTranscript).not.toHaveBeenCalled();
      expect(converse).not.toHaveBeenCalled();
    });
  });

  describe('Timestamp extraction accuracy', () => {
    it('should pass SRT transcript with exact timestamps to AI agent', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Clips created');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await handler(createS3Event(srtKey));

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];

      // Verify the transcript is passed with exact timestamps
      expect(userPrompt).toContain('00:00:20,925 --> 00:00:27,104');
      expect(userPrompt).toContain('00:00:28,000 --> 00:00:30,500');
      expect(userPrompt).toContain('00:00:31,000 --> 00:00:35,000');
    });

    it('should instruct AI to copy timestamps exactly', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await handler(createS3Event(srtKey));

      const converseCall = converse.mock.calls[0];
      const systemPrompt = converseCall[1];

      // Verify instructions emphasize exact timestamp copying
      expect(systemPrompt).toContain('CRITICAL: You MUST copy timestamps EXACTLY');
      expect(systemPrompt).toContain('Do not estimate, round, or approximate timestamps');
      expect(systemPrompt).toContain('copy them character-for-character');
    });

    it('should preserve millisecond precision in timestamps', async () => {
      const srtWithMilliseconds = `1
00:00:20,925 --> 00:00:27,104
Allen: Test with milliseconds

2
00:01:15,001 --> 00:01:20,999
Andres: Another test`;

      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(srtWithMilliseconds);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await handler(createS3Event(srtKey));

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];

      // Verify milliseconds are preserved
      expect(userPrompt).toContain(',925');
      expect(userPrompt).toContain(',104');
      expect(userPrompt).toContain(',001');
      expect(userPrompt).toContain(',999');
    });
  });

  describe('Output format consistency', () => {
    it('should maintain consistent output format', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Detected 5 clips from the transcript');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);
    });

    it('should use the correct model configuration', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await handler(createS3Event(srtKey));

      expect(converse).toHaveBeenCalled();
      const converseCall = converse.mock.calls[0];
      expect(converseCall[0]).toBe('us.amazon.nova-pro-v1:0');
    });
  });

  describe('Error handling', () => {
    it('should handle missing transcript gracefully', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(null);

      await expect(handler(createS3Event(srtKey))).rejects.toThrow('Could not find transcript');
    });

    it('should handle invalid S3 key format', async () => {
      const invalidKey = 'invalid-key-format';

      const result = await handler(createS3Event(invalidKey));

      expect(result.statusCode).toBe(200);
      expect(loadTranscript).not.toHaveBeenCalled();
    });

    it('should update agent status to failed on error', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockRejectedValue(new Error('AI processing failed'));

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await expect(handler(createS3Event(srtKey))).rejects.toThrow('AI processing failed');

      expect(updateAgentStatus).toHaveBeenCalledWith(
        'team#team-123',
        'episode-456',
        'clip_detector',
        'Failed',
        'AI processing failed'
      );
    });
  });

  describe('Agent status management', () => {
    it('should update agent status to in progress when starting', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await handler(createS3Event(srtKey));

      expect(updateAgentStatus).toHaveBeenCalledWith(
        'team#team-123',
        'episode-456',
        'clip_detector',
        'In Progress'
      );
    });

    it('should update agent status to completed on success', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      await handler(createS3Event(srtKey));

      expect(updateAgentStatus).toHaveBeenCalledWith(
        'team#team-123',
        'episode-456',
        'clip_detector',
        'Completed'
      );
    });

    it('should update episode status to Ready when all agents complete', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');
      checkAllAgentsComplete.mockResolvedValue(true);

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      docClientMock.on(UpdateCommand).resolves({});

      await handler(createS3Event(srtKey));

      expect(checkAllAgentsComplete).toHaveBeenCalledWith('team#team-123', 'episode-456');

      const updateCalls = docClientMock.commandCalls(UpdateCommand);
      expect(updateCalls.length).toBeGreaterThan(0);

      const lastUpdate = updateCalls[updateCalls.length - 1];
      expect(lastUpdate.args[0].input.ExpressionAttributeValues[':status']).toBe('Ready');
    });
  });

  describe('Episode context enrichment', () => {
    it('should include episode description in prompt when available', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode',
          description: 'This episode covers AI and machine learning',
          themes: ['AI', 'technology']
        })
      });

      await handler(createS3Event(srtKey));

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];

      expect(userPrompt).toContain('description: This episode covers AI and machine learning');
      expect(userPrompt).toContain('themes: AI, technology');
    });

    it('should work without episode metadata', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({});

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);
      expect(converse).toHaveBeenCalled();
    });

    it('should include trackCount and hasSpeakers in episode context', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode',
          trackCount: 2,
          hasSpeakers: true
        })
      });

      await handler(createS3Event(srtKey));

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];

      expect(userPrompt).toContain('trackCount: 2');
      expect(userPrompt).toContain('hasSpeakers: true');
    });
  });

  describe('Speaker guidance in system prompt', () => {
    it('should include speaker guidance in system prompt for single-track episodes without speakers', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode',
          trackCount: 1,
          hasSpeakers: false
        })
      });

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);
      expect(converse).toHaveBeenCalled();

      const converseCall = converse.mock.calls[0];
      const systemPrompt = converseCall[1];
      expect(systemPrompt).toContain('Speaker attribution in the transcript is OPTIONAL');
    });

    it('should include trackCount and hasSpeakers in user prompt', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode',
          trackCount: 1,
          hasSpeakers: true
        })
      });

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];
      expect(userPrompt).toContain('trackCount: 1');
      expect(userPrompt).toContain('hasSpeakers: true');
    });

    it('should handle multi-track episodes with speakers', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode',
          trackCount: 2,
          hasSpeakers: true
        })
      });

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];
      expect(userPrompt).toContain('trackCount: 2');
      expect(userPrompt).toContain('hasSpeakers: true');
    });

    it('should handle multi-track episodes without speakers', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode',
          trackCount: 3,
          hasSpeakers: false
        })
      });

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];
      expect(userPrompt).toContain('trackCount: 3');
      expect(userPrompt).toContain('hasSpeakers: false');
    });

    it('should handle episodes with no tracks uploaded', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode',
          trackCount: 0,
          hasSpeakers: false
        })
      });

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];
      expect(userPrompt).toContain('trackCount: 0');
      expect(userPrompt).toContain('hasSpeakers: false');
    });

    it('should default to trackCount 0 when not present in metadata', async () => {
      const srtKey = 'team#team-123/episode-456/transcript.srt';

      loadTranscript.mockResolvedValue(sampleSrtTranscript);
      converse.mockResolvedValue('Success');

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({
          pk: 'team#team-123#episode-456',
          sk: 'metadata',
          title: 'Test Episode'
        })
      });

      const result = await handler(createS3Event(srtKey));

      expect(result.statusCode).toBe(200);

      const converseCall = converse.mock.calls[0];
      const userPrompt = converseCall[2];
      expect(userPrompt).toContain('trackCount: 0');
      expect(userPrompt).toContain('hasSpeakers: false');
    });
  });
});

