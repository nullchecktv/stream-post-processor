import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

const parsePath = (key) => {
  const raw = key.replace(/^transcripts\//, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Unexpected transcript key structure: ${key}`);
  }
  const tenantId = parts[0];
  const file = parts[parts.length - 1];
  const transcriptId = file.replace(/\.[^.]+$/, '');
  return { tenantId, transcriptId };
};

export const handler = async (event) => {
  try {
    if (!event?.Records?.length) {
      console.log('No S3 records in event');
      return { statusCode: 200 };
    }

    const puts = event.Records.map(async (record) => {
      const bucket = record.s3?.bucket?.name;
      const key = decodeURIComponent(record.s3?.object?.key || '');
      const size = record.s3?.object?.size ?? null;
      const eTag = record.s3?.object?.eTag ?? null;
      const versionId = record.s3?.object?.versionId ?? null;

      if (!key.startsWith('transcripts/')) {
        console.log(`Ignoring non-transcripts key: ${key}`);
        return;
      }

      let ids;
      try {
        ids = parsePath(key);
      } catch (e) {
        console.warn(`Skipping unexpected key structure: ${key} (${e.message})`);
        return;
      }
      const { tenantId, transcriptId } = ids;

      const item = marshall({
        pk: `${tenantId}#${transcriptId}`,
        sk: 'transcript',
        tenantId,
        transcriptId,
        s3Bucket: bucket,
        s3Key: key,
        size,
        eTag,
        versionId,
        status: 'available',
        createdAt: new Date().toISOString()
      });

      await ddb.send(
        new PutItemCommand({
          TableName: process.env.TABLE_NAME,
          // No overwrite if already present
          ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
          Item: item
        })
      );
      console.log(`Indexed transcript ${tenantId}/${transcriptId} from s3://${bucket}/${key}`);
    });

    await Promise.allSettled(puts);

    return { statusCode: 200 };
  } catch (err) {
    console.error('Error handling S3 put event:', err);
    throw err;
  }
};
