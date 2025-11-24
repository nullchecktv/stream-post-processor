import { Logger } from '@aws-lambda-powertools/logger';
import { z } from 'zod';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { createQuoteKey, createQuoteGSIKey } from '../utils/quotes.mjs';
import { QUOTE_STATUS } from '../../schemas/index.mjs';
import { validateSpeakers } from '../utils/speakers.mjs';
import { updateWorkflowStep } from '../utils/workflow-steps.mjs';

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
        speaker: z.string().min(1).describe('Speaker attribution (required)'),
        timestamp: z.string()
          .regex(/^\d{2}:\d{2}:\d{2}$/)
          .describe('Time in transcript in hh:mm:ss format (required)'),
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

      const allSpeakers = [...new Set(quotes.map(q => q.speaker).filter(s => s))];
      const speakerNormalizationMap = {};

      if (allSpeakers.length > 0) {
        const validation = await validateSpeakers(episodeId, tenantId, allSpeakers);

        if (!validation.valid) {
          logger.error('Speaker validation failed for quotes', {
            episodeId,
            tenantId,
            invalidSpeakers: validation.invalidSpeakers,
            validSpeakers: validation.validSpeakers
          });
          return `Failed to create quotes: Invalid speakers [${validation.invalidSpeakers.join(', ')}]. Valid speakers for this episode are: [${validation.validSpeakers.join(', ')}]`;
        }

        allSpeakers.forEach((speaker, index) => {
          speakerNormalizationMap[speaker.toLowerCase()] = validation.normalizedSpeakers[index];
        });
      }

      const results = await Promise.allSettled(
        quotes.map(async (quote) => {
          const quoteId = randomUUID();
          const now = new Date().toISOString();

          const showSpeaker = quote.showSpeaker !== undefined ? quote.showSpeaker : true;
          const showEpisodeTitle = quote.showEpisodeTitle !== undefined ? quote.showEpisodeTitle : true;

          const normalizedSpeaker = quote.speaker
            ? (speakerNormalizationMap[quote.speaker.toLowerCase()] || quote.speaker)
            : quote.speaker;

          const keys = createQuoteKey(tenantId, episodeId, quoteId);
          const gsiKeys = createQuoteGSIKey(tenantId, quote.timestamp, episodeId, quoteId);

          const item = {
            ...keys,
            ...gsiKeys,
            quoteId,
            title: quote.title,
            text: quote.text,
            speaker: normalizedSpeaker,
            timestamp: quote.timestamp,
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
                      speaker: item.speaker,
                      timestamp: item.timestamp,
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

      await updateWorkflowStep(tenantId, episodeId, 'quote_extraction', 'Completed');

      return `${created} quotes added for episode ${episodeId}. All quotes have been created with tenant isolation.`;
    } catch (err) {
      logger.error('Error creating quotes', {
        error: err.message,
        stack: err.stack,
        episodeId,
        tenantId,
        quoteCount: quotes?.length || 0
      });

      await updateWorkflowStep(tenantId, episodeId, 'quote_extraction', 'Failed');

      return 'Something went wrong while creating quotes';
    }
  }
};
