import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { deleteNotification, markNotificationAsRead } from '../utils/notifications.mjs';

const logger = new Logger({ serviceName: 'notifications' });

export const handler = async (event) => {
  try {
    const tenantId = event?.requestContext?.authorizer?.tenantId;
    if (!tenantId) {
      return formatResponse(401, { message: 'Unauthorized' });
    }

    const notificationId = event?.pathParameters?.notificationId;
    if (!notificationId) {
      return formatResponse(400, { message: 'Notification ID is required' });
    }

    const queryParams = event?.queryStringParameters || {};
    const isReadParam = queryParams.isRead;

    // If isRead query parameter is provided, mark as read instead of deleting
    if (isReadParam === 'true') {
      const success = await markNotificationAsRead(tenantId, notificationId);

      if (!success) {
        return formatResponse(404, { message: 'Notification not found' });
      }

      return formatEmptyResponse();
    }

    // Default behavior: delete the notification
    const success = await deleteNotification(tenantId, notificationId);

    if (!success) {
      return formatResponse(404, { message: 'Notification not found' });
    }

    return formatEmptyResponse();
  } catch (error) {
    logger.error('Error processing notification', {
      error: error.message,
      stack: error.stack,
      userId: event?.requestContext?.authorizer?.userId,
      notificationId: event?.pathParameters?.notificationId
    });
    return formatResponse(500, { message: 'Failed to process notification' });
  }
};
