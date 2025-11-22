import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { generateMomentoToken } from '../utils/momento.mjs';
import { MEMBERSHIP_STATUS } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'auth' });
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { request } = event;
    const userAttributes = request.userAttributes;
    const userId = userAttributes.sub;
    const userProfile = await getUserProfile(userId);
    const teams = await getUserTeams(userId);

    const tenantId = userProfile?.activeTeamId || userId;
    const activeTeamId = userProfile?.activeTeamId || null;

    const momentoToken = await generateMomentoToken(tenantId, userId, teams);

    if (!event.response.claimsOverrideDetails) {
      event.response.claimsOverrideDetails = {};
    }

    if (!event.response.claimsOverrideDetails.claimsToAddOrOverride) {
      event.response.claimsOverrideDetails.claimsToAddOrOverride = {};
    }

    event.response.claimsOverrideDetails.claimsToAddOrOverride.tenantId = tenantId;
    event.response.claimsOverrideDetails.claimsToAddOrOverride.activeTeamId = activeTeamId;

    if (momentoToken) {
      event.response.claimsOverrideDetails.claimsToAddOrOverride.momentoToken = momentoToken;
    }

    return event;
  } catch (error) {
    logger.error('Error in pre-token generation trigger', {
      error: error.message,
      stack: error.stack,
      userId: event.request?.userAttributes?.sub
    });
    throw error;
  }
};

const getUserProfile = async (userId) => {
  try {
    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: 'profile'
      })
    }));

    if (!response.Item) {
      return null;
    }

    return unmarshall(response.Item);
  } catch (err) {
    logger.error('Error fetching user profile', {
      error: err.message,
      stack: err.stack,
      userId
    });
    return null;
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


