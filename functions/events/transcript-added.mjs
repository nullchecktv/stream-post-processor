import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const rawKey = event?.detail?.object?.key;
    if (!rawKey) {
      console.log('Unsupported event shape (expecting EventBridge S3 event):', JSON.stringify(event?.detail || {}));
      return { statusCode: 200 };
    }

    const key = decodeURIComponent(rawKey);
    let episodeId;
    try {
      episodeId = parseEpisodeIdFromKey(key);
    } catch (e) {
      console.warn(`Skipping object with unexpected key: ${key}. Reason: ${e.message}`);
      return { statusCode: 200 };
    }

    const episodeResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: episodeId, sk: 'metadata' })
    }));

    if (!episodeResponse.Item) {
      console.warn(`Episode ${episodeId} not found; skipping transcript attachment for key ${key}`);
      return { statusCode: 200 };
    }

    const now = new Date().toISOString();
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: episodeId, sk: 'metadata' }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: 'SET #transcriptKey = :key, #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#transcriptKey': 'transcriptKey',
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: marshall({
        ':key': key,
        ':status': 'Transcript Uploaded',
        ':updatedAt': now,
      }),
    }));

    try {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: episodeId, sk: 'transcript-upload-url' })
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

const parseEpisodeIdFromKey = (key) => {
  const cleaned = key.replace(/^\/+/, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[1] !== 'transcript.srt') {
    throw new Error(`Unexpected key format: ${key}. Expected "/<episodeId>/transcript.srt"`);
  }
  return parts[0];
};
