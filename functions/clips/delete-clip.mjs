import { DynamoDBClient, GetCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
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

    // Get clip from DynamoDB to check if it exists and get S3 keys
    const getResult = await ddb.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `clip#${clipId}`
      })
    }));

    // If clip doesn't exist, still return 204 (idempotent delete)
    if (!getResult.Item) {
      return formatResponse(204);
    }

    const clip = unmarshall(getResult.Item);

    // Delete S3 files if clip has associated files
    if (clip.s3Key || clip.segments) {
      await deleteClipFiles(clip, episodeId, clipId);
    }

    // Delete clip from DynamoDB
    await ddb.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `clip#${clipId}`
      })
    }));

    // Update tenant statistics
    await incrementClipsDeleted(tenantId);

    return formatResponse(204);

  } catch (err) {
    console.error('Error deleting clip:', err);
    return formatResponse(500, {
      error: 'InternalError',
      message: 'Something went wrong'
    });
  }
};

/**
 * Delete all S3 files associated with a clip
 */
const deleteClipFiles = async (clip, episodeId, clipId) => {
  const keysToDelete = [];

  // Add main clip file if it exists
  if (clip.s3Key) {
    keysToDelete.push(clip.s3Key);
  }

  // Add segment files if they exist
  if (clip.segments && Array.isArray(clip.segments)) {
    for (const segment of clip.segments) {
      if (segment.s3Key) {
        keysToDelete.push(segment.s3Key);
      }
    }
  }

  // Add any other potential clip-related files based on standard patterns
  const clipPrefix = `${episodeId}/clips/${clipId}/`;

  // If we have specific keys, delete them
  if (keysToDelete.length > 0) {
    try {
      const deleteParams = {
        Bucket: process.env.BUCKET_NAME,
        Delete: {
          Objects: keysToDelete.map(key => ({ Key: key })),
          Quiet: true
        }
      };

      const result = await s3.send(new DeleteObjectsCommand(deleteParams));

      if (result.Errors && result.Errors.length > 0) {
        console.warn('Some clip files could not be deleted:', result.Errors);
      }

      console.log(`Deleted ${result.Deleted?.length || 0} clip files for clip ${clipId}`);
    } catch (error) {
      console.error('Error deleting clip files from S3:', error);
      // Don't fail the entire operation if S3 cleanup fails
    }
  }
};

/**
 * Increment clips deleted count in tenant statistics
 */
const incrementClipsDeleted = async (tenantId) => {
  const now = new Date().toISOString();

  try {
    await ddb.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'stats'
      }),
      UpdateExpression: 'ADD clipsDeleted :one SET updatedAt = :now',
      ExpressionAttributeValues: marshall({
        ':one': 1,
        ':now': now
      }),
      // Create the field if it doesn't exist
      ReturnValues: 'NONE'
    }));
  } catch (error) {
    // If stats record doesn't exist, create it with initial values
    if (error.name === 'ValidationException') {
      try {
        await ddb.send(new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: tenantId,
            sk: 'stats'
          }),
          UpdateExpression: 'SET clipsDeleted = :one, updatedAt = :now',
          ConditionExpression: 'attribute_not_exists(clipsDeleted)',
          ExpressionAttributeValues: marshall({
            ':one': 1,
            ':now': now
          })
        }));
      } catch (createError) {
        console.error('Error creating clips deleted stat:', createError);
      }
    } else {
      console.error('Error incrementing clips deleted stat:', error);
    }
  }
};
