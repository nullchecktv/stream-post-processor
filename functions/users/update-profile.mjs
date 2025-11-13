import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validateRequest } from '../utils/validation.mjs';
import { UserUpdateProfileSchema } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'users' });

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const validation = await validateRequest(event, UserUpdateProfileSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { userId, data } = validation;

    const profileResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: 'profile'
      })
    }));

    let existingProfile = profileResponse.Item ? unmarshall(profileResponse.Item) : null;

    if (!existingProfile) {
      existingProfile = {
        pk: `user#${userId}`,
        sk: 'profile',
        email: event.requestContext.authorizer.email || '',
        name: '',
        activeTeamId: null,
        preferences: {
          timezone: 'UTC',
          notifications: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const now = new Date().toISOString();
    const updatedProfile = {
      ...existingProfile,
      updatedAt: now,
      activeTeamId: existingProfile.activeTeamId || null
    };

    if (data.name !== undefined) {
      updatedProfile.name = String(data.name || '').trim();
    }

    if (data.preferences !== undefined) {
      updatedProfile.preferences = {
        ...existingProfile.preferences,
        ...data.preferences
      };
    }

    if (data.branding !== undefined) {
      updatedProfile.branding = {
        ...data.branding,
        voice: data.branding.voice ? {
          ...data.branding.voice,
          perspective: data.branding.voice.perspective || 'first_person'
        } : undefined
      };
    }

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(updatedProfile)
    }));

    return formatEmptyResponse();
  } catch (err) {
    logger.error('Error updating user profile', {
      error: err.message,
      stack: err.stack,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
