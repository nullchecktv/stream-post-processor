import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();


/**
 * Get tracks for an episode and find the one that contains the speaker
 * @param {string} episodeId - The episode ID
 * @param {string} speaker - The speaker name to match
 * @param {string} tenantId - The tenant ID for data isolation
 * @returns {Promise<Object|null>} The track object or null if no match
 */
export const selectTrackForSpeaker = async (episodeId, speaker, tenantId) => {
  if (!speaker || typeof speaker !== 'string') {
    return null;
  }

  const tracks = await getTracksForEpisode(episodeId, tenantId);

  if (tracks.length === 0) {
    console.error(`No tracks found for episode '${episodeId}'`);
    return null;
  }

  const matchingTrack = tracks.find(track => {
    const speakers = track.speakers;
    if (!Array.isArray(speakers)) return false;

    return speakers.some(trackSpeaker =>
      typeof trackSpeaker === 'string' &&
      trackSpeaker.toLowerCase() === speaker.toLowerCase()
    );
  });

  return matchingTrack || null;
};

/**
 * Get tracks for multiple speakers
 * @param {string} episodeId - The episode ID
 * @param {Array<string>} speakers - Array of speaker names
 * @param {string} tenantId - The tenant ID for data isolation
 * @returns {Promise<Object>} Object mapping speakers to their tracks
 */
export const selectTracksForSpeakers = async (episodeId, speakers, tenantId) => {

  const tracks = await getTracksForEpisode(episodeId, tenantId);

  const results = {};
  const matchedSpeakers = [];
  const unmatchedSpeakers = [];

  for (const speaker of speakers) {
    if (!speaker || typeof speaker !== 'string') {
      results[speaker] = null;
      unmatchedSpeakers.push(speaker);
      continue;
    }

    const matchingTrack = tracks.find(track => {
      const trackSpeakers = track.speakers;
      if (!Array.isArray(trackSpeakers)) return false;

      return trackSpeakers.some(trackSpeaker =>
        typeof trackSpeaker === 'string' &&
        trackSpeaker.toLowerCase() === speaker.toLowerCase()
      );
    });
    results[speaker] = matchingTrack || null;

    if (matchingTrack) {
      matchedSpeakers.push({ speaker, trackName: matchingTrack.trackName });
    } else {
      unmatchedSpeakers.push(speaker);
    }
  }


  return results;
};

/**
 * Query all tracks for an episode
 * @param {string} episodeId - The episode ID
 * @param {string} tenantId - The tenant ID for data isolation
 * @returns {Promise<Array>} Array of track objects
 */
const getTracksForEpisode = async (episodeId, tenantId) => {
  const maxTracks = parseInt(process.env.MAX_TRACKS_PER_EPISODE) || 50;

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `${tenantId}#${episodeId}` },
        ':sk': { S: 'track#' }
      },
      Limit: maxTracks
    }));

    const tracks = result.Items ? result.Items.map(item => unmarshall(item)) : [];


    const validTracks = tracks.filter(track => {
      if (!track.trackName) {
        return false;
      }
      return true;
    });


    return validTracks;
  } catch (error) {
    console.error(`Failed to query tracks for episode '${episodeId}'`);
    throw error;
  }
};
