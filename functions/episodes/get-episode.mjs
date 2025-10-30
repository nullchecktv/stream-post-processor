import { DynamoDBClient, GetCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { getCurrentStatus } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { episodeId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const result = await ddb.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      })
    }));

    if (!result.Item) {
      return formatResponse(404, { message: `Episode with ID '${episodeId}' was not found` });
    }

    const episode = unmarshall(result.Item);

    const response = {
      id: episodeId,
      title: episode.title,
      status: episode.status,
      episodeNumber: episode.episodeNumber,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt
    };

    if (episode.summary) response.summary = episode.summary;
    if (episode.airDate) response.airDate = episode.airDate;
    if (episode.platforms) response.platforms = episode.platforms;
    if (episode.themes) response.themes = episode.themes;
    if (episode.seriesName) response.seriesName = episode.seriesName;

    return formatResponse(200, response);

  } catch (err) {
    console.error('Error getting episode:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
