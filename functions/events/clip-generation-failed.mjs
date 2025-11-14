import { Logger } from '@aws-lambda-powertools/logger';
import { publishNotificationEvent } from '../utils/notifications.mjs';

const logger = new Logger({ serviceName: 'events' });

export const handler = async (event) => {
  try {
    const { tenantId, episodeId, clipId, error } = event;

    if (!tenantId || !episodeId || !clipId) {
      logger.warn('Missing required fields in clip generation failure event', { event });
      return { statusCode: 200 };
    }

    await publishNotificationEvent({
      type: 'clip_generation_failed',
      tenantId,
      title: 'Clip Generation Failed',
      message: `Failed to generate clip: ${error?.message || 'Unknown error'}`,
      url: `/episodes/${episodeId}/clips`,
      persist: true,
      topic: 'tenant',
      metadata: {
        episodeId,
        clipId,
        error: error?.message || 'Unknown error'
      }
    });

    return { statusCode: 200 };
  } catch (err) {
    logger.error('Error handling clip generation failure notification', {
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
};
