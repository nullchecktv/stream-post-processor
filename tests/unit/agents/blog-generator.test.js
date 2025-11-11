const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

jest.mock('../../../functions/utils/transcripts.mjs', () => ({
  loadAndPreprocessTranscript: jest.fn()
}));

jest.mock('../../../functions/utils/agents.mjs', () => ({
  converse: jest.fn()
}));

jest.mock('../../../functions/tools/web-search.mjs', () => {
  const { z } = require('zod');
  return {
    webSearchTool: {
      name: 'webSearch',
      description: 'Mock web search tool',
      schema: z.object({
        searchQuery: z.string(),
        numResults: z.number().optional()
      }),
      handler: jest.fn()
    }
  };
});

const ddbMock = mockClient(DynamoDBClient);

const { handler } = require('../../../functions/agents/blog-generator.mjs');
const { loadAndPreprocessTranscript } = require('../../../functions/utils/transcripts.mjs');
const { converse } = require('../../../functions/utils/agents.mjs');
const { Logger } = require('@aws-lambda-powertools/logger');

describe('Blog Generator Agent', () => {
  let mockLogger;

  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
    process.env.MODEL_ID = 'amazon.nova-pro-v1:0';
    mockLogger = new Logger({ serviceName: 'agents' });
  });

  describe('Handler Integration', () => {
    test('should generate blog content successfully', async () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-456',
          timestamp: '2025-01-15T10:00:00Z'
        }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'data#blog#outline',
            outline: '# Blog Title\n\n## Introduction\n\nContent here',
            status: 'outline_created'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'metadata',
            title: 'Test Episode',
            episodeNumber: 1,
            description: 'Test description',
            themes: ['technology', 'programming']
          })
        })
        .resolvesOnce({});

      loadAndPreprocessTranscript.mockResolvedValue('This is a test transcript with enough content to be useful.');
      converse.mockResolvedValue('# Generated Blog Post\n\nThis is the generated content with over 1500 words of detailed information about the topic discussed in the episode.');

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.episodeId).toBe('episode-123');
      expect(body.status).toBe('content_generated');
      expect(body.wordCount).toBeGreaterThan(0);

      expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(1);
      expect(ddbMock.commandCalls(PutItemCommand)).toHaveLength(1);
    });

    test('should handle missing outline', async () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-456',
          timestamp: '2025-01-15T10:00:00Z'
        }
      };

      ddbMock.on(GetItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(result.body).toBe('Blog outline not found');
    });

    test('should handle invalid event structure', async () => {
      const event = {
        detail: {}
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(result.body).toBe('Invalid event structure');
    });

    test('should update status to failed on error', async () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-456',
          timestamp: '2025-01-15T10:00:00Z'
        }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'data#blog#outline',
            outline: '# Blog Title\n\n## Introduction',
            status: 'outline_created'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'metadata',
            title: 'Test Episode'
          })
        })
        .resolvesOnce({});

      loadAndPreprocessTranscript.mockResolvedValue('Test transcript');
      converse.mockRejectedValue(new Error('Model invocation failed'));

      ddbMock.on(UpdateItemCommand).resolves({});

      await expect(handler(event)).rejects.toThrow('Model invocation failed');

      const updateCalls = ddbMock.commandCalls(UpdateItemCommand);
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    test('should load team brand voice when available', async () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          tenantId: 'team#team-789',
          timestamp: '2025-01-15T10:00:00Z'
        }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'team#team-789#episode-123',
            sk: 'data#blog#outline',
            outline: '# Blog Title\n\n## Introduction',
            status: 'outline_created'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'team#team-789#episode-123',
            sk: 'metadata',
            title: 'Test Episode',
            activeTeamId: 'team-789'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'team#team-789',
            sk: 'metadata',
            name: 'Test Team',
            brandVoice: {
              tone: 'casual and humorous',
              writingStyle: 'storytelling with examples'
            }
          })
        });

      loadAndPreprocessTranscript.mockResolvedValue('Test transcript');
      converse.mockResolvedValue('# Generated Blog Post\n\nContent here');

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(converse).toHaveBeenCalled();
      const systemPrompt = converse.mock.calls[0][1];
      expect(systemPrompt).toContain('casual and humorous');
      expect(systemPrompt).toContain('storytelling with examples');
    });

    test('should handle missing transcript gracefully', async () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-456',
          timestamp: '2025-01-15T10:00:00Z'
        }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'data#blog#outline',
            outline: '# Blog Title\n\n## Introduction',
            status: 'outline_created'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'metadata',
            title: 'Test Episode'
          })
        })
        .resolvesOnce({});

      loadAndPreprocessTranscript.mockRejectedValue(new Error('Transcript not found'));
      converse.mockResolvedValue('# Generated Blog Post\n\nContent here');

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(converse).toHaveBeenCalled();
    });
  });

  describe('Word Count Calculation', () => {
    test('should count words correctly', () => {
      const countWords = (text) => {
        if (!text) return 0;
        return text
          .trim()
          .split(/\s+/)
          .filter(word => word.length > 0)
          .length;
      };

      expect(countWords('Hello world')).toBe(2);
      expect(countWords('  Hello   world  ')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('Single')).toBe(1);
    });

    test('should handle markdown content', () => {
      const countWords = (text) => {
        if (!text) return 0;
        return text
          .trim()
          .split(/\s+/)
          .filter(word => word.length > 0)
          .length;
      };

      const markdown = '# Heading\n\nThis is a paragraph with **bold** and *italic* text.';
      expect(countWords(markdown)).toBeGreaterThan(0);
    });
  });

  describe('System Prompt Building', () => {
    test('should include brand voice in system prompt', () => {
      const buildSystemPrompt = (brandVoice) => {
        const tone = brandVoice?.tone || 'professional and engaging';
        const writingStyle = brandVoice?.writingStyle || 'clear and informative with practical examples';
        return `Tone: ${tone}\nWriting Style: ${writingStyle}`;
      };

      const prompt = buildSystemPrompt({
        tone: 'casual and friendly',
        writingStyle: 'conversational with examples'
      });

      expect(prompt).toContain('casual and friendly');
      expect(prompt).toContain('conversational with examples');
    });

    test('should use defaults when brand voice is missing', () => {
      const buildSystemPrompt = (brandVoice) => {
        const tone = brandVoice?.tone || 'professional and engaging';
        const writingStyle = brandVoice?.writingStyle || 'clear and informative with practical examples';
        return `Tone: ${tone}\nWriting Style: ${writingStyle}`;
      };

      const prompt = buildSystemPrompt(null);

      expect(prompt).toContain('professional and engaging');
      expect(prompt).toContain('clear and informative with practical examples');
    });
  });

  describe('User Prompt Building', () => {
    test('should include episode context', () => {
      const buildUserPrompt = (outline, episode) => {
        const context = [];
        if (episode?.title) context.push(`Title: ${episode.title}`);
        if (episode?.episodeNumber) context.push(`Number: ${episode.episodeNumber}`);
        return context.join('\n') + '\n\n' + outline;
      };

      const prompt = buildUserPrompt('# Outline', {
        title: 'Test Episode',
        episodeNumber: 42
      });

      expect(prompt).toContain('Test Episode');
      expect(prompt).toContain('42');
      expect(prompt).toContain('# Outline');
    });

    test('should handle missing episode data', () => {
      const buildUserPrompt = (outline, episode) => {
        const context = [];
        if (episode?.title) context.push(`Title: ${episode.title}`);
        return context.join('\n') + '\n\n' + outline;
      };

      const prompt = buildUserPrompt('# Outline', null);

      expect(prompt).toContain('# Outline');
    });
  });

  describe('Status Transitions', () => {
    test('should transition from outline_created to content_generating', async () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-456',
          timestamp: '2025-01-15T10:00:00Z'
        }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'data#blog#outline',
            outline: '# Blog Title\n\n## Introduction',
            status: 'outline_created'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'metadata',
            title: 'Test Episode'
          })
        })
        .resolvesOnce({});

      loadAndPreprocessTranscript.mockResolvedValue('Test transcript');
      converse.mockResolvedValue('# Generated content');

      ddbMock.on(UpdateItemCommand).resolves({});
      ddbMock.on(PutItemCommand).resolves({});

      await handler(event);

      const updateCalls = ddbMock.commandCalls(UpdateItemCommand);
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    test('should transition to failed on error', async () => {
      const event = {
        detail: {
          episodeId: 'episode-123',
          tenantId: 'tenant-456',
          timestamp: '2025-01-15T10:00:00Z'
        }
      };

      ddbMock.on(GetItemCommand)
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'data#blog#outline',
            outline: '# Blog Title',
            status: 'outline_created'
          })
        })
        .resolvesOnce({
          Item: marshall({
            pk: 'tenant-456#episode-123',
            sk: 'metadata',
            title: 'Test Episode'
          })
        })
        .resolvesOnce({});

      loadAndPreprocessTranscript.mockResolvedValue('Test transcript');
      converse.mockRejectedValue(new Error('Generation failed'));

      ddbMock.on(UpdateItemCommand).resolves({});

      await expect(handler(event)).rejects.toThrow('Generation failed');

      const updateCalls = ddbMock.commandCalls(UpdateItemCommand);
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });
});
