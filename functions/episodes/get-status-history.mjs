import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { EpisodeSchemas } from '../utils/schemas.mjs';
import { getCurrentStatus } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { message: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, EpisodeSchemas.pathParameters);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { episodeId } = pathValidation.data;

    const result = await ddb.send(new GetItemCommand({
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

    const statusHistory = episode.statusHistory || [];
    const currentStatus = getCurrentStatus(statusHistory) || episode.status || 'draft';

    const response = {
      episodeId,
      currentStatus,
      statusHistory,
      updatedAt: episode.updatedAt
    };

    return formatResponse(200, response);

  } catch (err) {
    logger.error('Error getting episode status', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
