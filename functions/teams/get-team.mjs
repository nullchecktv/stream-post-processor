import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { TeamSchemas } from '../utils/schemas.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'teams' });

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      logger.error('Missing userId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, TeamSchemas.pathParameters);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { teamId } = pathValidation.data;

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
      brandVoice: team.brandVoice || null,
      branding: team.branding,
      userRole: membership.role,
      members,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    };

    return formatResponse(200, response);
  } catch (err) {
    logger.error('Error getting team details', {
      error: err.message,
      stack: err.stack,
      teamId: event.pathParameters?.teamId,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
