import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const detail = event?.detail || {};
    const meta = detail?.userMetadata || {};

    const episodeId = (meta.episodeId || '').toString().trim();
    const trackName = ((meta.trackName || meta.videoName) || '').toString().trim();
    const jobId = (detail?.jobId || '').toString().trim();
    const status = (detail?.status || '').toString().trim();
    const reason = (
      detail?.message ||
      detail?.errorMessage ||
      detail?.errorCode ||
      `MediaConvert job ${status || 'FAILED'}`
    ).toString();

    if (!episodeId || !trackName) {
      console.warn('Missing identifiers in MediaConvert failure event.', JSON.stringify({ jobId, meta, status }));
      return { statusCode: 200 };
    }

    const now = new Date().toISOString();

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: episodeId, sk: `track#${trackName}` }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: 'SET #status = :failed, #failureReason = :reason, #updatedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#failureReason': 'failureReason',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: marshall({
        ':failed': 'ProcessingFailed',
        ':reason': reason,
        ':now': now,
      })
    }));

    console.error(`Marked ${episodeId}/track#${trackName} as ProcessingFailed (job ${jobId || 'n/a'}): ${reason}`);
    return { statusCode: 200 };
  } catch (err) {
    console.error('Error handling MediaConvert failure:', err);
    throw err;
  }
};

