import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { getCurrentClipStatus } from '../utils/clips.mjs';
import { parseSrtFile, timeToSeconds, detectSpeaker } from '../utils/transcripts.mjs';

const logger = new Logger({ serviceName: 'clips' });
const ddb = new DynamoDBClient();
const s3 = new S3Client();

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
    let srtEntries = [];
    try {
      const transcriptKey = `${tenantId}/${episodeId}/transcript.srt`;
      const s3Response = await s3.send(new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: transcriptKey
      }));
      const srtContent = await s3Response.Body.transformToString();
      srtEntries = parseSrtFile(srtContent);
    } catch (err) {
      logger.warn('Could not load SRT for transcript extraction, falling back to stored text', {
        error: err.message,
        episodeId,
        tenantId
      });
    }

    const transcript = segments
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(segment => {
        if (srtEntries.length > 0) {
          const segStart = timeToSeconds(segment.startTime);
          const segEnd = timeToSeconds(segment.endTime);

          const relevantEntries = srtEntries.filter(entry => {
            const entryStart = timeToSeconds(entry.startTime);
            const entryEnd = timeToSeconds(entry.endTime);
            return entryStart < segEnd && entryEnd > segStart;
          });

          if (relevantEntries.length > 0) {
            // Strip the inline "Speaker: " prefix from each SRT entry, then
            // group consecutive entries by speaker into clean labelled blocks.
            const blocks = [];
            let currentSpeaker = null;
            let currentLines = [];

            for (const entry of relevantEntries) {
              const { speaker, dialogue } = detectSpeaker(entry.text);
              const entrySpeaker = speaker || currentSpeaker;

              if (entrySpeaker !== currentSpeaker && currentLines.length > 0) {
                const label = currentSpeaker ? `[${currentSpeaker}]: ` : '';
                blocks.push(`${label}${currentLines.join(' ')}`);
                currentLines = [];
              }

              currentSpeaker = entrySpeaker;
              if (dialogue.trim()) currentLines.push(dialogue);
            }

            if (currentLines.length > 0) {
              const label = currentSpeaker ? `[${currentSpeaker}]: ` : '';
              blocks.push(`${label}${currentLines.join(' ')}`);
            }

            return blocks.join('\n\n');
          }
        }

        // Fallback: use what the AI stored
        const speakerLabel = segment.speaker ? `[${segment.speaker}]: ` : '';
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
