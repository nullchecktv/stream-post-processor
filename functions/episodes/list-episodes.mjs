import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, getPagingParams, buildPagingParams } from '../utils/api.mjs';
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

    const { limit, nextToken } = getPagingParams(event);

    const res = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      Limit: limit,
      ...nextToken && { ExclusiveStartKey: nextToken },
      KeyConditionExpression: '#GSI1PK = :episode',
      ExpressionAttributeNames: {
        '#GSI1PK': 'GSI1PK'
      },
      ExpressionAttributeValues: marshall({
        ':episode': `${tenantId}#episode`
      }),
    }));

    const episodes = (res.Items || []).map((i) => {
      const item = unmarshall(i);

      const currentStatus = getCurrentStatus(item.statusHistory) || item.status;
      const hasTranscript = Boolean(item.transcriptKey && item.transcriptKey.trim());

      return {
        id: item.pk.split('#')[1],
        title: item.title,
        episodeNumber: item.episodeNumber,
        status: currentStatus,
        ...item.airDate && { airDate: item.airDate },
        ...item.platforms && { platforms: item.platforms },
        ...item.themes && { themes: item.themes },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metrics: {
          hasTranscript,
          hasPlan: Boolean(item.planObjectives),
          tracksCount: item.numTracks || 0
        }
      };
    });

    return formatResponse(200, buildPagingParams(episodes, res.LastEvaluatedKey));
  } catch (err) {
    logger.error('Error listing episodes', {
      error: err.message,
      stack: err.stack,
      name: err.name
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
