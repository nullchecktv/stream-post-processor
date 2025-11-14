import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { generateMomentoToken } from '../utils/momento.mjs';

const logger = new Logger({ serviceName: 'tokens' });
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      return formatResponse(401, { message: 'User ID not found in authorization context' });
    }

    const userProfile = await getUserProfile(userId);
    const teams = userProfile?.teams || [];
    const momentoToken = await generateMomentoToken(userId, teams);

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
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
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


