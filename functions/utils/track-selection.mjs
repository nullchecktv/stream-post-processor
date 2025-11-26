import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { TRACK_STATUS } from '../../schemas/tracks.mjs';

const logger = new Logger({ serviceName: 'utils' });
const ddb = new DynamoDBClient();
const bedrock = new BedrockRuntimeClient();

const speakerMatchCache = new Map();


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
    return null;
  }

  const matchingTrack = tracks.find(track => {
    const speakers = track.speakers;
    if (!Array.isArray(speakers)) {
      return false;
    }

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

  for (const speaker of speakers) {
    if (!speaker || typeof speaker !== 'string') {
      results[speaker] = null;
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
  }

  return results;
};

/**
 * Get all processed tracks for an episode
 * @param {string} episodeId - The episode ID
 * @param {string} tenantId - The tenant ID for data isolation
 * @returns {Promise<Array>} Array of track objects with trackName, speakers, and status
 */
export const getEpisodeTracks = async (episodeId, tenantId) => {
  const maxTracks = parseInt(process.env.MAX_TRACKS_PER_EPISODE) || 50;

  try {
    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `${tenantId}#${episodeId}` },
        ':sk': { S: 'data#track#' }
      },
      Limit: maxTracks
    }));

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    const tracks = result.Items.map(item => unmarshall(item));

    const processedTracks = tracks
      .filter(track => track.status === TRACK_STATUS.PROCESSED)
      .map(track => ({
        trackName: track.trackName,
        speakers: Array.isArray(track.speakers) ? track.speakers : [],
        status: track.status
      }));

    return processedTracks;
  } catch (error) {
    logger.error('Failed to query tracks for episode', {
      error: error.message,
      stack: error.stack,
      episodeId,
      tenantId
    });
    return [];
  }
};

/**
 * Generate cache key for speaker matching
 * @param {string} episodeId - Episode ID
 * @param {string} speakerName - Speaker name
 * @returns {string} Cache key
 */
const generateCacheKey = (episodeId, speakerName) => {
  const normalizedSpeaker = speakerName.toLowerCase().trim();
  return `${episodeId}::${normalizedSpeaker}`;
};

/**
 * Clear the speaker match cache
 * Useful when processing a new episode or when tracks change
 */
export const clearSpeakerMatchCache = () => {
  speakerMatchCache.clear();
};

/**
 * Use LLM to match a speaker name to available tracks
 * @param {string} episodeId - Episode ID for cache scoping
 * @param {string} speakerName - Speaker name from segment
 * @param {Array} trackSpeakers - Available tracks with speakers [{trackName, speaker}]
 * @returns {Promise<Object>} Match result with matched, trackName, matchedSpeaker, confidence, reasoning
 */
export const matchSpeakerToTrack = async (episodeId, speakerName, trackSpeakers) => {
  const cacheKey = generateCacheKey(episodeId, speakerName);

  if (speakerMatchCache.has(cacheKey)) {
    return speakerMatchCache.get(cacheKey);
  }

  const systemPrompt = `You are a speaker matching assistant. Match a speaker name to the best available track.

Rules:
- Match even with spelling variations, nicknames, or abbreviations
- Consider "Bob" matches "Robert", "Dr. Smith" matches "John Smith", etc.
- Return the track name and confidence score
- Confidence: 1.0 = exact, 0.9 = very likely, 0.7 = probable, 0.5 = possible
- If no good match exists, return matched: false

Respond with JSON only:
{
  "matched": true,
  "trackName": "guest",
  "matchedSpeaker": "Robert Smith",
  "confidence": 0.9,
  "reasoning": "Bob is a common nickname for Robert"
}`;

  const userPrompt = `Speaker to match: "${speakerName}"

Available tracks:
${trackSpeakers.map(t => `- Track "${t.trackName}": ${t.speaker}`).join('\n')}

Find the best match. Return only valid JSON.`;

  try {
    const response = await bedrock.send(new ConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{
        role: 'user',
        content: [{ text: userPrompt }]
      }],
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        temperature: 0.1,
        maxTokens: 500
      }
    }));

    let responseText = response.output.message.content[0].text;

    const jsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      responseText = jsonMatch[1].trim();
    }

    const result = JSON.parse(responseText);

    const matchResult = {
      matched: result.matched || false,
      trackName: result.trackName || null,
      matchedSpeaker: result.matchedSpeaker || null,
      confidence: result.confidence || 0.0,
      reasoning: result.reasoning || ''
    };

    speakerMatchCache.set(cacheKey, matchResult);
    return matchResult;
  } catch (error) {
    logger.error('LLM speaker matching failed', {
      error: error.message,
      stack: error.stack,
      speakerName,
      trackCount: trackSpeakers.length
    });

    return {
      matched: false,
      trackName: null,
      matchedSpeaker: null,
      confidence: 0.0,
      reasoning: `Error: ${error.message}`
    };
  }
};

