import { DynamoDBClient, GetCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { getCurrentClipStatus } from '../utils/clips.mjs';

const ddb = new DynamoDBClient();

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

    // Get clip from DynamoDB
    const result = await ddb.send(new GetCommand({
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

    // Compute current status from statusHistory, fallback to status field
    const currentStatus = getCurrentClipStatus(clip);

    // Build response with current status and maintain backward compatibility
    const response = {
      id: clip.clipId,
      episodeId: episodeId,
      title: clip.hook || clip.title, // Use hook as title if available
      description: clip.summary || clip.description,
      status: currentStatus,
      duration: clip.duration,
      tags: clip.tags || [],
      segments: clip.segments || [],
      createdAt: clip.createdAt,
      updatedAt: clip.updatedAt
    };

    // Add optional fields if they exist
    if (clip.processedAt) response.processedAt = clip.processedAt;
    if (clip.s3Key) response.s3Key = clip.s3Key;
    if (clip.fileSize) response.fileSize = clip.fileSize;
    if (clip.processingDuration) response.processingDuration = clip.processingDuration;
    if (clip.processingMetadata) response.processingMetadata = clip.processingMetadata;
    if (clip.processingError) response.processingError = clip.processingError;
    if (clip.aiAnalysis) response.aiAnalysis = clip.aiAnalysis;

    return formatResponse(200, response);

  } catch (err) {
    console.error('Error getting clip:', err);
    return formatResponse(500, {
      error: 'InternalError',
      message: 'Something went wrong'
    });
  }
};
