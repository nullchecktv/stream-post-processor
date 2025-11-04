import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { parseBody, formatResponse, formatEmptyResponse } from '../utils/api.mjs';

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
    if (data.name !== undefined) {
      const name = String(data.name || '').trim();
      if (name.length > 200) errors.push('name must be 200 characters or less');
    }

    if (data.preferences !== undefined) {
      if (typeof data.preferences !== 'object' || data.preferences === null) {
        errors.push('preferences must be an object');
      } else {
        if (data.preferences.timezone !== undefined) {
          const timezone = String(data.preferences.timezone || '').trim();
          if (!timezone) errors.push('timezone cannot be empty');
          if (timezone.length > 50) errors.push('timezone must be 50 characters or less');
        }

        if (data.preferences.notifications !== undefined) {
          if (typeof data.preferences.notifications !== 'boolean') {
            errors.push('notifications must be a boolean');
          }
        }
      }
    }

    if (errors.length) {
      return formatResponse(400, { message: errors.join(', ') });
    }

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
      updatedAt: now
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

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(updatedProfile)
    }));

    return formatEmptyResponse();
  } catch (err) {
    console.error('Error updating user profile:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