/**
 * Select the best track for a segment with intelligent matching
 * @param {string} episodeId - Episode ID
 * @param {Object} segment - Segment with speaker information
 * @param {string} tenantId - Tenant ID
 * @param {Object} options - Selection options
 * @param {boolean} options.enableLLMMatching - Enable LLM fuzzy matching (default: true)
 * @param {string} options.fallbackTrack - Fallback track name (default: 'main')
 * @param {number} options.confidenceThreshold - Minimum confidence for fuzzy match (default: 0.7)
 * @returns {Promise<Object>} Track selection result with trackName, matchType, confidence, etc.
 */
export const selectTrackForSegment = async (
  episodeId,
  segment,
  tenantId,
  options = {}
) => {
  const {
    enableLLMMatching = true,
    fallbackTrack = 'main',
    confidenceThreshold = 0.7
  } = options;

  if (!segment.speaker) {
    return {
      trackName: fallbackTrack,
      matchType: 'fallback',
      reason: 'no_speaker_specified',
      confidence: 1.0
    };
  }

  const tracks = await getEpisodeTracks(episodeId, tenantId);

  if (!tracks || tracks.length === 0) {
    logger.warn('No tracks available for episode, using fallback', {
      episodeId,
      tenantId,
      fallbackTrack
    });
    return {
      trackName: fallbackTrack,
      matchType: 'fallback',
      reason: 'no_tracks_available',
      confidence: 1.0
    };
  }

  const exactMatch = tracks.find(track =>
    Array.isArray(track.speakers) &&
    track.speakers.some(speaker =>
      speaker && speaker.toLowerCase() === segment.speaker.toLowerCase()
    )
  );

  if (exactMatch) {
    const matchedSpeaker = exactMatch.speakers.find(speaker =>
      speaker && speaker.toLowerCase() === segment.speaker.toLowerCase()
    );
    return {
      trackName: exactMatch.trackName,
      matchType: 'exact',
      originalSpeaker: segment.speaker,
      matchedSpeaker: matchedSpeaker,
      confidence: 1.0
    };
  }

  if (enableLLMMatching) {
    try {
      const trackSpeakers = tracks
        .filter(t => Array.isArray(t.speakers) && t.speakers.length > 0)
        .flatMap(t => t.speakers.map(speaker => ({ trackName: t.trackName, speaker })));

      if (trackSpeakers.length > 0) {
        const matchResult = await matchSpeakerToTrack(
          episodeId,
          segment.speaker,
          trackSpeakers
        );

        if (matchResult.matched && matchResult.confidence >= confidenceThreshold) {
          return {
            trackName: matchResult.trackName,
            matchType: 'fuzzy',
            originalSpeaker: segment.speaker,
            matchedSpeaker: matchResult.matchedSpeaker,
            confidence: matchResult.confidence,
            reasoning: matchResult.reasoning
          };
        }
      }
    } catch (error) {
      logger.error('LLM matching failed', {
        error: error.message,
        stack: error.stack,
        speaker: segment.speaker,
        episodeId
      });
    }
  }

  return {
    trackName: fallbackTrack,
    matchType: 'fallback',
    reason: 'no_match_found',
    originalSpeaker: segment.speaker,
    confidence: 0.0
  };
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
        ':sk': { S: 'data#track#' }
      },
      Limit: maxTracks
    }));

    const tracks = result.Items ? result.Items.map(item => unmarshall(item)) : [];
    return tracks.filter(track => track.trackName);
  } catch (error) {
    logger.error('Failed to query tracks for episode', {
      error: error.message,
      stack: error.stack,
      episodeId,
      tenantId
    });
    throw error;
  }
};
