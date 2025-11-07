import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, getPagingParams, buildPagingParams } from '../utils/api.mjs';
import { listNotifications } from '../utils/notifications.mjs';

const logger = new Logger({ serviceName: 'notifications' });

export const handler = async (event) => {
  try {
    const userId = event?.requestContext?.authorizer?.userId;
    if (!userId) {
      return formatResponse(401, { message: 'Unauthorized' });
    }

    const { limit, nextToken } = getPagingParams(event);
    const queryParams = event?.queryStringParameters || {};

    // Parse isRead filter
    let isRead;
    if (queryParams.isRead === 'true') {
      isRead = true;
    } else if (queryParams.isRead === 'false') {
      isRead = false;
    }

    const result = await listNotifications(userId, {
      cursor: nextToken,
      limit,
      isRead
    });

    const response = buildPagingParams(
      result.notifications,
      result.lastEvaluatedKey,
      result.hasMore
    );

    return formatResponse(200, response);
  } catch (error) {
    logger.error('Error listing notifications', {
      error: error.message,
      stack: error.stack,
      userId: event?.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Failed to list notifications' });
  }
};
