import { DynamoDBClient, GetItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { Logger } from '@aws-lambda-powertools/logger';
import { parseBody, formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { getCurrentStatus } from '../utils/status-history.mjs';
import { EPISODE_STATUS, EPISODE_STATUS_TRANSITIONS, EpisodeStatusUpdateSchema } from '../../schemas/index.mjs';

const ddb = new DynamoDBClient();
const eb = new EventBridgeClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { episodeId } = event.pathParameters;
    const body = parseBody(event);

    if (body === null) {
      return formatResponse(400, { error: 'ValidationError', message: 'Invalid request body' });
    }

    let status;
    try {
      const validated = EpisodeStatusUpdateSchema.parse(body);
      status = validated.status;
    } catch (error) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'Invalid status value',
        details: error.errors
      });
    }

    const episodeResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      })
    }));

    if (!episodeResponse.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Episode with ID '${episodeId}' was not found`
      });
    }

    const episode = unmarshall(episodeResponse.Item);

    const currentStatus = getCurrentStatus(episode.statusHistory) || episode.status;

    const allowedTransitions = EPISODE_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(status)) {
      return formatResponse(400, {
        error: 'InvalidStatusTransition',
        message: `Cannot transition from '${currentStatus}' to '${status}'`,
        details: {
          currentStatus,
          requestedStatus: status,
          allowedTransitions
        }
      });
    }

    if (status === EPISODE_STATUS.READY) {
      const missingPrerequisites = [];

      const tracksResponse = await ddb.send(new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: marshall({
          ':pk': `${tenantId}#${episodeId}`,
          ':sk': 'data#track#'
        })
      }));

      const tracks = (tracksResponse.Items || []).map(item => unmarshall(item));

      if (tracks.length === 0) {
        missingPrerequisites.push('No tracks uploaded');
      }

      for (const track of tracks) {
        const currentTrackStatus = getCurrentStatus(track.statusHistory) || track.status;
        if (currentTrackStatus !== 'Processed') {
          missingPrerequisites.push(`Track '${track.trackName}' has status '${currentTrackStatus}', expected 'Processed'`);
        }
      }

      if (missingPrerequisites.length > 0) {
        return formatResponse(409, {
          error: 'PrerequisiteNotMet',
          message: 'Episode is not ready for clip generation',
          details: {
            missingPrerequisites
          }
        });
      }
    }

    const now = new Date().toISOString();
    const statusHistoryEntry = {
      status,
      timestamp: now
    };

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      }),
      UpdateExpression: 'SET statusHistory = list_append(if_not_exists(statusHistory, :emptyList), :newStatus), #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':emptyList': [],
        ':newStatus': [statusHistoryEntry],
        ':status': status,
        ':updatedAt': now
      })
    }));

    if (status === EPISODE_STATUS.READY) {
      try {
        await eb.send(new PutEventsCommand({
          Entries: [
            {
              Source: 'nullcheck',
              DetailType: 'Begin Clip Generation',
              Detail: JSON.stringify({
                tenantId,
                episodeId
              })
            }
          ]
        }));
      } catch (error) {
        logger.error('Failed to publish Begin Clip Generation event', {
          error: error.message,
          stack: error.stack,
          name: error.name,
          tenantId,
          episodeId
        });
      }
    }

    return formatEmptyResponse();

  } catch (error) {
    logger.error('Error updating episode status', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      episodeId: event.pathParameters?.episodeId,
      status: event.body ? JSON.parse(event.body)?.status : undefined
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
