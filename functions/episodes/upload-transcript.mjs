import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { EpisodePathParamsSchema, TranscriptUploadSchema } from '../../schemas/index.mjs';

const ddb = new DynamoDBClient();
const s3 = new S3Client();
const logger = new Logger({ serviceName: 'episodes' });

try { s3.middlewareStack.remove('flexibleChecksumsMiddleware'); } catch {}

const TTL_SECONDS = 15 * 60;

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, EpisodePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const requestValidation = await validateRequest(event, TranscriptUploadSchema);
    if (!requestValidation.success) {
      return requestValidation.error;
    }

    const { tenantId, data } = requestValidation;
    const { episodeId } = pathValidation.data;
    const { filename } = data;

    const idempotencyKey = marshall({ pk: `${tenantId}#${episodeId}`, sk: 'transcript-upload-url' });
    const existing = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: idempotencyKey
    }));

    const now = Math.floor(Date.now() / 1000);
    if (existing.Item) {
      const record = unmarshall(existing.Item);
      if (typeof record.ttl === 'number' && record.ttl > now && record.uploadUrl && record.key && record.expiresAt) {
        return formatResponse(200, {
          key: record.key,
          uploadUrl: record.uploadUrl,
          expiresAt: record.expiresAt,
          ...(record.originalFilename && { requiredHeaders: { 'x-amz-meta-filename': record.originalFilename } })
        });
      }
    }

    const getEpisode = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' })
    }));
    if (!getEpisode.Item) {
      return formatResponse(404, { message: 'Episode not found' });
    }

    const key = `${tenantId}/${episodeId}/transcript.srt`;

    const putParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: key,
    };
    if (filename) {
      putParams.Metadata = { filename };
    }
    const putCmd = new PutObjectCommand(putParams);
    // Keep metadata as a signed header, not a query param, so client mirrors it exactly
    const unhoist = new Set();
    if (filename) unhoist.add('x-amz-meta-filename');
    const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: TTL_SECONDS, unhoistableHeaders: unhoist });

    const expiresAtISO = new Date((now + TTL_SECONDS) * 1000).toISOString();
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'transcript-upload-url',
        key,
        uploadUrl,
        ...(filename && { originalFilename: filename }),
        createdAt: new Date(now * 1000).toISOString(),
        expiresAt: expiresAtISO,
        ttl: now + TTL_SECONDS,
      })
    }));

    return formatResponse(201, {
      key,
      uploadUrl,
      expiresAt: expiresAtISO,
      ...(filename && { requiredHeaders: { 'x-amz-meta-filename': filename } })
    });
  } catch (err) {
    logger.error('Error creating transcript upload URL', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId,
      filename: event.body ? JSON.parse(event.body)?.filename : undefined
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
