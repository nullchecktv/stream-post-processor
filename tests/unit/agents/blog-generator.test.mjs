import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddbMock = mockClient(DynamoDBClient);
const eventBridgeMock = mockClient(EventBridgeClient);

jest.mock('../../../functions/utils/agents.mjs', () => ({
  converse: jest.fn()
}));

jest.mock('../../../functions/utils/tools.mjs', () => ({
  convertToBedrockTools: jest.fn()
}));

jest.mock('../../../functions/tools/web-search.mjs', () => ({
  webSearchTool: { name: 'webSearch' }
}));

jest.mock('../../../functions/utils/workflow-steps.mjs', () => ({
  updateWorkflowStepStatus: jest.fn(),
  WORKFLOW_STEPS: {
    GENERATE_PLAN: 'generatePlan',
    UPLOAD_TRANSCRIPT: 'uploadTranscript',
    UPLOAD_TRACKS: 'uploadTracks',
    GENERATE_CONTENT: 'generateContent'
  }
}));

import { handler } from '../../../functions/agents/blog-generator.mjs';
import { converse } from '../../../functions/utils/agents.mjs';
import { convertToBedrockTools } from '../../../functions/utils/tools.mjs';
import { updateWorkflowStepStatus } from '../../../functions/utils/workflow-steps.mjs';

