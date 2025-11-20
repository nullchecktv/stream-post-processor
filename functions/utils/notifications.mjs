import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, QueryCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const logger = new Logger({ serviceName: 'utils' });

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const listNotifications = async (tenantId, options = {}) => {
  const {
    cursor,
    limit = 20,
    isRead
  } = options;

  const params = {
    TableName: process.env.TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': tenantId,
      ':sk': 'notification#'
    },
    ScanIndexForward: false,
    Limit: limit
  };

  if (isRead !== undefined) {
    params.FilterExpression = 'isRead = :isRead';
    params.ExpressionAttributeValues[':isRead'] = marshall(isRead);
  }

  params.ExpressionAttributeValues = marshall(params.ExpressionAttributeValues);

  if (cursor) {
    params.ExclusiveStartKey = cursor;
  }

  try {
    const result = await ddb.send(new QueryCommand(params));

    const notifications = result.Items?.map(item => {
      const notification = unmarshall(item);
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
      tenantId
    });
    throw new Error('Failed to list notifications');
  }
};

export const deleteNotification = async (tenantId, notificationId) => {
  try {
    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
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

export const markNotificationAsRead = async (tenantId, notificationId) => {
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
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
      tenantId,
      notificationId
    });
    throw new Error('Failed to mark notification as read');
  }
};

export const createTeamInvitationNotification = async (userId, teamId, teamName, inviterName, invitationId) => {
  return await publishNotificationEvent({
    type: 'team_invitation',
    tenantId: userId,
    title: 'Team Invitation',
    message: `You have been invited to join ${teamName}`,
    url: `/teams/${teamId}/invitations`,
    persist: true,
    metadata: {
      teamId,
      teamName,
      inviterName,
      invitationId
    }
  });
};

export const removeNotificationsByInvitation = async (tenantId, invitationId) => {
  try {
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
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

    const deletePromises = notificationsToDelete.map(notification =>
      deleteNotification(tenantId, notification.id)
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
      tenantId
    });
    throw new Error('Failed to publish notification event');
  }
};


