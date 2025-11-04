import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { parseEpisodeIdFromKey } from '../utils/clips.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const rawKey = event?.detail?.object?.key;
    if (!rawKey) {
      console.log('Unsupported event shape (expecting EventBridge S3 event):', JSON.stringify(event?.detail || {}));
      return { statusCode: 200 };
    }

    const key = decodeURIComponent(rawKey);
    let tenantId, episodeId;
    try {
      const parsed = parseEpisodeIdFromKey(key);
      tenantId = parsed.tenantId;
      episodeId = parsed.episodeId;
    } catch (e) {
      console.warn(`Skipping object with unexpected key: ${key}. Reason: ${e.message}`);
      return { statusCode: 200 };
    }

    if (!tenantId) {
      console.error('Missing tenantId in S3 key');
      return { statusCode: 200 };
    }

    const episodeResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' })
    }));

    if (!episodeResponse.Item) {
      console.warn(`Episode ${episodeId} not found; skipping transcript attachment for key ${key}`);
      return { statusCode: 200 };
    }

    const now = new Date().toISOString();
    const newStatus = 'transcript uploaded';

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: 'SET #transcriptKey = :key, #status = :status, #updatedAt = :updatedAt, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry)',
      ExpressionAttributeNames: {
        '#transcriptKey': 'transcriptKey',
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#statusHistory': 'statusHistory'
      },
      ExpressionAttributeValues: marshall({
        ':key': key,
        ':status': newStatus,
        ':updatedAt': now,
        ':emptyList': [],
        ':newStatusEntry': [{
          status: newStatus,
          timestamp: now
        }]
      }),
    }));

    try {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'transcript-upload-url' })
      }));
    } catch (e) {
      console.warn(`Failed to delete presigned url record for ${episodeId}: ${e?.message || e}`);
    }

    return { statusCode: 200 };
  } catch (err) {
    console.error('Error handling EventBridge S3 event:', err);
    throw err;
  }
};


