import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, getPagingParams } from '../utils/api.mjs';
import { getCurrentClipStatus } from '../utils/clips.mjs';
import { encrypt } from '../utils/encoding.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { episodeId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { limit, nextToken } = getPagingParams(event);

    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      Limit: limit,
      ...(nextToken && { ExclusiveStartKey: nextToken }),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'clip#'
      })
    }));

    if (!result.Items || result.Items.length === 0) {
      return formatResponse(200, { items: [], count: 0 });
    }

    const clips = result.Items.map(item => {
      const clip = unmarshall(item);

      const currentStatus = getCurrentClipStatus(clip);

      return {
        id: clip.clipId,
        title: clip.hook || clip.title, // Use hook as title if available
        status: currentStatus,
        duration: clip.duration,
        type: clip.clipType,
      };
    });

    return formatResponse(200, {
      items: clips,
      count: clips.length,
      ...(result.LastEvaluatedKey && {
        nextToken: encrypt(JSON.stringify(result.LastEvaluatedKey))
      })
    });

  } catch (err) {
    console.error('Error listing clips:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
