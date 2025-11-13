import { DynamoDBClient, TransactWriteItemsCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest } from '../utils/validation.mjs';
import { TeamCreateSchema, TEAM_STATUS, MEMBERSHIP_STATUS } from '../../schemas/index.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'teams' });

export const handler = async (event) => {
  try {
    const validation = await validateRequest(event, TeamCreateSchema);
    if (!validation.success) return validation.error;

    const { userId, data } = validation;
    const { name, description, settings, branding } = data;

    const now = new Date().toISOString();
    const teamId = randomUUID();

    const userProfileResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: 'profile'
      })
    }));

    const userProfile = userProfileResponse.Item ? unmarshall(userProfileResponse.Item) : null;

    const teamSettings = {
      defaultPlatforms: settings?.defaultPlatforms || [],
      timezone: settings?.timezone || 'UTC'
    };

    let teamBranding = branding;
    if (branding && branding.voice) {
      teamBranding = {
        ...branding,
        voice: {
          ...branding.voice,
          perspective: branding.voice.perspective || 'first_person'
        }
      };
    }

    const teamItem = {
      pk: `team#${teamId}`,
      sk: 'metadata',
      GSI1PK: 'teams',
      GSI1SK: `${now}#${teamId}`,
      name,
      ...(description && { description }),
      ownerId: userId,
      status: TEAM_STATUS.ACTIVE,
      settings: teamSettings,
      ...(teamBranding && { branding: teamBranding }),
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
      email: userProfile?.email,
      name: userProfile?.name,
      role: 'owner',
      status: MEMBERSHIP_STATUS.ACTIVE,
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
