import { DynamoDBClient, QueryCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
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

    const membershipsResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: marshall({
        ':pk': `user#${userId}#teams`
      }),
      ScanIndexForward: false
    }));

    if (!membershipsResponse.Items || membershipsResponse.Items.length === 0) {
      return formatResponse(200, {
        items: [],
        count: 0
      });
    }

    const memberships = membershipsResponse.Items.map(item => unmarshall(item));
    const activeTeamIds = memberships
      .filter(membership => membership.status === 'active')
      .map(membership => membership.teamId);

    if (activeTeamIds.length === 0) {
      return formatResponse(200, {
        items: [],
        count: 0
      });
    }

    const teamKeys = activeTeamIds.map(teamId => marshall({
      pk: `team#${teamId}`,
      sk: 'metadata'
    }));

    const teamsResponse = await ddb.send(new BatchGetItemCommand({
      RequestItems: {
        [process.env.TABLE_NAME]: {
          Keys: teamKeys
        }
      }
    }));

    const teams = (teamsResponse.Responses[process.env.TABLE_NAME] || [])
      .map(item => {
        const team = unmarshall(item);
        const membership = memberships.find(m => m.teamId === team.pk.replace('team#', ''));

        return {
          id: team.pk.replace('team#', ''),
          name: team.name,
          description: team.description,
          role: membership.role,
          status: team.status,
          joinedAt: membership.joinedAt,
          createdAt: team.createdAt
        };
      })
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));

    return formatResponse(200, {
      items: teams,
      count: teams.length
    });
  } catch (err) {
    console.error('Error listing teams:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
