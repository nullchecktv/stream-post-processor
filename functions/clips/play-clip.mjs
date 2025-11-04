import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();
const s3 = new S3Client();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { episodeId, clipId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    if (!episodeId || !clipId) {
      return formatResponse(400, {
        error: 'BadRequest',
        message: 'Episode ID and Clip ID are required'
      });
    }

    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `clip#${clipId}`
      })
    }));

    if (!result.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Clip with ID '${clipId}' was not found in episode '${episodeId}'`
      });
    }

    const clip = unmarshall(result.Item);

    if (!clip.s3Key) {
      return formatResponse(404, {
        error: 'NotFound',
        message: 'Clip video file not available'
      });
    }

    if (clip.status !== 'processed' && clip.status !== 'approved' && clip.status !== 'published') {
      return formatResponse(400, {
        error: 'BadRequest',
        message: 'Clip is not ready for playback'
      });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: clip.s3Key
    });

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `clip#${clipId}`
      }),
      UpdateExpression: 'ADD viewCount :increment SET updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':increment': 1,
        ':updatedAt': new Date().toISOString()
      })
    }));

    return formatResponse(200, {
      clipId: clip.clipId,
      episodeId: episodeId,
      title: clip.hook || clip.title,
      downloadUrl: downloadUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      duration: clip.duration,
      fileSize: clip.fileSize,
      viewCount: (clip.viewCount || 0) + 1
    });

  } catch (err) {
    console.error('Error playing clip:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
