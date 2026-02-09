import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { getCurrentClipStatus } from '../utils/clips.mjs';

const logger = new Logger({ serviceName: 'clips' });
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { episodeId, clipId } = event.pathParameters;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
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
        sk: `data#clip#${clipId}`
      })
    }));

    if (!result.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Clip with ID '${clipId}' was not found in episode '${episodeId}'`
      });
    }

    const clip = unmarshall(result.Item);

    const currentStatus = getCurrentClipStatus(clip);

    const segments = clip.segments || [];
    const segmentCount = segments.length;

    const transcript = segments
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(segment => {
        const speaker = segment.speaker || 'unknown';
        const text = segment.transcript || '';
        return `[${speaker}]: ${text}`;
      })
      .join('\n\n');

    const response = {
      id: clip.clipId,
      episodeId: episodeId,
      title: clip.title,
      summary: clip.summary,
      description: clip.summary || clip.description,
      status: currentStatus,
      duration: clip.totalDurationSeconds || clip.duration || 0,
      segmentCount: segmentCount,
      transcript: transcript,
      clipType: clip.clipType,
      tags: clip.tags || [],
      createdAt: clip.createdAt,
      updatedAt: clip.updatedAt,
      ...clip.fileSize && { fileSize: clip.fileSize }
    };

    return formatResponse(200, response);

  } catch (err) {
    logger.error('Error getting clip', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId,
      clipId: event.pathParameters?.clipId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
