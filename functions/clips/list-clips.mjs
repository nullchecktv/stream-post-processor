import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, getPagingParams, buildPagingParams } from '../utils/api.mjs';
import { getCurrentClipStatus } from '../utils/clips.mjs';

const logger = new Logger({ serviceName: 'clips' });

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { episodeId } = event.pathParameters;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { limit, nextToken } = getPagingParams(event);

    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      Limit: limit,
      ...(nextToken && { ExclusiveStartKey: nextToken }),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'data#clip#'
      })
    }));

    if (!result.Items || result.Items.length === 0) {
      return formatResponse(200, buildPagingParams([], null));
    }

    const clips = result.Items.map(item => {
      const clip = unmarshall(item);

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

      return {
        id: clip.clipId,
        episodeId: episodeId,
        title: clip.title,
        status: currentStatus,
        duration: clip.totalDurationSeconds || clip.duration || 0,
        transcript: transcript,
        segmentCount: segmentCount,
        summary: clip.summary,
        clipType: clip.clipType,
        createdAt: clip.createdAt,
        updatedAt: clip.updatedAt
      };
    });

    return formatResponse(200, buildPagingParams(clips, result.LastEvaluatedKey));

  } catch (err) {
    logger.error('Error listing clips', {
      error: err.message,
      stack: err.stack,
      episodeId: event?.pathParameters?.episodeId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
