import { z } from 'zod';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import crypto, { randomUUID } from 'crypto';
import { incrementClipsCreated } from '../utils/statistics.mjs';
import { initializeStatusHistory } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();
const MAX_CLIPS_PER_REQUEST = 10;
const MAX_SEGMENTS_PER_CLIP = 10;

const segmentSchema = z.object({
  startTime: z.string()
    .regex(/^\d{2}:\d{2}:\d{2}$/)
    .describe('Start time in hh:mm:ss format (required)'),
  endTime: z.string()
    .regex(/^\d{2}:\d{2}:\d{2}$/)
    .describe('End time in hh:mm:ss format (required)'),
  speaker: z.string().min(1).describe('Speaker name (required)'),
  order: z.number().int().min(1).describe('Order of segment for reassembly (required, starting from 1)'),
  notes: z.string().optional().describe('Optional contextual notes for this segment')
});

export const createClipTool = {
  isMultiTenant: true,
  name: 'createClip',
  description:
    'Creates one or more clip recommendations for a livestream transcript, each composed of one or more segments with required timestamps and speaker information',
  schema: z.object({
    episodeId: z.string().describe('The ID of the episode for which to create clips'),
    clips: z.array(
      z.object({
        segments: z.array(segmentSchema)
          .min(1)
          .max(MAX_SEGMENTS_PER_CLIP)
          .describe('Array of segments that form a clip'),
        hook: z.string().min(5).describe('Short, catchy phrase to grab attention'),
        summary: z.string().min(10).describe('Brief description of what happens in the clip'),
        bRollSuggestions: z.array(z.string()).min(1).describe('List of suggested visuals or overlays'),
        clipType: z.enum(['educational', 'funny', 'demo', 'hot_take', 'insight']).describe('Type of clip')
      })
    ).min(1).max(MAX_CLIPS_PER_REQUEST)
  }),
  handler: async (tenantId, { episodeId, clips }) => {
    try {
      if (!tenantId) {
        console.error('Missing tenantId in tool handler');
        return 'Unauthorized: Missing tenant context';
      }

      const results = await Promise.allSettled(
        clips.map(async (clip) => {
          const id = randomUUID();
          const now = new Date().toISOString();

          const segmentSignature = clip.segments
            .map((s) => `${s.order}-${s.startTime}-${s.endTime}-${s.speaker}`)
            .join('|');

          const clipHash = crypto
            .createHash('sha256')
            .update(`${segmentSignature}|${clip.hook}|${clip.summary}`)
            .digest('hex')
            .slice(0, 16);

          const initialStatus = 'detected';
          const statusHistory = initializeStatusHistory(initialStatus, now);

          await ddb.send(
            new PutItemCommand({
              TableName: process.env.TABLE_NAME,
              ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
              Item: marshall({
                pk: `${tenantId}#${episodeId}`,
                sk: `clip#${id}`,
                GSI1PK: `${tenantId}#clips`,
                GSI1SK: `${now}#${episodeId}#${id}`,
                clipId: id,
                clipHash,
                segments: clip.segments,
                segmentCount: clip.segments.length,
                totalDurationSeconds: calcTotalDuration(clip.segments),
                hook: clip.hook,
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
            console.error('Error updating clip stats:', statsErr);
          }

          return { id, clipHash };
        })
      );

      const created = results.filter((r) => r.status === 'fulfilled' && r.value).length;

      console.log(`Created ${created} clips for episode ${episodeId} (tenant: ${tenantId})`);

      return `${created} clips added for episode ${episodeId}. All clips have been created with tenant isolation.`;
    } catch (err) {
      console.error('Error creating clips:', err);
      return 'Something went wrong while creating clips';
    }
  }
};

/**
 * Compute total duration from segments with required timestamps
 */
function calcTotalDuration(segments) {
  const toSeconds = (t) => {
    const [hh, mm, ss] = t.split(':').map(Number);
    return hh * 3600 + mm * 60 + ss;
  };
  return segments.reduce((acc, seg) => {
    const start = toSeconds(seg.startTime);
    const end = toSeconds(seg.endTime);
    return acc + Math.max(0, end - start);
  }, 0);
}
