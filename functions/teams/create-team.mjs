import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { parseBody, formatResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      console.error('Missing userId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const data = parseBody(event);
    if (data === null) {
      return formatResponse(400, { message: 'Invalid request' });
    }

    const errors = [];
    const name = (data?.name ?? '').toString().trim();

    if (!name) errors.push('name is required');
    if (name.length > 100) errors.push('name must be 100 characters or less');

    const description = data?.description ? String(data.description) : undefined;
    if (description && description.length > 500) errors.push('description must be 500 characters or less');

    if (errors.length) {
      return formatResponse(400, { message: errors.join(', ') });
    }

    const now = new Date().toISOString();
    const teamId = randomUUID();

    const settings = {
      defaultPlatforms: data?.settings?.defaultPlatforms || [],
      timezone: data?.settings?.timezone || 'UTC'
    };

    const teamItem = {
      pk: `team#${teamId}`,
      sk: 'metadata',
      GSI1PK: 'teams',
      GSI1SK: `${now}#${teamId}`,
      name,
      ...(description && { description }),
      ownerId: userId,
      status: 'active',
      settings,
      createdAt: now,
      updatedAt: now
    };

    const membershipItem = {
      pk: `team#${teamId}`,
      sk: `user#${userId}`,
      GSI1PK: `user#${userId}#teams`,
      GSI1SK: `${now}#${teamId}`,
      userId,
      teamId,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await ddb.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.TABLE_NAME,
            Item: marshall(teamItem),
            ConditionExpression: 'attribute_not_exists(pk)'
          }
        },
        {
          Put: {
            TableName: process.env.TABLE_NAME,
            Item: marshall(membershipItem),
            ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
          }
        }
      ]
    }));

    return formatResponse(201, { id: teamId });
  } catch (err) {
    console.error('Error creating team:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
