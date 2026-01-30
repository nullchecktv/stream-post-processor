import { Logger } from '@aws-lambda-powertools/logger';
import { z } from 'zod';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { createQuoteKey, createQuoteGSIKey } from '../utils/quotes.mjs';
import { QUOTE_STATUS } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'tools' });

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const MAX_QUOTES_PER_REQUEST = 20;

export const createQuoteTool = {
  isMultiTenant: true,
  name: 'createQuote',
  description: 'Creates one or more memorable quotes from a livestream transcript for social media sharing',
  schema: z.object({
    episodeId: z.string().describe('The ID of the episode for which to create quotes'),
    quotes: z.array(
      z.object({
        title: z.string().min(10).max(40).describe('Brief name for the quote (10-40 characters)'),
        text: z.string().min(5).max(280).describe('Quote text (5-280 characters)'),
        speaker: z.string().min(1).optional().describe('Speaker attribution (optional, use when available in transcript)'),
        timestamp: z.string()
          .regex(/^\d{2}:\d{2}:\d{2}$/)
          .optional()
          .describe('Time in transcript in hh:mm:ss format (optional)'),
        relevanceScore: z.number().int().min(0).max(100).describe('Relevance score 0-100 (required)'),
        context: z.string().optional().describe('Optional surrounding context for the quote'),
        showSpeaker: z.boolean().optional().describe('Whether to show speaker name in graphic (default: true)'),
        showEpisodeTitle: z.boolean().optional().describe('Whether to show episode title in graphic (default: true)')
      })
    ).min(1).max(MAX_QUOTES_PER_REQUEST)
  }),
  handler: async (context, { episodeId, quotes }) => {
    const { tenantId } = context;

    if (!tenantId) {
      logger.error('Missing tenantId in tool handler', {
        episodeId
      });
      return 'Unauthorized: Missing tenant context';
    }

    try {

      let episode = null;
      try {
        const episodeResult = await ddb.send(new GetItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: `${tenantId}#${episodeId}`,
            sk: 'metadata'
          })
        }));

        if (episodeResult.Item) {
          episode = unmarshall(episodeResult.Item);
        } else {
          logger.warn('Episode not found for quotes', {
            episodeId,
            tenantId
          });
        }
      } catch (episodeErr) {
        logger.error('Failed to fetch episode metadata', {
          error: episodeErr.message,
          stack: episodeErr.stack,
          episodeId,
          tenantId
        });
      }

      const results = await Promise.allSettled(
        quotes.map(async (quote) => {
          const quoteId = randomUUID();
          const now = new Date().toISOString();

          const showSpeaker = quote.showSpeaker !== undefined ? quote.showSpeaker : true;
          const showEpisodeTitle = quote.showEpisodeTitle !== undefined ? quote.showEpisodeTitle : true;

          const keys = createQuoteKey(tenantId, episodeId, quoteId);
          const gsiKeys = createQuoteGSIKey(tenantId, quote.timestamp || now, episodeId, quoteId);

          const item = {
            ...keys,
            ...gsiKeys,
            quoteId,
            title: quote.title,
            text: quote.text,
            relevanceScore: quote.relevanceScore,
            showSpeaker,
            showEpisodeTitle,
            status: QUOTE_STATUS.PROPOSED,
            createdAt: now,
            updatedAt: now,
            ttl: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60)
          };

          if (quote.context) {
            item.context = quote.context;
          }

          if (quote.timestamp) {
            item.timestamp = quote.timestamp;
          }

          if (quote.speaker) {
            item.speaker = quote.speaker;
          }

          await ddb.send(
            new PutItemCommand({
              TableName: process.env.TABLE_NAME,
              ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
              Item: marshall(item)
            })
          );

          if (episode) {
            try {
              await eventBridge.send(new PutEventsCommand({
                Entries: [{
                  Source: 'nullcheck',
                  DetailType: 'Generate Quote Graphic',
                  Detail: JSON.stringify({
                    tenantId,
                    episodeId,
                    quoteId,
                    quote: {
                      text: item.text,
                      ...(item.speaker && { speaker: item.speaker }),
                      ...(item.timestamp && { timestamp: item.timestamp }),
                      showSpeaker: item.showSpeaker,
                      showEpisodeTitle: item.showEpisodeTitle,
                      status: item.status
                    },
                    episode: {
                      title: episode.title
                    }
                  })
                }]
              }));

              logger.info('Published Generate Quote Graphic event', {
                quoteId,
                episodeId,
                tenantId
              });
            } catch (eventErr) {
              logger.error('Failed to publish Generate Quote Graphic event', {
                error: eventErr.message,
                stack: eventErr.stack,
                quoteId,
                episodeId,
                tenantId
              });
            }
          }

          return { quoteId, title: quote.title };
        })
      );

      const created = results.filter((r) => r.status === 'fulfilled' && r.value).length;

      logger.info('Created quotes for episode', {
        created,
        episodeId,
        tenantId,
        totalRequested: quotes.length
      });

      if (created > 0 && episode) {
        const episodeTitle = episode.title || `Episode ${episode.episodeNumber || ''}`;
        try {
          await eventBridge.send(new PutEventsCommand({
            Entries: [{
              Source: 'nullcheck',
              DetailType: 'Notification',
              Detail: JSON.stringify({
                type: 'quotes_detected',
                tenantId,
                title: 'Quotes Detected',
                message: `Found ${created} shareable quote${created !== 1 ? 's' : ''} in ${episodeTitle}`,
                url: `/episodes/${episodeId}`,
                persist: true,
                metadata: {
                  episodeId,
                  quoteCount: created
                }
              })
            }]
          }));
        } catch (notificationErr) {
          logger.error('Failed to publish quotes detected notification', {
            error: notificationErr.message,
            episodeId,
            tenantId
          });
        }
      }

      return `${created} quotes added for episode ${episodeId}. All quotes have been created with tenant isolation.`;
    } catch (err) {
      logger.error('Error creating quotes', {
        error: err.message,
        stack: err.stack,
        episodeId,
        tenantId,
        quoteCount: quotes?.length || 0
      });

      return 'Something went wrong while creating quotes';
    }
  }
};
