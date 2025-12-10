import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { TRACK_STATUS } from '../../schemas/tracks.mjs';

const ddb = new DynamoDBClient();

export const calculateTrackCount = async (episodeId, tenantId) => {
  const response = await ddb.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: {
      ':pk': { S: `${tenantId}#${episodeId}` },
      ':sk': { S: 'data#track#' }
    }
  }));

  if (!response.Items || response.Items.length === 0) {
    return 0;
  }

  const tracks = response.Items.map(item => unmarshall(item));
  const validTracks = tracks.filter(track =>
    track.status === TRACK_STATUS.UPLOADED ||
    track.status === TRACK_STATUS.PROCESSED
  );

  return validTracks.length;
};
