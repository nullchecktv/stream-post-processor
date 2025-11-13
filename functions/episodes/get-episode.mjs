import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { EpisodePathParamsSchema } from '../../schemas/index.mjs';
import { getCurrentStatus } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, EpisodePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { episodeId } = pathValidation.data;

    const pk = `${tenantId}#${episodeId}`;

    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk,
        sk: 'metadata'
      })
    }));

    if (!result.Item) {
      return formatResponse(404, { message: `Episode with ID '${episodeId}' was not found` });
    }

    const episode = unmarshall(result.Item);

    const relatedDataResult = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': pk,
        ':sk': 'data#'
      })
    }));

    const relatedItems = relatedDataResult.Items?.map(item => unmarshall(item)) || [];

    const tracksCount = relatedItems.filter(item => item.sk.startsWith('data#track#')).length;
    const hasTranscript = episode.transcriptKey ? true : false;
    const clipsCount = relatedItems.filter(item => item.sk.startsWith('data#clip#')).length;

    const currentStatus = getCurrentStatus(episode.statusHistory) || episode.status;

    const response = {
      id: episodeId,
      title: episode.title,
      status: currentStatus,
      episodeNumber: episode.episodeNumber,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt,
      metrics: {
        tracksCount,
        hasTranscript,
        clipsCount
      }
    };

    if (episode.description) response.description = episode.description;
    if (episode.summary) response.summary = episode.summary;
    if (episode.airDate) response.airDate = episode.airDate;
    if (episode.platforms) response.platforms = episode.platforms;
    if (episode.themes) response.themes = episode.themes;
    if (episode.seriesName) response.seriesName = episode.seriesName;

    return formatResponse(200, response);

  } catch (err) {
    logger.error('Error getting episode', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
