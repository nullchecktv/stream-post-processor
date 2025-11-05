import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;
    const { teamId } = event.pathParameters;

    if (!userId) {
      console.error('Missing userId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const membershipResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `team#${teamId}`,
        sk: `user#${userId}`
      })
    }));

    if (!membershipResponse.Item) {
      return formatResponse(403, { message: 'Access denied' });
    }

    const membership = unmarshall(membershipResponse.Item);

    if (membership.status !== 'active') {
      return formatResponse(403, { message: 'Access denied' });
    }

    const teamResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `team#${teamId}`,
        sk: 'metadata'
      })
    }));

    if (!teamResponse.Item) {
      return formatResponse(404, { message: 'Team not found' });
    }

    const team = unmarshall(teamResponse.Item);

    const membersResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `team#${teamId}`,
        ':sk': 'user#'
      })
    }));

    const members = membersResponse.Items?.map(item => {
      const member = unmarshall(item);
      return {
        userId: member.userId,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt
      };
    }) || [];

    const response = {
      id: teamId,
      name: team.name,
      description: team.description,
      ownerId: team.ownerId,
      status: team.status,
      settings: team.settings,
      userRole: membership.role,
      members,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    };

    return formatResponse(200, response);
  } catch (err) {
    console.error('Error getting team details:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
