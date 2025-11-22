import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { generateMomentoToken } from '../utils/momento.mjs';
import { MEMBERSHIP_STATUS } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'tokens' });
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { userId, tenantId } = event.requestContext.authorizer;

    if (!userId) {
      return formatResponse(401, { message: 'User ID not found in authorization context' });
    }

    if (!tenantId) {
      return formatResponse(401, { message: 'Tenant ID not found in authorization context' });
    }

    logger.info('Refreshing Momento token', {
      userId,
      tenantId
    });

    const teams = await getUserTeams(userId);

    logger.info('Retrieved user teams', {
      userId,
      teamsCount: teams.length,
      teamIds: teams.map(t => t.teamId)
    });

    const momentoToken = await generateMomentoToken(tenantId, userId, teams);

    if (!momentoToken) {
      return formatResponse(500, { message: 'Failed to generate Momento token' });
    }

    const expiresAt = new Date(Date.now() + 900000).toISOString();

    return formatResponse(200, {
      momentoToken,
      expiresAt
    });
  } catch (error) {
    logger.error('Error refreshing Momento token', {
      error: error.message,
      stack: error.stack,
      userId: event.requestContext?.authorizer?.userId,
      tenantId: event.requestContext?.authorizer?.tenantId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};

const getUserTeams = async (userId) => {
  try {
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: marshall({
        ':pk': `user#${userId}#teams`
      })
    }));

    if (!response.Items || response.Items.length === 0) {
      return [];
    }

    return response.Items
      .map(item => unmarshall(item))
      .filter(membership => membership.status === MEMBERSHIP_STATUS.ACTIVE)
      .map(membership => ({ teamId: membership.teamId }));
  } catch (err) {
    logger.error('Error fetching user teams', {
      error: err.message,
      stack: err.stack,
      userId
    });
    return [];
  }
};


