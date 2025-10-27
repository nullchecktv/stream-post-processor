import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { parseBody, formatResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();
const s3 = new S3Client();

const TTL_SECONDS = 15 * 60;

export const handler = async (event) => {
  try {
    const { episodeId } = event.pathParameters;

    const body = parseBody(event);
    let filename, trackName;
    try {
      filename = (body?.filename || '').toString().trim();
      trackName = sanitizeTrackName(body?.trackName || '');
    } catch {
      return formatResponse(400, { message: 'Invalid request' });
    }
    const errors = [];
    if (!filename) errors.push('filename is required');
    if (!trackName) errors.push('trackName is required');
    if (errors.length) return formatResponse(400, { message: errors.join(', ') });

    const idempotencyKey = marshall({ pk: episodeId, sk: `track-upload:${trackName}` });
    const existing = await ddb.send(new GetItemCommand({ TableName: process.env.TABLE_NAME, Key: idempotencyKey }));
    const now = Math.floor(Date.now() / 1000);
    if (existing.Item) {
      const rec = unmarshall(existing.Item);
      if (typeof rec.ttl === 'number' && rec.ttl > now && rec.uploadId && rec.key && rec.expiresAt) {
        return formatResponse(200, {
          key: rec.key,
          uploadId: rec.uploadId,
          expiresAt: rec.expiresAt,
          requiredHeaders: {
            'x-amz-meta-filename': rec.originalFilename,
            'x-amz-meta-trackname': rec.trackName,
          },
        });
      }
    }

    const getEpisode = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: episodeId, sk: 'metadata' })
    }));
    if (!getEpisode.Item) return formatResponse(404, { message: 'Episode not found' });


    const ext = getExt(filename);
    const key = `${episodeId}/tracks/${trackName}${ext}`;

    const createRes = await s3.send(new CreateMultipartUploadCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      Metadata: {
        filename,
        trackname: trackName,
      },
    }));
    const uploadId = createRes.UploadId;
    const expiresAtISO = new Date((now + TTL_SECONDS) * 1000).toISOString();

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: episodeId,
        sk: `track-upload:${trackName}`,
        key,
        uploadId,
        originalFilename: filename,
        trackName,
        createdAt: new Date(now * 1000).toISOString(),
        expiresAt: expiresAtISO,
        ttl: now + TTL_SECONDS,
      })
    }));

    return formatResponse(200, {
      key,
      uploadId,
      expiresAt: expiresAtISO,
      requiredHeaders: {
        'x-amz-meta-filename': filename,
        'x-amz-meta-trackname': trackName,
      }
    });
  } catch (err) {
    console.error('Error initiating track upload:', err);
    return formatResponse(500, { message: 'Failed to initiate track upload' });
  }
};

const sanitizeTrackName = (name) => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
};

const getExt = (filename) => {
  const m = /\.([^.]{1,10})$/.exec(String(filename || ''));
  return m ? `.${m[1].toLowerCase()}` : '';
};
