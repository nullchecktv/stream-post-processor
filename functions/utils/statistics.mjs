import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

export async function getOrCreateClipStats(tenantId) {
  try {
    const response = await ddb.send(
      new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: tenantId,
          sk: 'stats'
        }),
      })
    );

    if (response.Item) {
      return unmarshall(response.Item);
    }

    const now = new Date().toISOString();
    const initial = {
      pk: tenantId,
      sk: 'stats',
      totalClips: 0,
      clipsByType: {
        educational: 0,
        funny: 0,
        demo: 0,
        hot_take: 0,
        insight: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(
      new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall(initial),
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      })
    );

    return initial;
  } catch (err) {
    console.error('Error getting or creating clip stats:', err);
    throw err;
  }
}

/**
 * Increment clip counts when clips are created.
 * Safe to call even if the stats record doesn't exist.
 */
export async function incrementClipsCreated(tenantId, clipType, isRetry = false) {
  const now = new Date().toISOString();

  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: tenantId,
          sk: 'stats'
        }),
        UpdateExpression: 'ADD totalClips :one, clipsByType.#type :one SET updatedAt = :now',
        ExpressionAttributeNames: { '#type': clipType },
        ExpressionAttributeValues: marshall({
          ':one': 1,
          ':now': now,
        }),
      })
    );
  } catch (err) {
    // If record doesn’t exist, create it once and retry
    if (err.name === 'ValidationException' && !isRetry) {
      console.error(err, `Is Retry: ${isRetry}`);
      await getOrCreateClipStats(tenantId);
      await incrementClipsCreated(tenantId, clipType, true);
      return;
    }
    console.error('Error incrementing clip stats:', err);
  }
}

export async function getClipStats(tenantId) {
  try {
    const res = await ddb.send(
      new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: tenantId,
          sk: 'stats'
        })
      })
    );
    return res.Item ? unmarshall(res.Item) : null;
  } catch (err) {
    console.error('Error retrieving clip stats:', err);
    throw err;
  }
}
