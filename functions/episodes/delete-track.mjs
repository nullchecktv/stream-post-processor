import { DynamoDBClient, GetItemCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, sanitizeTrackName } from '../utils/api.mjs';
import { calculateTrackCount } from '../utils/episodes.mjs';

const ddb = new DynamoDBClient();
const s3 = new S3Client();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { episodeId, trackName: rawTrackName } = event.pathParameters;
    const trackName = sanitizeTrackName(rawTrackName);

    const trackKey = marshall({
      pk: `${tenantId}#${episodeId}`,
      sk: `data#track#${trackName}`
    });

    const getTrackResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: trackKey
    }));

    if (!getTrackResponse.Item) {
      return formatResponse(404, { message: `Track '${trackName}' not found` });
    }

    const track = unmarshall(getTrackResponse.Item);

    if (track.uploadKey) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: track.uploadKey
        }));
        logger.info('Deleted track file from S3', {
          episodeId,
          trackName,
          s3Key: track.uploadKey
        });
      } catch (s3Error) {
        logger.error('Failed to delete track file from S3', {
          error: s3Error.message,
          episodeId,
          trackName,
          s3Key: track.uploadKey
        });
      }
    }

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: trackKey
    }));

    const trackCount = await calculateTrackCount(episodeId, tenantId);

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      }),
      UpdateExpression: 'SET trackCount = :trackCount',
      ExpressionAttributeValues: marshall({
        ':trackCount': trackCount
      })
    }));

    logger.info('Updated episode trackCount after deletion', {
      episodeId,
      tenantId,
      trackName,
      trackCount
    });

    return formatResponse(204, null);
  } catch (error) {
    logger.error('Error deleting track', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      episodeId: event.pathParameters?.episodeId,
      trackName: event.pathParameters?.trackName
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
