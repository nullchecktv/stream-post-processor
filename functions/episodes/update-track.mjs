import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { parseBody, formatResponse, formatEmptyResponse, sanitizeTrackName } from '../utils/api.mjs';
import { validateSpeakers, formatSpeakerValidationError } from '../utils/speakers.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { episodeId, trackName: rawTrackName } = event.pathParameters;
    const trackName = sanitizeTrackName(rawTrackName);

    const data = parseBody(event);
    if (data === null) {
      return formatResponse(400, { message: 'Invalid request' });
    }

    let speakers = data?.speakers;
    if (speakers !== undefined) {
      if (!Array.isArray(speakers)) {
        return formatResponse(400, { message: '"speakers" must be an array' });
      }

      speakers = speakers
        .map(speaker => String(speaker || '').trim())
        .filter(speaker => speaker.length > 0);

      if (speakers.length > 0) {
        const validation = await validateSpeakers(episodeId, tenantId, speakers);

        if (!validation.valid) {
          return formatSpeakerValidationError(validation, episodeId, 'Track');
        }

        speakers = validation.normalizedSpeakers;
      }
    } else {
      speakers = [];
    }

    const trackKey = marshall({ pk: `${tenantId}#${episodeId}`, sk: `data#track#${trackName}` });
    const getTrackResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: trackKey
    }));

    if (!getTrackResponse.Item) {
      return formatResponse(404, { message: `Track '${trackName}' not found for episode '${episodeId}'` });
    }

    const now = new Date().toISOString();
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: trackKey,
      UpdateExpression: 'SET speakers = :speakers, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':speakers': speakers,
        ':updatedAt': now
      }),
      ReturnValues: 'NONE'
    }));

    return formatEmptyResponse();
  } catch (error) {
    logger.error('Error updating track', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      episodeId: event.pathParameters?.episodeId,
      trackName: event.pathParameters?.trackName
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
