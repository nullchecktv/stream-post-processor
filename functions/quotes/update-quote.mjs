import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { QuotePathParamsSchema, QuoteUpdateSchema, QUOTE_STATUS_TRANSITIONS } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'quotes' });
const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, QuotePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const requestValidation = validateRequest(event, QuoteUpdateSchema);
    if (!requestValidation.success) {
      return requestValidation.error;
    }

    const { tenantId, data } = requestValidation;
    const { episodeId, quoteId } = pathValidation.data;

    const getResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#quote#${quoteId}`
      })
    }));

    if (!getResult.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Quote with ID '${quoteId}' was not found`
      });
    }

    const existingQuote = unmarshall(getResult.Item);
    const now = new Date().toISOString();

    if (data.status && data.status !== existingQuote.status) {
      const allowedTransitions = QUOTE_STATUS_TRANSITIONS[existingQuote.status] || [];
      if (!allowedTransitions.includes(data.status)) {
        return formatResponse(400, {
          error: 'InvalidStatusTransition',
          message: `Cannot transition from '${existingQuote.status}' to '${data.status}'`
        });
      }
    }

    const updatedQuote = {
      ...existingQuote,
      ...data,
      updatedAt: now
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(updatedQuote)
    }));

    const shouldRegenerate =
      (data.text !== undefined && data.text !== existingQuote.text) ||
      (data.speaker !== undefined && data.speaker !== existingQuote.speaker) ||
      (data.showSpeaker !== undefined && data.showSpeaker !== existingQuote.showSpeaker) ||
      (data.showEpisodeTitle !== undefined && data.showEpisodeTitle !== existingQuote.showEpisodeTitle) ||
      (data.orientation !== undefined && data.orientation !== existingQuote.orientation);

    if (shouldRegenerate) {
      try {
        const episodeResult = await ddb.send(new GetItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: `${tenantId}#${episodeId}`,
            sk: 'metadata'
          })
        }));

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
                text: updatedQuote.text,
                speaker: updatedQuote.speaker,
                timestamp: updatedQuote.timestamp,
                showSpeaker: updatedQuote.showSpeaker,
                showEpisodeTitle: updatedQuote.showEpisodeTitle,
                orientation: updatedQuote.orientation || 'landscape',
                status: updatedQuote.status
              },
              episode: {
                title: episode.title
              }
            })
          }]
        }));

        logger.info('Published Generate Quote Graphic event for regeneration', {
          quoteId,
          episodeId
        });
      } catch (error) {
        logger.error('Failed to publish Generate Quote Graphic event', {
          error: error.message,
          stack: error.stack,
          quoteId,
          episodeId
        });
      }
    }

    return formatResponse(204);

  } catch (err) {
    logger.error('Error updating quote', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId,
      quoteId: event.pathParameters?.quoteId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
