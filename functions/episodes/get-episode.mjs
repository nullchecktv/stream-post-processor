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

    const tracks = relatedItems
      .filter(item => item.sk.startsWith('data#track#'))
      .map(track => ({
        name: track.trackName || track.sk.replace('data#track#', ''),
        filename: track.filename,
        uploadedAt: track.uploadedAt,
        status: track.status || 'uploaded',
        speakers: track.speakers
      }));

    const tracksCount = tracks.length;
    const hasTranscript = Boolean(episode.transcriptKey && episode.transcriptKey.trim());
    const clipsCount = relatedItems.filter(item => item.sk.startsWith('data#clip#')).length;

    const currentStatus = getCurrentStatus(episode.statusHistory) || episode.status;

    const response = {
      id: episodeId,
      title: episode.title,
      status: currentStatus,
      episodeNumber: episode.episodeNumber,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt,
      tracks,
      metrics: {
        tracksCount,
        hasTranscript,
        clipsCount
      }
    };

    if (hasTranscript && episode.transcriptKey) {
      response.transcript = {
        filename: episode.transcriptKey.split('/').pop() || 'transcript.srt',
        uploadedAt: episode.updatedAt,
        status: 'uploaded'
      };
    }

    if (episode.description) response.description = episode.description;
    if (episode.summary) response.summary = episode.summary;
    if (episode.airDate) response.airDate = episode.airDate;
    if (episode.platforms) response.platforms = episode.platforms;
    if (episode.themes) response.themes = episode.themes;
    if (episode.seriesName) response.seriesName = episode.seriesName;
    if (episode.speakers) response.speakers = episode.speakers;
    if (episode.workflowSteps) response.workflowSteps = episode.workflowSteps;
    if (episode.statusHistory) response.statusHistory = episode.statusHistory;

    return formatResponse(200, response, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

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
