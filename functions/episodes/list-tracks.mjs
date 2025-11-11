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
    const { episodeId } = event.pathParameters;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    if (!episodeId) {
      return formatResponse(400, { error: 'ValidationError', message: 'Episode ID is required' });
    }

    const { limit, nextToken } = getPagingParams(event);

    const res = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      Limit: limit,
      ...nextToken && { ExclusiveStartKey: nextToken },
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'data#track#'
      })
    }));

    const tracks = (res.Items || []).map((item) => {
      const track = unmarshall(item);

      const currentStatus = getCurrentStatus(track.statusHistory) || track.status || 'Unknown';

      return {
        id: track.trackName,
        name: track.trackName,
        status: currentStatus
      };
    });

    return formatResponse(200, buildPagingParams(tracks, res.LastEvaluatedKey));
  } catch (err) {
    logger.error('Error listing tracks', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
