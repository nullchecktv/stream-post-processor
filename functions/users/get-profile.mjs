import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      console.error('Missing userId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const profileResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: 'profile'
      })
    }));

    if (!profileResponse.Item) {
      return formatResponse(404, { message: 'User profile not found' });
    }

    const profile = unmarshall(profileResponse.Item);

    const teamsResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: marshall({
        ':pk': `user#${userId}#teams`
      })
    }));

    const teams = teamsResponse.Items?.map(item => {
      const membership = unmarshall(item);
      return {
        teamId: membership.teamId,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt
      };
    }) || [];

    const responseProfile = {
      email: profile.email,
      name: profile.name || '',
      activeTeamId: profile.activeTeamId || null,
      preferences: profile.preferences || {
        timezone: 'UTC',
        notifications: true
      },
      teams,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };

    return formatResponse(200, responseProfile);
  } catch (err) {
    console.error('Error getting user profile:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
