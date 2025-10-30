import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, getPagingParams } from '../utils/api.mjs';
import { encrypt } from '../utils/encoding.mjs';
import { getCurrentStatus } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { limit, nextToken } = getPagingParams(event);

    const res = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      Limit: limit,
      ...nextToken && { ExclusiveStartKey: nextToken },
      KeyConditionExpression: '#GSI1PK = :episode',
      ExpressionAttributeNames: {
        '#GSI1PK': 'GSI1PK'
      },
      ExpressionAttributeValues: marshall({
        ':episode': `${tenantId}#episode`
      }),
    }));

    const episodes = (res.Items || []).map((i) => {
      const item = unmarshall(i);

      const currentStatus = getCurrentStatus(item.statusHistory) || item.status;

      return {
        id: item.pk.split('#')[1],
        title: item.title,
        status: currentStatus,
        ...item.airDate && { airDate: item.airDate }
      };
    });

    return formatResponse(200, {
      items: episodes,
      count: episodes.length,
      ...res.LastEvaluatedKey && { nextToken: encrypt(JSON.stringify(res.LastEvaluatedKey)) },
    });
  } catch (err) {
    console.error(err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
