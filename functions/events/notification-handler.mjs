import { Logger } from '@aws-lambda-powertools/logger';
import { createNotification } from '../utils/notifications.mjs';
import { TopicClient, CredentialProvider, Configurations } from '@gomomento/sdk';

const logger = new Logger({ serviceName: 'notification-handler' });

let topicClient;

const getTopicClient = () => {
  if (!topicClient) {
    topicClient = new TopicClient({
      configuration: Configurations.Lambda.latest(),
      credentialProvider: CredentialProvider.fromEnvironmentVariable('MOMENTO_API_KEY')
    });
  }
  return topicClient;
};

export const handler = async (event) => {
  const notification = event.detail;

  try {
    if (notification.persist) {
      await createNotification(
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.metadata || {}
      );
    }

    const topicName = notification.topic === 'tasks'
      ? `${notification.tenantId}_tasks`
      : notification.tenantId;

    const message = {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      url: notification.url,
      timestamp: new Date().toISOString()
    };

    const client = getTopicClient();
    await client.publish(
      process.env.MOMENTO_CACHE_NAME,
      topicName,
      JSON.stringify(message)
    );

    logger.info('Notification published successfully', {
      type: notification.type,
      topic: topicName,
      persist: notification.persist
    });
  } catch (error) {
    logger.error('Failed to process notification', {
      error: error.message,
      stack: error.stack,
      notificationType: notification.type
    });
  }
};
