import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, sanitizeTrackName } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { EpisodePathParamsSchema, TrackCreateSchema, TRACK_STATUS } from '../../schemas/index.mjs';
import { validateSpeakers, formatSpeakerValidationError } from '../utils/speakers.mjs';

const ddb = new DynamoDBClient();
const s3 = new S3Client();
const logger = new Logger({ serviceName: 'episodes' });

const TTL_SECONDS = 15 * 60;


export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, EpisodePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const requestValidation = await validateRequest(event, TrackCreateSchema);
    if (!requestValidation.success) {
      return requestValidation.error;
    }

    const { tenantId, data } = requestValidation;
    const { episodeId } = pathValidation.data;
    const { filename, trackName: rawTrackName, speakers } = data;

    const trackName = sanitizeTrackName(rawTrackName);
    const inputSpeakers = speakers ? speakers.map(speaker => speaker.trim()).filter(speaker => speaker.length > 0) : [];

    if (inputSpeakers.length > 0) {
      const validation = await validateSpeakers(episodeId, tenantId, inputSpeakers);

      if (!validation.valid) {
        return formatSpeakerValidationError(validation, episodeId, 'Track');
      }

      var normalizedSpeakers = validation.normalizedSpeakers;
    } else {
      var normalizedSpeakers = [];
    }

    const idempotencyKey = marshall({ pk: `${tenantId}#${episodeId}`, sk: `track-upload:${trackName}` });
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
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' })
    }));
    if (!getEpisode.Item) return formatResponse(404, { message: 'Episode not found' });


    const ext = getExt(filename);
    const key = `${tenantId}/${episodeId}/tracks/${trackName}${ext}`;

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
        pk: `${tenantId}#${episodeId}`,
        sk: `track-upload:${trackName}`,
        key,
        uploadId,
        originalFilename: filename,
        trackName,
        speakers: normalizedSpeakers,
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
    logger.error('Error initiating track upload', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId,
      trackName: event.body ? JSON.parse(event.body)?.trackName : undefined
    });
    return formatResponse(500, { message: 'Failed to initiate track upload' });
  }
};



const getExt = (filename) => {
  const m = /\.([^.]{1,10})$/.exec(String(filename || ''));
  return m ? `.${m[1].toLowerCase()}` : '';
};


