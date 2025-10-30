import { DynamoDBClient, GetItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { parseBody, formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { getCurrentStatus } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();
const eb = new EventBridgeClient();

const VALID_STATUSES = new Set(['Ready for Clip Gen']);

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { episodeId } = event.pathParameters;
    const body = parseBody(event);

    if (body === null) {
      return formatResponse(400, { error: 'ValidationError', message: 'Invalid request body' });
    }

    const status = body?.status?.toString().trim();
    if (!status || !VALID_STATUSES.has(status)) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'Status is required and must be one of: Ready for Clip Gen'
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

    if (status === 'Ready for Clip Gen') {
      const missingPrerequisites = [];

      const currentEpisodeStatus = getCurrentStatus(episode.statusHistory) || episode.status;
      if (currentEpisodeStatus !== 'tracks uploaded') {
        missingPrerequisites.push(`Episode has status '${currentEpisodeStatus}', expected 'tracks uploaded'`);
      }

      const tracksResponse = await ddb.send(new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: marshall({
          ':pk': `${tenantId}#${episodeId}`,
          ':sk': 'track#'
        })
      }));

      const tracks = (tracksResponse.Items || []).map(item => unmarshall(item));

      for (const track of tracks) {
        const currentTrackStatus = getCurrentStatus(track.statusHistory) || track.status;
        if (currentTrackStatus !== 'processed') {
          missingPrerequisites.push(`Track '${track.trackName}' has status '${currentTrackStatus}', expected 'processed'`);
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

    if (status === 'Ready for Clip Gen') {
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
        console.error('Failed to publish Begin Clip Generation event:', error);
      }
    }

    return formatEmptyResponse();

  } catch (error) {
    console.error('Error updating episode status:', error);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
