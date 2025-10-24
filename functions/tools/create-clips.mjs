import { z } from 'zod';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import crypto, { randomUUID } from 'crypto';
import { loadTranscript } from '../utils/transcripts.mjs';
import { incrementClipsCreated } from '../utils/statistics.mjs';

const ddb = new DynamoDBClient();
const MAX_CLIPS_PER_REQUEST = 10;
const MAX_SEGMENTS_PER_CLIP = 10;

const segmentSchema = z.object({
  startTime: z.string()
    .regex(/^\d{2}:\d{2}:\d{2}$/)
    .optional()
    .describe('Start time in hh:mm:ss format (optional if using text reference)'),
  endTime: z.string()
    .regex(/^\d{2}:\d{2}:\d{2}$/)
    .optional()
    .describe('End time in hh:mm:ss format (optional if using text reference)'),
  text: z.string()
    .optional()
    .describe('Exact or approximate text snippet if timestamps are unavailable'),
  speaker: z.string().optional().describe('Optional speaker name'),
  notes: z.string().optional().describe('Optional contextual notes for this segment')
}).refine(
  (seg) => seg.text || (seg.startTime && seg.endTime),
  { message: 'Each segment must include either timestamps or text.' }
);

export const createClipTool = {
  isMultiTenant: true,
  name: 'createClip',
  description:
    'Creates one or more clip recommendations for a livestream transcript, each composed of one or more segments with timestamps, text snippets, or both',
  schema: z.object({
    transcriptId: z.string().describe('The ID of the transcript associated with the livestream episode'),
    clips: z.array(
      z.object({
        segments: z.array(segmentSchema)
          .min(1)
          .max(MAX_SEGMENTS_PER_CLIP)
          .describe('Array of segments that form a clip'),
        hook: z.string().min(5).describe('Short, catchy phrase to grab attention'),
        summary: z.string().min(10).describe('Brief description of what happens in the clip'),
        bRollSuggestions: z.array(z.string()).min(1).describe('List of suggested visuals or overlays'),
        clipType: z.enum(['educational', 'funny', 'demo', 'hot_take', 'insight']).describe('Type of clip'),
        confidence: z.number().min(0).max(1).optional().describe('Optional confidence score assigned by the model')
      })
    ).min(1).max(MAX_CLIPS_PER_REQUEST)
  }),
  handler: async (tenantId, { transcriptId, clips }) => {
    try {
      let transcript;
      try {
        transcript = await loadTranscript(tenantId, transcriptId);
      } catch (err) {
        console.error(`Transcript not found for ${transcriptId}:`, err);
        return `Transcript not found: ${transcriptId}`;
      }

      const results = await Promise.allSettled(
        clips.map(async (clip) => {
          const id = randomUUID();

          const segmentSignature = clip.segments
            .map((s) =>
              s.startTime && s.endTime
                ? `${s.startTime}-${s.endTime}`
                : crypto.createHash('md5').update(s.text || '').digest('hex').slice(0, 6)
            )
            .join('|');

          const clipHash = crypto
            .createHash('sha256')
            .update(`${segmentSignature}|${clip.hook}|${clip.summary}`)
            .digest('hex')
            .slice(0, 16);

          await ddb.send(
            new PutItemCommand({
              TableName: process.env.TABLE_NAME,
              ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
              Item: marshall({
                pk: `${tenantId}#${transcriptId}`,
                sk: `clip#${id}`,
                clipId: id,
                clipHash,
                transcriptVersion: transcript.version || 1,
                segments: clip.segments,
                segmentCount: clip.segments.length,
                totalDurationSeconds: calcTotalDuration(clip.segments),
                hook: clip.hook,
                summary: clip.summary,
                bRollSuggestions: clip.bRollSuggestions,
                clipType: clip.clipType,
                confidence: clip.confidence ?? null,
                status: 'pending_review',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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
      console.log(`Created ${created} clips for transcript ${transcriptId}`);
      return `${created} clips added for transcript ${transcriptId}.`;
    } catch (err) {
      console.error('Error creating clips:', err);
      return 'Something went wrong while creating clips';
    }
  }
};

/**
 * Compute total duration only when times are available
 */
function calcTotalDuration(segments) {
  const toSeconds = (t) => {
    const [hh, mm, ss] = t.split(':').map(Number);
    return hh * 3600 + mm * 60 + ss;
  };
  return segments.reduce((acc, seg) => {
    if (!seg.startTime || !seg.endTime) return acc;
    const start = toSeconds(seg.startTime);
    const end = toSeconds(seg.endTime);
    return acc + Math.max(0, end - start);
  }, 0);
}
