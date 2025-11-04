import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { getCurrentStatus } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { episodeId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    if (!episodeId) {
      return formatResponse(400, { error: 'ValidationError', message: 'Episode ID is required' });
    }

    const res = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'track#'
      })
    }));

    const tracks = (res.Items || []).map((item) => {
      const track = unmarshall(item);

      const currentStatus = getCurrentStatus(track.statusHistory) || track.status || 'Unknown';

      return {
        id: track.trackName,
        name: track.trackName,
        status: currentStatus
      };
    });

    return formatResponse(200, tracks);
  } catch (err) {
    console.error('Error listing tracks:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
