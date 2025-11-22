import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { CredentialProvider, TopicClient } from '@gomomento/sdk';
import { randomUUID } from 'crypto';

const logger = new Logger({ serviceName: 'notification-handler' });

const ddb = new DynamoDBClient();
let topics = new TopicClient({ credentialProvider: CredentialProvider.fromEnvironmentVariable('MOMENTO_API_KEY')});

export const handler = async (event) => {
  const notification = event.detail;

  try {
    if (notification.persist && notification.tenantId) {
      const notificationId = randomUUID();
      const now = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

      const notificationItem = {
        pk: notification.tenantId,
        sk: `notification#${notificationId}`,
        GSI1PK: notification.tenantId,
        GSI1SK: `notification#${now}`,
        id: notificationId,
        type: notification.type,
        title: notification.title,
        url: notification.url,
        message: notification.message,
        data: notification.metadata || {},
        isRead: false,
        createdAt: now,
        ttl
      };

      await ddb.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall(notificationItem),
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
      }));

      logger.info('Notification persisted to DynamoDB', {
        tenantId: notification.tenantId,
        type: notification.type
      });
    }

    if (process.env.MOMENTO_API_KEY && process.env.MOMENTO_CACHE_NAME) {
      const payload = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        url: notification.url,
        timestamp: new Date().toISOString()
      };

      const tenantTopic = notification.tenantId;
      const tasksTopic = `${notification.tenantId}_tasks`;

      if (notification.topic === 'tasks') {
        await topics.publish(
          process.env.MOMENTO_CACHE_NAME,
          tasksTopic,
          JSON.stringify(payload)
        );

        logger.info('Notification published to tasks topic', {
          notificationType: notification.type,
          topicName: tasksTopic,
          cacheName: process.env.MOMENTO_CACHE_NAME
        });
      }

      await topics.publish(
        process.env.MOMENTO_CACHE_NAME,
        tenantTopic,
        JSON.stringify(payload)
      );

      logger.info('Notification published to tenant topic', {
        notificationType: notification.type,
        topicName: tenantTopic,
        cacheName: process.env.MOMENTO_CACHE_NAME,
        persist: notification.persist
      });
    }
  } catch (error) {
    logger.error('Failed to process notification', {
      error: error.message,
      stack: error.stack,
      notificationType: notification.type
    });
  }
};
