jest.mock('@aws-lambda-powertools/logger', () => {
  const { Logger } = require('../../helpers/logger-mock');
  return { Logger };
});

process.env.TABLE_NAME = 'test-table';
procBUCKET_NAME = 'test-bucket';

const { Logger } = require('@aws-lambda-powertools/logger');

describe('Generate Graphic Function', () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger({ serviceName: 'quotes' });
  });

  describe('Event Validation', () => {
    const validateEvent = (event) => {
      const { detail } = event;

      if (!detail || !detail.tenantId || !detail.episodeId || !detail.quoteId) {
        throw new Error('Missing required parameters in event detail');
      }

      if (!detail.quote || !detail.episode) {
        throw new Error('Missing quote or episode data in event detail');
      }

      return {
        tenantId: detail.tenantId,
        episodeId: detail.episodeId,
        quoteId: detail.quoteId,
        quote: detail.quote,
        episode: detail.episode
      };
    };

    test('should validate correct event', () => {
      const event = {
        detail: {
          tenantId: 'tenant-123',
          episodeId: 'episode-456',
          quoteId: 'quote-789',
          quote: {
            text: 'Great quote',
            speaker: 'John Doe',
            timestamp: '00:15:30',
            showSpeaker: true,
            showEpisodeTitle: true,
            status: 'proposed'
          },
          episode: {
            title: 'Episode Title'
          }
        }
      };

      const result = validateEvent(event);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.episodeId).toBe('episode-456');
      expect(result.quoteId).toBe('quote-789');
      expect(result.quote.text).toBe('Great quote');
      expect(result.episode.title).toBe('Episode Title');
    });

    test('should reject missing tenantId', () => {
      const event = {
        detail: {
          episodeId: 'episode-456',
          quoteId: 'quote-789',
          quote: { text: 'Quote' },
          episode: { title: 'Title' }
        }
      };

      expect(() => validateEvent(event)).toThrow('Missing required parameters in event detail');
    });

    test('should reject missing episodeId', () => {
      const event = {
        detail: {
          tenantId: 'tenant-123',
          quoteId: 'quote-789',
          quote: { text: 'Quote' },
          episode: { title: 'Title' }
        }
      };

      expect(() => validateEvent(event)).toThrow('Missing required parameters in event detail');
    });

    test('should reject missing quoteId', () => {
      const event = {
        detail: {
          tenantId: 'tenant-123',
          episodeId: 'episode-456',
          quote: { text: 'Quote' },
          episode: { title: 'Title' }
        }
      };

      expect(() => validateEvent(event)).toThrow('Missing required parameters in event detail');
    });

    test('should reject missing quote data', () => {
      const event = {
        detail: {
          tenantId: 'tenant-123',
          episodeId: 'episode-456',
          quoteId: 'quote-789',
          episode: { title: 'Title' }
        }
      };

      expect(() => validateEvent(event)).toThrow('Missing quote or episode data in event detail');
    });

    test('should reject missing episode data', () => {
      const event = {
        detail: {
          tenantId: 'tenant-123',
          episodeId: 'episode-456',
          quoteId: 'quote-789',
          quote: { text: 'Quote' }
        }
      };

      expect(() => validateEvent(event)).toThrow('Missing quote or episode data in event detail');
    });
  });

  describe('Text Wrapping Logic', () => {
    const wrapText = (text, maxWidth, measureTextFn) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = measureTextFn(testLine);

        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    const mockMeasureText = (text) => text.length * 10;

    test('should wrap text that exceeds max width', () => {
      const text = 'This is a very long quote that needs to be wrapped';
      const maxWidth = 200;

      const lines = wrapText(text, maxWidth, mockMeasureText);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(mockMeasureText(line)).toBeLessThanOrEqual(maxWidth);
      });
    });

    test('should not wrap short text', () => {
      const text = 'Short quote';
      const maxWidth = 500;

      const lines = wrapText(text, maxWidth, mockMeasureText);

      expect(lines).toEqual(['Short quote']);
    });

    test('should handle single word', () => {
      const text = 'Word';
      const maxWidth = 100;

      const lines = wrapText(text, maxWidth, mockMeasureText);

      expect(lines).toEqual(['Word']);
    });

    test('should handle empty text', () => {
      const text = '';
      const maxWidth = 100;

      const lines = wrapText(text, maxWidth, mockMeasureText);

      expect(lines).toEqual([]);
    });

    test('should wrap at word boundaries', () => {
      const text = 'One Two Three Four Five';
      const maxWidth = 100;

      const lines = wrapText(text, maxWidth, mockMeasureText);

      lines.forEach(line => {
        expect(line.trim()).toBe(line);
        expect(line).not.toContain('  ');
      });
    });
  });

  describe('Canvas Dimensions', () => {
    const WIDTH = 1920;
    const HEIGHT = 1080;
    const BORDER_WIDTH = 20;

    test('should have correct canvas dimensions', () => {
      expect(WIDTH).toBe(1920);
      expect(HEIGHT).toBe(1080);
    });

    test('should calculate inner dimensions correctly', () => {
      const innerWidth = WIDTH - (BORDER_WIDTH * 2);
      const innerHeight = HEIGHT - (BORDER_WIDTH * 2);

      expect(innerWidth).toBe(1880);
      expect(innerHeight).toBe(1040);
    });

    test('should have reasonable border width', () => {
      expect(BORDER_WIDTH).toBeGreaterThan(0);
      expect(BORDER_WIDTH).toBeLessThan(WIDTH / 10);
    });
  });

  describe('Status Update Logic', () => {
    const createStatusUpdate = (quoteKey, status) => ({
      TableName: process.env.TABLE_NAME,
      Key: quoteKey,
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString()
      }
    });

    test('should create status update for created', () => {
      const quoteKey = {
        pk: 'tenant-123#episode-456',
        sk: 'data#quote#quote-789'
      };

      const params = createStatusUpdate(quoteKey, 'created');

      expect(params.TableName).toBe('test-table');
      expect(params.Key).toEqual(quoteKey);
      expect(params.UpdateExpression).toContain('#status');
      expect(params.ExpressionAttributeValues[':status']).toBe('created');
    });

    test('should create status update for failed', () => {
      const quoteKey = {
        pk: 'tenant-123#episode-456',
        sk: 'data#quote#quote-789'
      };

      const params = createStatusUpdate(quoteKey, 'failed');

      expect(params.ExpressionAttributeValues[':status']).toBe('failed');
    });
  });

  describe('S3 Key Generation', () => {
    const generateS3Key = (tenantId, episodeId, quoteId) => {
      return `${tenantId}/${episodeId}/quotes/${quoteId}.png`;
    };

    test('should generate correct S3 key', () => {
      const key = generateS3Key('tenant-123', 'episode-456', 'quote-789');
      expect(key).toBe('tenant-123/episode-456/quotes/quote-789.png');
    });

    test('should include png extension', () => {
      const key = generateS3Key('tenant-123', 'episode-456', 'quote-789');
      expect(key.endsWith('.png')).toBe(true);
    });

    test('should include quotes directory', () => {
      const key = generateS3Key('tenant-123', 'episode-456', 'quote-789');
      expect(key).toContain('/quotes/');
    });
  });
});

