import { Logger } from '@aws-lambda-powertools/logger';
import { z } from 'zod';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import crypto, { randomUUID } from 'crypto';
import { incrementClipsCreated } from '../utils/statistics.mjs';
import { initializeStatusHistory } from '../utils/status-history.mjs';
import { CLIP_STATUS } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'tools' });

const ddb = new DynamoDBClient();
const MAX_CLIPS_PER_REQUEST = 10;
const MAX_SEGMENTS_PER_CLIP = 10;

const segmentSchema = z.object({
  startTime: z.string()
    .regex(/^\d{2}:\d{2}:\d{2}(,\d{3})?$/)
    .describe('Start time in hh:mm:ss or hh:mm:ss,mmm format (required)'),
  endTime: z.string()
    .regex(/^\d{2}:\d{2}:\d{2}(,\d{3})?$/)
    .describe('End time in hh:mm:ss or hh:mm:ss,mmm format (required)'),
  speaker: z.string().min(1).describe('Speaker name (required)'),
  order: z.number().int().min(1).describe('Order of segment for reassembly (required, starting from 1)'),
  transcript: z.string().min(1).describe('Transcript text for this segment (required)'),
  notes: z.string().optional().describe('Optional contextual notes for this segment')
});

export const createClipTool = {
  isMultiTenant: true,
  name: 'createClip',
  description:
    'Creates one or more clip recommendations for a livestream transcript, each composed of one or more segments with required timestamps, speaker information, and transcript text. Speaker names can be any value and will be used as provided.',
  schema: z.object({
    episodeId: z.string().describe('The ID of the episode for which to create clips'),
    clips: z.array(
      z.object({
        segments: z.array(segmentSchema)
          .min(1)
          .max(MAX_SEGMENTS_PER_CLIP)
          .describe('Array of segments that form a clip'),
        title: z.string().min(5).describe('Short, catchy title to grab attention'),
        summary: z.string().min(10).describe('Brief description of what happens in the clip'),
        bRollSuggestions: z.array(z.string()).min(1).describe('List of suggested visuals or overlays'),
        clipType: z.enum(['educational', 'funny', 'demo', 'hot_take', 'insight']).describe('Type of clip')
      })
    ).min(1).max(MAX_CLIPS_PER_REQUEST)
  }),
  handler: async (context, { episodeId, clips }) => {
    const { tenantId } = context;

    if (!tenantId) {
      logger.error('Missing tenantId in tool handler', {
        episodeId
      });
      return 'Unauthorized: Missing tenant context';
    }

    try {
      const results = await Promise.allSettled(
        clips.map(async (clip, index) => {
          const id = randomUUID();
          const now = new Date().toISOString();

          const segmentSignature = clip.segments
            .map((s) => `${s.order}-${s.startTime}-${s.endTime}-${s.speaker}-${s.transcript}`)
            .join('|');

          const clipHash = crypto
            .createHash('sha256')
            .update(`${segmentSignature}|${clip.title}|${clip.summary}`)
            .digest('hex')
            .slice(0, 16);

          const initialStatus = CLIP_STATUS.PROPOSED;
          const statusHistory = initializeStatusHistory(initialStatus, now);

          await ddb.send(
            new PutItemCommand({
              TableName: process.env.TABLE_NAME,
              ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
              Item: marshall({
                pk: `${tenantId}#${episodeId}`,
                sk: `data#clip#${id}`,
                GSI1PK: `${tenantId}#clips`,
                GSI1SK: `${now}#${episodeId}#${id}`,
                clipId: id,
                clipHash,
                segments: clip.segments,
                segmentCount: clip.segments.length,
                totalDurationSeconds: calcTotalDuration(clip.segments),
                title: clip.title,
                summary: clip.summary,
                bRollSuggestions: clip.bRollSuggestions,
                clipType: clip.clipType,
                status: initialStatus,
                statusHistory,
                createdAt: now,
                updatedAt: now,
                ttl: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60)
              })
            })
          );

          try {
            await incrementClipsCreated(tenantId, clip.clipType);
          } catch (statsErr) {
            logger.error('Error updating clip stats', {
              error: statsErr.message,
              tenantId,
              clipType: clip.clipType,
              clipId: id
            });
          }

          return { id, clipHash };
        })
      );

      const created = results.filter((r) => r.status === 'fulfilled' && r.value).length;
      const failed = results.filter((r) => r.status === 'rejected');

      if (failed.length > 0) {
        failed.forEach((result, index) => {
          logger.error('Failed to create clip', {
            clipIndex: index,
            error: result.reason?.message || result.reason,
            stack: result.reason?.stack,
            episodeId,
            tenantId
          });
        });
      }

      logger.info('Created clips for episode', {
        created,
        episodeId,
        tenantId,
        totalRequested: clips.length
      });

      return `${created} clips added for episode ${episodeId}. All clips have been created with tenant isolation.`;
    } catch (err) {
      logger.error('Error creating clips', {
        error: err.message,
        stack: err.stack,
        episodeId,
        tenantId,
        clipCount: clips?.length || 0
      });

      return 'Something went wrong while creating clips';
    }
  }
};

/**
 * Convert time string to seconds (handles both hh:mm:ss and hh:mm:ss,mmm formats)
 */
function timeToSeconds(timeStr) {
  const [time, ms] = timeStr.split(',');
  const [hh, mm, ss] = time.split(':').map(Number);
  const milliseconds = ms ? parseInt(ms) / 1000 : 0;
  return hh * 3600 + mm * 60 + ss + milliseconds;
}

/**
 * Compute total duration from segments with required timestamps
 * Returns duration rounded to nearest second
 */
function calcTotalDuration(segments) {
  const totalSeconds = segments.reduce((acc, seg) => {
    const start = timeToSeconds(seg.startTime);
    const end = timeToSeconds(seg.endTime);
    return acc + Math.max(0, end - start);
  }, 0);
  return Math.round(totalSeconds);
}
