import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const {
      episodeId,
      clipId,
      clipS3Key,
      fileSize,
      status = 'processed',
      processingStartTime,
      processingMetadata = {},
      duration,
      error: processingError
    } = event;

    if (!episodeId || !clipId) {
      throw new Error('Missing required parameters: episodeId, clipId');
    }

    const now = new Date().toISOString();

    let processingDuration;
    if (processingStartTime) {
      const startTime = new Date(processingStartTime);
      const endTime = new Date();
      processingDuration = (endTime - startTime) / 1000;
    }

    const updateParams = {
      TableName: process.env.TABLE_NAME,
      Key: {
        pk: episodeId,
        sk: `clip#${clipId}`
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': now
      }
    };

    if (clipS3Key) {
      updateParams.UpdateExpression += ', #s3Key = :s3Key';
      updateParams.ExpressionAttributeNames['#s3Key'] = 's3Key';
      updateParams.ExpressionAttributeValues[':s3Key'] = clipS3Key;
    }

    if (typeof fileSize === 'number') {
      updateParams.UpdateExpression += ', #fileSize = :fileSize';
      updateParams.ExpressionAttributeNames['#fileSize'] = 'fileSize';
      updateParams.ExpressionAttributeValues[':fileSize'] = fileSize;
    }

    if (duration) {
      updateParams.UpdateExpression += ', #duration = :duration';
      updateParams.ExpressionAttributeNames['#duration'] = 'duration';
      updateParams.ExpressionAttributeValues[':duration'] = duration;
    }

    if (status === 'processed') {
      updateParams.UpdateExpression += ', #processedAt = :processedAt';
      updateParams.ExpressionAttributeNames['#processedAt'] = 'processedAt';
      updateParams.ExpressionAttributeValues[':processedAt'] = now;
    }

    if (typeof processingDuration === 'number') {
      updateParams.UpdateExpression += ', #processingDuration = :processingDuration';
      updateParams.ExpressionAttributeNames['#processingDuration'] = 'processingDuration';
      updateParams.ExpressionAttributeValues[':processingDuration'] = processingDuration;
    }

    if (Object.keys(processingMetadata).length > 0) {
      updateParams.UpdateExpression += ', #processingMetadata = :processingMetadata';
      updateParams.ExpressionAttributeNames['#processingMetadata'] = 'processingMetadata';
      updateParams.ExpressionAttributeValues[':processingMetadata'] = processingMetadata;
    }

    if (status === 'failed' && processingError) {
      updateParams.UpdateExpression += ', #processingError = :processingError';
      updateParams.ExpressionAttributeNames['#processingError'] = 'processingError';
      updateParams.ExpressionAttributeValues[':processingError'] = {
        message: processingError.message || processingError,
        timestamp: now,
        ...(processingError.code && { code: processingError.code })
      };
    }

    await docClient.send(new UpdateCommand(updateParams));

    return {
      success: true,
      episodeId,
      clipId,
      status,
      updatedAt: now,
      ...(processingDuration && { processingDuration }),
      ...(clipS3Key && { clipS3Key }),
      ...(fileSize && { fileSize })
    };

  } catch (error) {
    console.error('Update clip record failed:', error);

    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error(`Clip record not found or condition failed: ${episodeId}/${clipId}`);
    }

    if (error.name === 'ResourceNotFoundException') {
      throw new Error(`DynamoDB table not found: ${process.env.TABLE_NAME}`);
    }

    throw error;
  }
};
