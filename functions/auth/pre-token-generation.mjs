import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { request } = event;
    const userAttributes = request.userAttributes;
    const userId = userAttributes.sub;
    const userProfile = await getUserProfile(userId);

    const tenantId = userProfile?.activeTeamId || userId;
    const activeTeamId = userProfile?.activeTeamId || null;

    if (!event.response.claimsOverrideDetails) {
      event.response.claimsOverrideDetails = {};
    }

    if (!event.response.claimsOverrideDetails.claimsToAddOrOverride) {
      event.response.claimsOverrideDetails.claimsToAddOrOverride = {};
    }

    event.response.claimsOverrideDetails.claimsToAddOrOverride.tenantId = tenantId;
    event.response.claimsOverrideDetails.claimsToAddOrOverride.activeTeamId = activeTeamId;

    return event;
  } catch (error) {
    console.error('Error in pre-token generation trigger:', error);
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
    console.error("Error fetching user profile:", err);
    return null;
  }
};
