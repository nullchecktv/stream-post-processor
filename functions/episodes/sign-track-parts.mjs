import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { formatResponse, parseBody } from '../utils/api.mjs';

const ddb = new DynamoDBClient();
const s3 = new S3Client();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { episodeId, trackName } = event.pathParameters;

    const body = parseBody(event);
    let uploadId, partNumbers;
    try {
      uploadId = (body?.uploadId || '').toString().trim();
      partNumbers = Array.isArray(body?.partNumbers) ? body.partNumbers : [];
    } catch {
      return formatResponse(400, { message: 'Invalid request' });
    }
    if (!uploadId || !partNumbers.length) return formatResponse(400, { message: 'uploadId and partNumbers are required' });

    const trackResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: `track-upload:${trackName}` })
    }));
    if (!trackResponse.Item) return formatResponse(404, { message: 'Upload not found' });

    const track = unmarshall(trackResponse.Item);
    if (track.uploadId !== uploadId) return formatResponse(400, { message: 'uploadId mismatch for this track' });

    const urls = await Promise.all(partNumbers.map(async (partNumber) => {
      const cmd = new UploadPartCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: track.key,
        UploadId: uploadId,
        PartNumber: partNumber
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 15 * 60 });
      return { partNumber, url };
    }));

    return formatResponse(200, { urls });
  } catch (err) {
    console.error('Error signing track upload parts:', err);
    return formatResponse(500, { message: 'Failed to sign part URLs' });
  }
};
