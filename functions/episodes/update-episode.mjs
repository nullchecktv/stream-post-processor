import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { EpisodeUpdateSchema, EpisodePathParamsSchema } from '../../schemas/index.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, EpisodePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const bodyValidation = await validateRequest(event, EpisodeUpdateSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }

    const { tenantId, data } = bodyValidation;
    const { episodeId } = pathValidation.data;

    const episodeResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      })
    }));

    if (!episodeResponse.Item) {
      return formatResponse(404, { message: 'Episode not found' });
    }

    const currentEpisode = unmarshall(episodeResponse.Item);

    const now = new Date().toISOString();

    const normalizedSpeakers = data.speakers !== undefined
      ? [...new Set(data.speakers.map(s => s.trim()).filter(s => s.length > 0))]
      : undefined;

    const updatedEpisode = {
      ...currentEpisode,
      ...(data.title !== undefined && { title: data.title }),
      ...(data.episodeNumber !== undefined && { episodeNumber: data.episodeNumber }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.airDate !== undefined && { airDate: data.airDate }),
      ...(data.platforms !== undefined && { platforms: data.platforms }),
      ...(data.themes !== undefined && { themes: data.themes }),
      ...(data.seriesName !== undefined && { seriesName: data.seriesName }),
      ...(normalizedSpeakers !== undefined && { speakers: normalizedSpeakers }),
      updatedAt: now
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(updatedEpisode),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));

    return formatEmptyResponse();
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, { message: 'Episode was modified by another request. Please retry.' });
    }
    logger.error('Error updating episode', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
