import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { parseBody, formatResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { episodeId, trackName } = event.pathParameters;

    const data = parseBody(event);
    if (data === null) {
      return formatResponse(400, { message: 'Invalid request' });
    }

    let speakers = data?.speakers;
    if (speakers !== undefined) {
      if (!Array.isArray(speakers)) {
        return formatResponse(400, { message: '"speakers" must be an array' });
      }

      speakers = speakers
        .map(speaker => String(speaker || '').trim())
        .filter(speaker => speaker.length > 0);
    } else {
      speakers = [];
    }

    const trackKey = marshall({ pk: episodeId, sk: `track#${trackName}` });
    const getTrackResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: trackKey
    }));

    if (!getTrackResponse.Item) {
      return formatResponse(404, { message: `Track '${trackName}' not found for episode '${episodeId}'` });
    }

    const now = new Date().toISOString();
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: trackKey,
      UpdateExpression: 'SET speakers = :speakers, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':speakers': speakers,
        ':updatedAt': now
      }),
      ReturnValues: 'NONE'
    }));

    return formatEmptyResponse();
  } catch (error) {
    console.error('Error updating track:', error);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
