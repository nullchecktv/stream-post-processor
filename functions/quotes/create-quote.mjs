import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { QuoteSchemas } from '../utils/schemas.mjs';
import { createQuoteKey, createQuoteGSIKey, QUOTE_STATUS } from '../utils/quotes.mjs';

const logger = new Logger({ serviceName: 'quotes' });
const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, QuoteSchemas.pathParameters);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const requestValidation = validateRequest(event, QuoteSchemas.create);
    if (!requestValidation.success) {
      return requestValidation.error;
    }

    const { tenantId, data } = requestValidation;
    const { episodeId } = pathValidation.data;
    const { text, speaker, timestamp, relevanceScore, context, showSpeaker, showEpisodeTitle } = data;

    const quoteId = randomUUID();
    const now = new Date().toISOString();

    const quote = {
      ...createQuoteKey(tenantId, episodeId, quoteId),
      ...createQuoteGSIKey(tenantId, timestamp, episodeId, quoteId),
      quoteId,
      text,
      speaker,
      timestamp,
      relevanceScore: relevanceScore || 0,
      context: context || '',
      showSpeaker: showSpeaker !== undefined ? showSpeaker : true,
      showEpisodeTitle: showEpisodeTitle !== undefined ? showEpisodeTitle : true,
      status: QUOTE_STATUS.PROPOSED,
      createdAt: now,
      updatedAt: now,
      ttl: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60)
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(quote),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));

    try {
      const episodeResult = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `${tenantId}#${episodeId}`,
          sk: 'metadata'
        })
      }));

      if (episodeResult.Item) {
        const episode = unmarshall(episodeResult.Item);

        await eventBridge.send(new PutEventsCommand({
          Entries: [{
            Source: 'nullcheck',
            DetailType: 'Generate Quote Graphic',
            Detail: JSON.stringify({
              tenantId,
              episodeId,
              quoteId,
              quote: {
                text: quote.text,
                speaker: quote.speaker,
                timestamp: quote.timestamp,
                showSpeaker: quote.showSpeaker,
                showEpisodeTitle: quote.showEpisodeTitle,
                status: quote.status
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
      } else {
        logger.warn('Episode not found for Generate Quote Graphic event', {
          episodeId,
          tenantId
        });
      }
    } catch (eventErr) {
      logger.error('Failed to publish Generate Quote Graphic event', {
        error: eventErr.message,
        stack: eventErr.stack,
        quoteId,
        episodeId,
        tenantId
      });
    }

    return formatResponse(201, { id: quoteId });

  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, {
        error: 'Conflict',
        message: 'Quote already exists'
      });
    }

    logger.error('Error creating quote', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