describe('Blog Generator Agent', () => {
  beforeEach(() => {
    ddbMock.reset();
    eventBridgeMock.reset();
    converse.mockReset();
    convertToBedrockTools.mockReturnValue([]);
    updateWorkflowStepStatus.mockResolvedValue();
    process.env.TABLE_NAME = 'test-table';
    process.env.MODEL_ID = 'amazon.nova-pro-v1:0';

    eventBridgeMock.on(PutEventsCommand).resolves({});
  });

  const createEvent = (detail) => ({
    detail: {
      episodeId: 'episode-123',
      tenantId: 'team#team-456',
      userId: 'user-789',
      ...detail
    }
  });

  it('should generate blog content from outline', async () => {
    const outline = '# Introduction\n\n## Main Points\n\n## Conclusion';
    const generatedContent = '# Complete Blog Post\n\nThis is the generated content...';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline,
            status: 'outline_generated'
          })
        };
      }
      if (key.sk === 'metadata') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'metadata',
            title: 'Test Episode',
            description: 'Test description',
            themes: ['technology', 'AI']
          })
        };
      }
      return {};
    });

    ddbMock.on(QueryCommand).resolves({
      Items: [
        marshall({
          pk: 'team#team-456#episode-123',
          sk: 'data#quote#quote-1',
          text: 'This is a great quote',
          speaker: 'John Doe',
          timestamp: '00:15:30'
        })
      ]
    });

    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockResolvedValue(generatedContent);

    const result = await handler(createEvent({}));

    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('Blog content generated successfully');
    expect(result.wordCount).toBeGreaterThan(0);
    expect(converse).toHaveBeenCalled();

    const callArgs = converse.mock.calls[0];
    expect(callArgs[0]).toBe('amazon.nova-pro-v1:0');
    expect(callArgs[1]).toContain('BlogForge');
    expect(callArgs[2]).toContain('Blog Outline:');
    expect(callArgs[4]).toEqual({ tenantId: 'team#team-456', userId: 'user-789' });
  });

  it('should return 404 when outline not found', async () => {
    ddbMock.on(GetItemCommand).resolves({});

    const result = await handler(createEvent({}));

    expect(result.statusCode).toBe(404);
    expect(result.message).toBe('Blog outline not found');
  });

  it('should return 400 when required fields missing', async () => {
    const result = await handler(createEvent({ episodeId: null }));

    expect(result.statusCode).toBe(400);
    expect(result.message).toBe('Missing required fields');
  });

  it('should use team brand voice settings', async () => {
    const outline = '# Test Outline';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline
          })
        };
      }
      if (key.sk === 'metadata' && key.pk === 'team#team-456') {
        return {
          Item: marshall({
            pk: 'team#team-456',
            sk: 'metadata',
            branding: {
              voice: {
                tone: 'casual and friendly',
                writingStyle: 'conversational',
                perspective: 'third_person'
              }
            }
          })
        };
      }
      if (key.sk === 'metadata') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'metadata',
            title: 'Test Episode'
          })
        };
      }
      return {};
    });

    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockResolvedValue('Generated content');

    await handler(createEvent({}));

    const callArgs = converse.mock.calls[0];
    expect(callArgs[1]).toContain('Tone: casual and friendly');
    expect(callArgs[1]).toContain('Perspective: third_person');
  });

  it('should include quotes in context', async () => {
    const outline = '# Test Outline';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline
          })
        };
      }
      if (key.sk === 'metadata') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'metadata',
            title: 'Test Episode'
          })
        };
      }
      return {};
    });

    ddbMock.on(QueryCommand).resolves({
      Items: [
        marshall({
          text: 'Quote one',
          speaker: 'Speaker A',
          timestamp: '00:10:00'
        }),
        marshall({
          text: 'Quote two',
          speaker: 'Speaker B',
          timestamp: '00:20:00'
        })
      ]
    });

    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockResolvedValue('Generated content');

    await handler(createEvent({}));

    const callArgs = converse.mock.calls[0];
    expect(callArgs[2]).toContain('"Quote one" - Speaker A (00:10:00)');
    expect(callArgs[2]).toContain('"Quote two" - Speaker B (00:20:00)');
  });

  it('should update status to content_generating before generation', async () => {
    const outline = '# Test Outline';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline
          })
        };
      }
      return { Item: marshall({ pk: 'test', sk: 'metadata', title: 'Test' }) };
    });

    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockResolvedValue('Generated content');

    await handler(createEvent({}));

    const updateCalls = ddbMock.commandCalls(UpdateItemCommand);
    const firstUpdate = unmarshall(updateCalls[0].args[0].input.ExpressionAttributeValues);
    expect(firstUpdate[':status']).toBe('Processing');
  });

  it('should save generated content with word count', async () => {
    const outline = '# Test Outline';
    const generatedContent = 'This is a test blog post with multiple words in it.';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline
          })
        };
      }
      return { Item: marshall({ pk: 'test', sk: 'metadata', title: 'Test' }) };
    });

    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockResolvedValue(generatedContent);

    await handler(createEvent({}));

    const putCalls = ddbMock.commandCalls(PutItemCommand);
    const savedItem = unmarshall(putCalls[0].args[0].input.Item);

    expect(savedItem.content).toBe(generatedContent);
    expect(savedItem.status).toBe('Created');
    expect(savedItem.wordCount).toBe(11);
    expect(savedItem.generatedAt).toBeDefined();
  });

  it('should update outline status to content_generated after success', async () => {
    const outline = '# Test Outline';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline
          })
        };
      }
      return { Item: marshall({ pk: 'test', sk: 'metadata', title: 'Test' }) };
    });

    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockResolvedValue('Generated content');

    await handler(createEvent({}));

    const updateCalls = ddbMock.commandCalls(UpdateItemCommand);
    const lastUpdate = unmarshall(updateCalls[updateCalls.length - 1].args[0].input.ExpressionAttributeValues);
    expect(lastUpdate[':status']).toBe('Created');
  });

  it('should update status to failed on error', async () => {
    const outline = '# Test Outline';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline
          })
        };
      }
      return { Item: marshall({ pk: 'test', sk: 'metadata', title: 'Test' }) };
    });

    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockRejectedValue(new Error('AI generation failed'));

    await expect(handler(createEvent({}))).rejects.toThrow('AI generation failed');

    const updateCalls = ddbMock.commandCalls(UpdateItemCommand);
    const errorUpdate = unmarshall(updateCalls[updateCalls.length - 1].args[0].input.ExpressionAttributeValues);
    expect(errorUpdate[':status']).toBe('Failed');
    expect(errorUpdate[':errorMessage']).toBe('AI generation failed');
  });

  it('should use first-person perspective instructions by default', async () => {
    const outline = '# Test Outline';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline
          })
        };
      }
      return { Item: marshall({ pk: 'test', sk: 'metadata', title: 'Test' }) };
    });

    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockResolvedValue('Generated content');

    await handler(createEvent({}));

    const callArgs = converse.mock.calls[0];
    expect(callArgs[1]).toContain('Write using first-person pronouns');
  });

  it('should use third-person perspective instructions when configured', async () => {
    const outline = '# Test Outline';

    ddbMock.on(GetItemCommand).callsFake((params) => {
      const key = unmarshall(params.Key);
      if (key.sk === 'data#blog#outline') {
        return {
          Item: marshall({
            pk: 'team#team-456#episode-123',
            sk: 'data#blog#outline',
            outline
          })
        };
      }
      if (key.sk === 'metadata' && key.pk === 'team#team-456') {
        return {
          Item: marshall({
            pk: 'team#team-456',
            sk: 'metadata',
            branding: {
              voice: {
                perspective: 'third_person'
              }
            }
          })
        };
      }
      return { Item: marshall({ pk: 'test', sk: 'metadata', title: 'Test' }) };
    });

    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock.on(UpdateItemCommand).resolves({});
    ddbMock.on(PutItemCommand).resolves({});

    converse.mockResolvedValue('Generated content');

    await handler(createEvent({}));

    const callArgs = converse.mock.calls[0];
    expect(callArgs[1]).toContain('Write using third-person pronouns');
  });
});



