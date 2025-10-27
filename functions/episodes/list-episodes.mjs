import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { encrypt, decrypt } from '../utils/encoding.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const query = event?.queryStringParameters || {};
    let limit = query?.limit;
    let nextToken = query?.nextToken;
    if (limit !== undefined && limit !== null && limit !== '') {
      const n = parseInt(limit, 10);
      limit = Math.max(1, Math.min(20, Number.isFinite(n) ? n : 20));
    }
    if (nextToken) {
      try {
        nextToken = decrypt(nextToken);
      } catch (e) {
        console.warn('Invalid nextToken supplied');
        nextToken = undefined;
      }
    }

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
        ':episode': 'episode'
      }),
    }));

    const episodes = (res.Items || []).map((i) => {
      const item = unmarshall(i);
      return {
        id: item.pk,
        title: item.title,
        status: item.status,
        ...item.airDate && { airDate: item.airDate },
        ...item.platforms && { platforms: item.platforms }
      };
    });

    return formatResponse(200, {
      items: episodes,
      count: episodes.length,
      ...res.LastEvaluatedKey && { nextToken: encrypt(res.LastEvaluatedKey) },
    });
  } catch (err) {
    console.error(err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
