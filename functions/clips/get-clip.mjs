import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { getCurrentClipStatus } from '../utils/clips.mjs';
import { loadTranscript, parseSrtFile, timeToSeconds } from '../utils/transcripts.mjs';

const logger = new Logger({ serviceName: 'clips' });
const ddb = new DynamoDBClient();

// Cache for parsed and indexed SRT entries
const srtIndexCache = new Map();

/**
 * Build a time-based index for efficient SRT entry lookup.
 * Groups entries by time buckets (10-second intervals) for faster searching.
 * @param {Array} entries - Parsed SRT entries
 * @returns {Object} Index structure with buckets and entries
 */
const buildSrtIndex = (entries) => {
  const BUCKET_SIZE = 10; // seconds
  const buckets = new Map();
  
  for (const entry of entries) {
    const startSec = timeToSeconds(entry.startTime);
    const endSec = timeToSeconds(entry.endTime);
    
    // Add entry to all relevant buckets it overlaps
    const startBucket = Math.floor(startSec / BUCKET_SIZE);
    const endBucket = Math.floor(endSec / BUCKET_SIZE);
    
    for (let bucket = startBucket; bucket <= endBucket; bucket++) {
      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }
      buckets.get(bucket).push(entry);
    }
  }
  
  return { buckets, BUCKET_SIZE };
};

/**
 * Find SRT entries that overlap with a given time range using the index.
 * @param {Object} index - The time-based index
 * @param {number} segStart - Segment start time in seconds
 * @param {number} segEnd - Segment end time in seconds
 * @returns {Array} Matching SRT entries
 */
const findRelevantEntries = (index, segStart, segEnd) => {
  const { buckets, BUCKET_SIZE } = index;
  const startBucket = Math.floor(segStart / BUCKET_SIZE);
  const endBucket = Math.floor(segEnd / BUCKET_SIZE);
  
  const candidates = new Set();
  
  // Collect candidates from relevant buckets
  for (let bucket = startBucket; bucket <= endBucket; bucket++) {
    const entries = buckets.get(bucket);
    if (entries) {
      entries.forEach(entry => candidates.add(entry));
    }
  }
  
  // Filter candidates to only those that actually overlap
  return Array.from(candidates).filter(entry => {
    const entryStart = timeToSeconds(entry.startTime);
    const entryEnd = timeToSeconds(entry.endTime);
    return entryStart < segEnd && entryEnd > segStart;
  });
};

/**
 * Load and index SRT entries with caching.
 * @param {string} transcriptKey - S3 key for the transcript
 * @returns {Object|null} Indexed SRT data or null if unavailable
 */
const loadAndIndexSrt = async (transcriptKey) => {
  // Check cache first
  const cached = srtIndexCache.get(transcriptKey);
  if (cached) {
    return cached;
  }
  
  try {
    const srtContent = await loadTranscript(transcriptKey);
    if (!srtContent) {
      return null;
    }
    
    const entries = parseSrtFile(srtContent);
    if (entries.length === 0) {
      return null;
    }
    
    const index = buildSrtIndex(entries);
    const indexedData = { entries, index };
    
    // Cache the indexed data
    srtIndexCache.set(transcriptKey, indexedData);
    
    return indexedData;
  } catch (err) {
    logger.warn('Could not load SRT for transcript extraction', {
      error: err.message,
      transcriptKey
    });
    return null;
  }
};

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

    // Attempt to extract accurate transcript text from the source SRT by matching
    // each segment's time range. Falls back to the AI-stored text if the SRT is
    // unavailable or yields no matching entries.
    const transcriptKey = `${tenantId}/${episodeId}/transcript.srt`;
    const srtData = await loadAndIndexSrt(transcriptKey);

    const transcript = segments
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(segment => {
        const speakerLabel = segment.speaker ? `[${segment.speaker}]: ` : '';

        if (srtData) {
          const segStart = timeToSeconds(segment.startTime);
          const segEnd = timeToSeconds(segment.endTime);

          const relevantEntries = findRelevantEntries(srtData.index, segStart, segEnd);

          if (relevantEntries.length > 0) {
            // Use the full SRT text
            const text = relevantEntries.map(e => e.text).join(' ');
            return `${speakerLabel}${text}`;
          }
        }

        // Fallback: use what the AI stored
        const text = segment.transcript || '';
        return `${speakerLabel}${text}`;
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
