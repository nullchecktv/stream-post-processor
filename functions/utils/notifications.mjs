import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { TopicClient, CredentialProvider, Configurations } from '@gomomento/sdk';

const logger = new Logger({ serviceName: 'utils' });

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

let topicClient;

const getTopicClient = () => {
  if (!topicClient) {
    topicClient = new TopicClient({
      configuration: Configurations.Lambda.latest(),
      credentialProvider: CredentialProvider.fromEnvironmentVariable({
        environmentVariableName: 'MOMENTO_API_KEY'
      })
    });
  }
  return topicClient;
};

export const createNotification = async (tenantId, type, title, message, data = {}) => {
  const notificationId = randomUUID();
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now

  const notification = {
    pk: tenantId,
    sk: `notification#${now}#${notificationId}`,
    id: notificationId,
    type,
    title,
    message,
    data,
    isRead: false,
    createdAt: now,
    ttl
  };

  try {
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(notification),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));

    return notification;
  } catch (error) {
    logger.error('Error creating notification', {
      error: error.message,
      stack: error.stack,
      tenantId,
      type,
      title
    });
    throw new Error('Failed to create notification');
  }
};

export const listNotifications = async (tenantId, options = {}) => {
  const {
    cursor,
    limit = 20,
    isRead
  } = options;

  const params = {
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: {
      ':pk': marshall(tenantId),
      ':sk': marshall('notification#')
    },
    ScanIndexForward: false,
    Limit: limit
  };

  if (isRead !== undefined) {
    params.FilterExpression = 'isRead = :isRead';
    params.ExpressionAttributeValues[':isRead'] = marshall(isRead);
  }

  if (cursor) {
    params.ExclusiveStartKey = cursor;
  }

  try {
    const result = await ddb.send(new QueryCommand(params));

    const notifications = result.Items?.map(item => {
      const notification = unmarshall(item);
      delete notification.pk;
      delete notification.sk;
      delete notification.ttl;
      return notification;
    }) || [];

    return {
      notifications,
      lastEvaluatedKey: result.LastEvaluatedKey,
      hasMore: !!result.LastEvaluatedKey
    };
  } catch (error) {
    logger.error('Error listing notifications', {
      error: error.message,
      stack: error.stack,
      tenantId
    });
    throw new Error('Failed to list notifications');
  }
};

export const deleteNotification = async (tenantId, sortKey) => {
  try {
    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: sortKey
      }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));

    return true;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return false; // Notification doesn't exist
    }
    throw new Error('Failed to delete notification');
  }
};

export const markNotificationAsRead = async (tenantId, sortKey) => {
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: sortKey
      }),
      UpdateExpression: 'SET isRead = :isRead',
      ExpressionAttributeValues: {
        ':isRead': marshall(true)
      },
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));

    return true;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return false; // Notification doesn't exist
    }
    logger.error('Error marking notification as read', {
      error: error.message,
      stack: error.stack,
      tenantId,
      sortKey
    });
    throw new Error('Failed to mark notification as read');
  }
};

export const createTeamInvitationNotification = async (tenantId, teamId, teamName, inviterName, invitationId) => {
  return await createNotification(
    tenantId,
    'team_invitation',
    'Team Invitation',
    `You have been invited to join ${teamName}`,
    {
      teamId,
      teamName,
      inviterName,
      invitationId
    }
  );
};

export const removeNotificationsByInvitation = async (tenantId, invitationId) => {
  try {
    // First, query to find notifications with this invitation ID
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': marshall(tenantId),
        ':sk': marshall('notification#')
      },
      FilterExpression: '#data.invitationId = :invitationId',
      ExpressionAttributeNames: {
        '#data': 'data'
      }
    };
    queryParams.ExpressionAttributeValues[':invitationId'] = marshall(invitationId);

    const result = await ddb.send(new QueryCommand(queryParams));
    const notificationsToDelete = result.Items?.map(item => unmarshall(item)) || [];

    if (notificationsToDelete.length === 0) {
      return true;
    }

    // Delete each matching notification
    const deletePromises = notificationsToDelete.map(notification =>
      deleteNotification(tenantId, notification.sk)
    );

    await Promise.allSettled(deletePromises);

    return true;
  } catch (error) {
    logger.error('Error removing invitation notifications', {
      error: error.message,
      stack: error.stack,
      tenantId,
      invitationId
    });
    throw new Error('Failed to remove invitation notifications');
  }
};

export const publishNotificationEvent = async ({
  type,
  tenantId,
  userId,
  title,
  message,
  url,
  persist = true,
  topic = 'tenant',
  metadata = {}
}) => {
  try {
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'nullcheck',
        DetailType: 'Notification',
        Detail: JSON.stringify({
          type,
          tenantId,
          userId,
          title,
          message,
          url,
          persist,
          topic,
          metadata
        })
      }]
    }));
  } catch (error) {
    logger.error('Failed to publish notification event', {
      error: error.message,
      stack: error.stack,
      type,
      tenantId,
      userId
    });
    throw new Error('Failed to publish notification event');
  }
};

/**
 * @deprecated Use publishNotificationEvent instead for centralized notification handling
 */
export const publishNotification = async (tenantId, notification) => {
  if (!process.env.MOMENTO_API_KEY || !process.env.MOMENTO_CACHE_NAME) {
    logger.info('Momento configuration missing, skipping notification publish');
    return;
  }

  try {
    const client = getTopicClient();
    const message = {
      ...notification,
      timestamp: new Date().toISOString()
    };

    await client.publish(
      process.env.MOMENTO_CACHE_NAME,
      tenantId,
      JSON.stringify(message)
    );
  } catch (error) {
    logger.error('Failed to publish notification to Momento Topics', {
      error: error.message,
      tenantId,
      notificationType: notification.type
    });
  }
};
