import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();

// Log levels: ERROR=0, WARN=1, INFO=2, DEBUG=3
const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const currentLogLevel = LOG_LEVELS[process.env.TRACK_SELECTION_LOG_LEVEL] ?? LOG_LEVELS.INFO;

const log = (level, message, data = null) => {
  if (LOG_LEVELS[level] <= currentLogLevel) {
    const logData = data ? { message, data } : { message };
    console.log(`[TRACK_SELECTION:${level}]`, JSON.stringify(logData));
  }
};

/**
 * Get tracks for an episode and find the one that contains the speaker
 * @param {string} episodeId - The episode ID
 * @param {string} speaker - The speaker name to match
 * @returns {Promise<Object|null>} The track object or null if no match
 */
export const selectTrackForSpeaker = async (episodeId, speaker) => {
  log('DEBUG', 'Starting track selection', { episodeId, speaker });

  const tracks = await getTracksForEpisode(episodeId);
  log('INFO', 'Retrieved tracks for episode', { episodeId, trackCount: tracks.length });

  if (tracks.length === 0) {
    log('ERROR', 'No tracks found for episode', { episodeId });
    return null;
  }

  const matchingTrack = tracks.find(track => (track.speakers || []).includes(speaker));

  if (matchingTrack) {
    log('INFO', 'Found matching track for speaker', {
      episodeId,
      speaker,
      trackName: matchingTrack.trackName,
      trackSpeakers: matchingTrack.speakers
    });
  } else {
    log('WARN', 'No track found for speaker', {
      episodeId,
      speaker,
      availableTracks: tracks.map(t => ({
        trackName: t.trackName,
        speakers: t.speakers || []
      }))
    });
  }

  return matchingTrack || null;
};

/**
 * Get tracks for multiple speakers
 * @param {string} episodeId - The episode ID
 * @param {Array<string>} speakers - Array of speaker names
 * @returns {Promise<Object>} Object mapping speakers to their tracks
 */
export const selectTracksForSpeakers = async (episodeId, speakers) => {
  log('DEBUG', 'Starting batch track selection', { episodeId, speakers });

  const tracks = await getTracksForEpisode(episodeId);
  log('INFO', 'Retrieved tracks for batch selection', { episodeId, trackCount: tracks.length, speakerCount: speakers.length });

  const results = {};
  const matchedSpeakers = [];
  const unmatchedSpeakers = [];

  for (const speaker of speakers) {
    const matchingTrack = tracks.find(track => (track.speakers || []).includes(speaker));
    results[speaker] = matchingTrack || null;

    if (matchingTrack) {
      matchedSpeakers.push({ speaker, trackName: matchingTrack.trackName });
    } else {
      unmatchedSpeakers.push(speaker);
    }
  }

  log('INFO', 'Batch track selection completed', {
    episodeId,
    matched: matchedSpeakers.length,
    unmatched: unmatchedSpeakers.length
  });

  if (unmatchedSpeakers.length > 0) {
    log('WARN', 'Some speakers have no matching tracks', {
      episodeId,
      unmatchedSpeakers,
      availableTracks: tracks.map(t => ({
        trackName: t.trackName,
        speakers: t.speakers || []
      }))
    });
  }

  return results;
};

/**
 * Query all tracks for an episode
 * @param {string} episodeId - The episode ID
 * @returns {Promise<Array>} Array of track objects
 */
const getTracksForEpisode = async (episodeId) => {
  const maxTracks = parseInt(process.env.MAX_TRACKS_PER_EPISODE) || 50;

  log('DEBUG', 'Querying tracks for episode', { episodeId, maxTracks });

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: episodeId },
        ':sk': { S: 'track#' }
      },
      Limit: maxTracks
    }));

    const tracks = result.Items ? result.Items.map(item => unmarshall(item)) : [];

    log('DEBUG', 'Track query completed', {
      episodeId,
      tracksFound: tracks.length,
      trackNames: tracks.map(t => t.trackName)
    });

    // Validate track data
    const validTracks = tracks.filter(track => {
      if (!track.trackName) {
        log('WARN', 'Track missing trackName field', { episodeId, track });
        return false;
      }
      return true;
    });

    if (validTracks.length !== tracks.length) {
      log('WARN', 'Some tracks have malformed data', {
        episodeId,
        totalTracks: tracks.length,
        validTracks: validTracks.length
      });
    }

    return validTracks;
  } catch (error) {
    log('ERROR', 'Failed to query tracks for episode', {
      episodeId,
      error: error.message,
      errorCode: error.name
    });
    throw error;
  }
};
