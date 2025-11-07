import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest } from '../utils/powertools-validation.mjs';
import { TeamSchemas } from '../utils/schemas.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'teams' });

export const handler = async (event) => {
  try {
    const validation = await validateRequest(event, TeamSchemas.create);
    if (!validation.success) return validation.error;

    const { userId, data } = validation;
    const { name, description, settings } = data;

    const now = new Date().toISOString();
    const teamId = randomUUID();

    const teamSettings = {
      defaultPlatforms: settings?.defaultPlatforms || [],
      timezone: settings?.timezone || 'UTC'
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
      settings: teamSettings,
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
    logger.error('Error creating team', {
      error: err.message,
      stack: err.stack,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
