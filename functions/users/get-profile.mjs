import { DynamoDBClient, GetItemCommand, QueryCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';

const logger = new Logger({ serviceName: 'users' });

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      logger.error('Missing userId in authorizer context');
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

    const memberships = teamsResponse.Items?.map(item => unmarshall(item)) || [];

    let teams = [];

    if (memberships.length > 0) {
      const teamKeys = memberships.map(membership => {
        const teamId = membership.pk.replace('team#', '');
        return {
          pk: `team#${teamId}`,
          sk: 'metadata'
        };
      });

      const teamDetailsResponse = await ddb.send(new BatchGetItemCommand({
        RequestItems: {
          [process.env.TABLE_NAME]: {
            Keys: teamKeys.map(key => marshall(key))
          }
        }
      }));

      const teamDetails = teamDetailsResponse.Responses?.[process.env.TABLE_NAME]?.map(item => unmarshall(item)) || [];
      const teamDetailsMap = new Map(teamDetails.map(team => [team.pk.replace('team#', ''), team]));

      for (const membership of memberships) {
        const teamId = membership.pk.replace('team#', '');
        const teamDetail = teamDetailsMap.get(teamId);

        if (teamDetail && membership.status === 'Active') {
          const teamInfo = {
            teamId,
            name: teamDetail.name,
            description: teamDetail.description || '',
            role: membership.role,
            status: membership.status,
            joinedAt: membership.joinedAt
          };

          teams.push(teamInfo);
        }
      }
    }

    const responseProfile = {
      email: profile.email,
      name: profile.name || '',
      activeTeamId: profile.activeTeamId || null,
      preferences: profile.preferences || {
        timezone: 'UTC',
        notifications: true
      },
      branding: profile.branding || null,
      teams,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };

    return formatResponse(200, responseProfile);
  } catch (err) {
    logger.error('Error getting user profile', {
      error: err.message,
      stack: err.stack,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
