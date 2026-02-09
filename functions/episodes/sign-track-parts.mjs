import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { formatResponse, parseBody, sanitizeTrackName } from '../utils/api.mjs';

const logger = new Logger({ serviceName: 'episodes' });

const ddb = new DynamoDBClient();
const s3 = new S3Client();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { episodeId, trackName: rawTrackName } = event.pathParameters;
    const trackName = sanitizeTrackName(rawTrackName);

    const body = parseBody(event);
    if (!body) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'Request body is required'
      });
    }

    let uploadId, partNumbers;
    try {
      uploadId = body.uploadId ? String(body.uploadId).trim() : '';
      partNumbers = Array.isArray(body.partNumbers) ? body.partNumbers : [];
    } catch (err) {
      logger.error('Error parsing request body', {
        error: err.message,
        body
      });
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'Invalid request format'
      });
    }

    if (!uploadId) {
      return formatResponse(400, {
        message: 'Validation failed',
        errors: [{ field: 'uploadId', message: 'uploadId is required', code: 'required' }]
      });
    }

    if (!partNumbers.length) {
      return formatResponse(400, {
        message: 'Validation failed',
        errors: [{ field: 'partNumbers', message: 'partNumbers array is required and must not be empty', code: 'required' }]
      });
    }

    const trackResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: `track-upload:${trackName}` })
    }));
    if (!trackResponse.Item) return formatResponse(404, {
      error: 'NotFound',
      message: `Upload session was not found for track '${trackName}' in episode '${episodeId}'`
    });

    const track = unmarshall(trackResponse.Item);
    if (track.uploadId !== uploadId) {
      logger.error('uploadId mismatch', {
        providedUploadId: uploadId,
        storedUploadId: track.uploadId,
        episodeId,
        trackName
      });
      return formatResponse(400, {
        message: 'uploadId mismatch for this track',
        details: {
          provided: uploadId.substring(0, 20) + '...',
          expected: track.uploadId ? track.uploadId.substring(0, 20) + '...' : 'none'
        }
      });
    }

    const parts = await Promise.all(partNumbers.map(async (partNumber) => {
      const cmd = new UploadPartCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: track.key,
        UploadId: uploadId,
        PartNumber: partNumber
      });
      const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 15 * 60 });
      return { partNumber, uploadUrl };
    }));

    return formatResponse(200, { parts });
  } catch (err) {
    logger.error('Error signing track upload parts', {
      error: err.message,
      stack: err.stack,
      episodeId: event?.pathParameters?.episodeId,
      trackName: event?.pathParameters?.trackName
    });
    return formatResponse(500, {
      error: 'InternalError',
      message: 'Failed to sign part URLs'
    });
  }
};
