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

export const createTeamInvitationNotification = async (userId, teamId, teamName, inviterName, invitationId) => {
  return await publishNotificationEvent({
    type: 'team_invitation',
    tenantId: userId,
    userId,
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
  subscriptionId,
  metadata = {}
}) => {
  try {
    const detail = {
      type,
      tenantId,
      userId,
      title,
      message,
      url,
      persist,
      topic,
      metadata
    };

    if (subscriptionId) {
      detail.subscriptionId = subscriptionId;
    }

    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'nullcheck',
        DetailType: 'Notification',
        Detail: JSON.stringify(detail)
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


