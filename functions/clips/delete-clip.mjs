import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';

const logger = new Logger({ serviceName: 'clips' });
const ddb = new DynamoDBClient();
const s3 = new S3Client();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { episodeId, clipId } = event.pathParameters;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const getResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#clip#${clipId}`
      })
    }));

    if (!getResult.Item) {
      return formatResponse(204);
    }

    const clip = unmarshall(getResult.Item);

    if (clip.s3Key || clip.segments) {
      await deleteClipFiles(clip, episodeId, clipId);
    }

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#clip#${clipId}`
      })
    }));

    await incrementClipsDeleted(tenantId);

    return formatResponse(204);

  } catch (err) {
    logger.error('Error deleting clip', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId,
      clipId: event.pathParameters?.clipId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};

const deleteClipFiles = async (clip, episodeId, clipId) => {
  const keysToDelete = [];

  if (clip.s3Key) {
    keysToDelete.push(clip.s3Key);
  }

  if (clip.segments && Array.isArray(clip.segments)) {
    for (const segment of clip.segments) {
      if (segment.s3Key) {
        keysToDelete.push(segment.s3Key);
      }
    }
  }

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
        logger.warn('Some clip files could not be deleted', {
          errors: result.Errors,
          clipId
        });
      }

      logger.info('Deleted clip files', {
        deletedCount: result.Deleted?.length || 0,
        clipId
      });
    } catch (error) {
      logger.error('Error deleting clip files from S3', {
        error: error.message,
        stack: error.stack,
        clipId,
        keysToDelete
      });
      // Don't fail the entire operation if S3 cleanup fails
    }
  }
};

const incrementClipsDeleted = async (tenantId) => {
  const now = new Date().toISOString();

  try {
    await ddb.send(new UpdateItemCommand({
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
      ReturnValues: 'NONE'
    }));
  } catch (error) {
    if (error.name === 'ValidationException') {
      try {
        await ddb.send(new UpdateItemCommand({
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
        logger.error('Error creating clips deleted stat', {
          error: createError.message,
          stack: createError.stack,
          tenantId
        });
      }
    } else {
      logger.error('Error incrementing clips deleted stat', {
        error: error.message,
        stack: error.stack,
        tenantId
      });
    }
  }
};
