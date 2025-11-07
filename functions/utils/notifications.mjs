import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const logger = new Logger({ serviceName: 'utils' });

const ddb = new DynamoDBClient();

export const createNotification = async (userId, type, title, message, data = {}) => {
  const notificationId = randomUUID();
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now

  const notification = {
    pk: `user#${userId}`,
    sk: `notification#${notificationId}`,
    GSI1PK: `user#${userId}`,
    GSI1SK: `${now}#${notificationId}`,
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
      userId,
      type,
      title
    });
    throw new Error('Failed to create notification');
  }
};

export const listNotifications = async (userId, options = {}) => {
  const {
    cursor,
    limit = 20,
    isRead
  } = options;

  const params = {
    TableName: process.env.TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': marshall(`user#${userId}`)
    },
    ScanIndexForward: false, // Newest first
    Limit: limit
  };

  // Add filter for read status if specified
  if (isRead !== undefined) {
    params.FilterExpression = 'isRead = :isRead';
    params.ExpressionAttributeValues[':isRead'] = marshall(isRead);
  }

  // Add cursor for pagination
  if (cursor) {
    params.ExclusiveStartKey = cursor;
  }

  try {
    const result = await ddb.send(new QueryCommand(params));

    const notifications = result.Items?.map(item => {
      const notification = unmarshall(item);
      // Remove internal DynamoDB fields from response
      delete notification.pk;
      delete notification.sk;
      delete notification.GSI1PK;
      delete notification.GSI1SK;
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
      userId
    });
    throw new Error('Failed to list notifications');
  }
};

export const deleteNotification = async (userId, notificationId) => {
  try {
    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: `notification#${notificationId}`
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

export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: `notification#${notificationId}`
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
      userId,
      notificationId
    });
    throw new Error('Failed to mark notification as read');
  }
};

export const createTeamInvitationNotification = async (userId, teamId, teamName, inviterName, invitationId) => {
  return await createNotification(
    userId,
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

export const removeNotificationsByInvitation = async (userId, invitationId) => {
  try {
    // First, query to find notifications with this invitation ID
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': marshall(`user#${userId}`),
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
      deleteNotification(userId, notification.id)
    );

    await Promise.allSettled(deletePromises);

    return true;
  } catch (error) {
    logger.error('Error removing invitation notifications', {
      error: error.message,
      stack: error.stack,
      userId,
      invitationId
    });
    throw new Error('Failed to remove invitation notifications');
  }
};
