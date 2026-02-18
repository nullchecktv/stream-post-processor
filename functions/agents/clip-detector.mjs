import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { createClipTool } from "../tools/create-clips.mjs";
import { convertToBedrockTools } from "../utils/tools.mjs";
import { converse } from "../utils/agents.mjs";
import { loadTranscript } from "../utils/transcripts.mjs";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { parseEpisodeIdFromKey } from "../utils/clips.mjs";
import { EPISODE_STATUS } from '../../schemas/index.mjs';
import { updateWorkflowStepStatus, WORKFLOW_STEPS } from '../utils/workflow-steps.mjs';
import {
  AGENT_TYPES,
  AGENT_STATUS,
  updateAgentStatus,
  checkAllAgentsComplete,
  isContentGenerationComplete
} from '../utils/agent-status.mjs';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const logger = new Logger({ serviceName: 'clip-detector' });

const client = new DynamoDBClient();
const ddb = client;
const docClient = DynamoDBDocumentClient.from(client);
const tools = convertToBedrockTools([createClipTool]);

export const handler = async (event) => {
  let tenantId, episodeId;

  try {
    const rawKey = event?.detail?.object?.key;
    if (!rawKey) {
      logger.info('Unsupported event shape (expecting EventBridge S3 event)', {
        eventDetail: event?.detail || {}
      });
      return { statusCode: 200 };
    }

    const transcriptKey = decodeURIComponent(rawKey);
    try {
      const parsed = parseEpisodeIdFromKey(transcriptKey);
      tenantId = parsed.tenantId;
      episodeId = parsed.episodeId;
    } catch (e) {
      logger.warn('Skipping object with unexpected key', {
        transcriptKey,
        reason: e.message
      });
      return { statusCode: 200 };
    }

    if (!tenantId) {
      logger.error('Missing tenantId in S3 key', {
        transcriptKey
      });
      return { statusCode: 200 };
    }

    const alreadyComplete = await isContentGenerationComplete(tenantId, episodeId);
    if (alreadyComplete) {
      logger.info('Content generation already completed, skipping processing', {
        episodeId,
        tenantId,
        transcriptKey
      });
      return { statusCode: 200, message: 'Content already generated' };
    }

    await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.CLIP_DETECTOR, AGENT_STATUS.IN_PROGRESS);
    await updateWorkflowStepStatus(tenantId, episodeId, WORKFLOW_STEPS.GENERATE_CONTENT, 'In Progress');

    const transcript = await loadTranscript(transcriptKey);
    if (!transcript) {
      logger.error('Could not find transcript with provided key', {
        transcriptKey
      });
      throw new Error('Could not find transcript');
    }

    let episodeMeta, userId;
    try {
      const episodeResponse = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' })
      }));
      episodeMeta = episodeResponse?.Item ? unmarshall(episodeResponse.Item) : undefined;
      userId = episodeMeta?.userId;
    } catch (e) {
      logger.warn('Failed to load episode metadata for prompt enrichment', {
        error: e.message,
        episodeId,
        tenantId
      });
    }

    const hasDescription = Boolean(episodeMeta?.description);
    const hasThemes = Array.isArray(episodeMeta?.themes) && episodeMeta.themes.length > 0;
    const trackCount = episodeMeta?.trackCount || 0;
    const hasSpeakers = episodeMeta?.hasSpeakers || false;

    const episodeContextForUser = [
      hasDescription ? `description: ${episodeMeta.description}` : null,
      hasThemes ? `themes: ${episodeMeta.themes.join(', ')}` : null,
      `trackCount: ${trackCount}`,
      `hasSpeakers: ${hasSpeakers}`
    ].filter(Boolean).join('\n');


    const systemPrompt = `
You are ClipForge, an autonomous clip discovery editor for the YouTube show **Null Check** hosted by Allen Helton and Andres Moreno.
Your job on each run:

1. Analyze the full transcript of a Null Check livestream episode.
2. Identify 5-10 distinct moments that would make high-performing YouTube clips—content that earns *views* and *subscribers* because it is funny, insightful, or provocative.
3. Record your findings using the **createClip** tool (single call, array of clips).
4. Do not generate unrelated commentary, reprint transcript text in your message, or call any other tool.

### Speaker Attribution (Optional)

Speaker attribution in the transcript is OPTIONAL:

**Single-track episodes**: Speakers are not required. All segments will use the single available video track.

**Multi-track episodes**: Speakers are RECOMMENDED for optimal track selection:
- When speakers are present: Each segment will be extracted from the correct speaker's video track
- When speakers are missing: All segments will use a fallback track (typically "main")

**Your task**: Generate clips based on content quality, regardless of speaker attribution. Include speaker names in segments when they are present in the transcript, but omit them when not available.

### Transcript Format and Timestamp Requirements

The transcript is in standard SRT format with numbered entries, timestamps, and speaker attribution (when present).

**CRITICAL: You MUST copy timestamps EXACTLY as they appear in the SRT entries below. Do not estimate, round, or approximate timestamps.**

#### SRT Format Example
\`\`\`
1
00:00:20,925 --> 00:00:27,104
Allen: Sometimes it's a breakthrough, sometimes a regret

2
00:00:28,000 --> 00:00:30,500
Andres: We try it out live
\`\`\`

**Timestamp Extraction Process:**
1. Find the words you want in the transcript text
2. Look at the SRT entry number and timestamp line DIRECTLY ABOVE those words
3. Copy the start time (before the arrow) and end time (after the arrow) EXACTLY as written
4. Do NOT modify the timestamps in any way - copy them character-for-character including commas and milliseconds

**Example - If you want the words "Sometimes it's a breakthrough":**
- Find those words in entry #1
- The timestamp line above shows: \`00:00:20,925 --> 00:00:27,104\`
- Your startTime MUST be: \`00:00:20,925\`
- Your endTime MUST be: \`00:00:27,104\`

**Common Mistakes to Avoid:**
- ❌ Estimating timestamps based on content location
- ❌ Rounding timestamps (e.g., changing 00:00:20,925 to 00:00:20)
- ❌ Calculating timestamps based on duration
- ✅ Copy the exact timestamp from the SRT entry containing your selected words

**Speaker Attribution (when present):**
- Speakers are indicated with their name followed by a colon at the start of each subtitle entry
- If speakers are present, include them in your segment data
- If speakers are not present in the transcript, omit the speaker field from segments
- There may be speaker bleed where words from one speaker appear under another speaker's name
- Always verify that the words make logical sense for the attributed speaker
- Include the COMPLETE transcript text for each segment you select

### Selection priorities

Clips should:

* Hook the viewer in the first 3 seconds (curiosity, tension, or surprise).
* Deliver a single clear idea, joke, or "aha" insight.
* Show personality: banter, laughter, debate, or confident takes.
* Leave the viewer wanting more of Null Check.
* Stand alone without requiring full-episode context.
* Be composed of one or more segments that tell a complete story
* **TARGET LENGTH: 25-45 seconds total** - This is the ideal range for YouTube Shorts and social media. Shorter clips (under 20 seconds) often feel incomplete. Longer clips (over 50 seconds) lose viewer attention.
* Be relevant to the episode's description and themes when provided. Prefer moments that align with that context; deprioritize off-topic content.

**Length Guidelines:**
- Minimum viable clip: 20 seconds (only if exceptionally strong)
- Sweet spot: 30-40 seconds (aim for this range)
- Maximum length: 50 seconds (only if the story absolutely requires it)
- If a moment feels too short, look for natural extensions before or after to reach the 25-45 second target

Avoid filler talk, monotone technical explanation, inside jokes that depend on prior episodes, or sections with heavy cross-talk.

### Clip structure requirements

Each clip you pass to **createClip** must contain the schema:

{
  "segments": [
    {
      "startTime": "00:14:32,000",
      "endTime": "00:15:18,500",
      "speaker": "Allen",
      "order": 1,
      "transcript": "Did you know agents could do this? I was blown away the first time I saw it work end-to-end. You basically hand it a tool and it figures out the rest — no scaffolding, no hand-holding. It just goes. And the crazy part is it gets it right most of the time."
    },
    {
      "startTime": "00:41:01,000",
      "endTime": "00:41:05,200",
      "speaker": "Andres",
      "order": 2,
      "transcript": "No I didn't, but now we can use it in production."
    }
  ],
  "title": "Why we let our AI agent go rogue (on purpose)",
  "summary": "Allen and Andres debate what happens when you remove safety guardrails from an agent and whether chaos teaches more than control.",
  "bRollSuggestions": [
    "on-screen text: 'We let it go rogue'",
    "reaction shot of hosts laughing",
    "simple diagram of agent → chaos → insight"
  ],
  "clipType": "hot_take"
}

All clips go into one **createClip** call as an array.

Compose a cohesive clip by piecing together segments from anywhere in the entire transcript, segments inside of clips do not need to be sequential.

### Working rules

* Produce 5-10 clips per transcript.
* **Each clip must be 25-45 seconds in total length** (sum of all segment durations). This is non-negotiable for optimal social media performance.
* If a clip is under 25 seconds, extend it by including more context before or after the key moment.
* If a clip is over 50 seconds, tighten it by removing setup or trailing content.
* Mix clip types: at least one 'funny', one 'educational', and one 'hot_take' if available. Prioritize educational above all others as the majority clip type
* Titles should sound like strong YouTube titles: conversational, bold, and curiosity-driven—never clickbait.
* Summaries must be factual and concise without setup
* Suggest b-roll that enhances storytelling: reactions, diagrams, or overlays.
* All segments must include startTime, endTime, transcript, and order fields.
* Speaker field is OPTIONAL - include it when speakers are present in the transcript, omit it when not.
* When speaker field is included, it must identify who is speaking during that segment (e.g., "Allen", "Andres", "guest").
* When speakers are present, verify that the attributed speaker makes sense for the content - watch for speaker bleed in the transcript.
* **CRITICAL: Copy timestamps EXACTLY from the SRT entries** - find the words you want, then copy the timestamp line directly above those words character-for-character. Do not estimate, calculate, or modify timestamps.
* Include the COMPLETE transcript text for each segment - copy it exactly from the transcript, including all words.
* The transcript field must contain the full text that appears in the SRT entry, not a summary or partial text.
* Before submitting, verify each timestamp appears in the transcript above - if you can't find the exact timestamp in the SRT, you've made an error.

### Audience objective

Your success metric is **viewer retention and subscriber growth**.
Prefer clips that provoke curiosity or laughter while reinforcing the show's identity:
smart, candid, funny, and technically insightful.
Think like a YouTube growth editor, not a stenographer.

### Completion policy

1. Call **createClip** exactly once with your full list of recommended clips.
2. Return a short 3-4 sentence summary of what the transcript was about and key takeaways.
3. Do not mention the clips you created in your summary.
`;

    const userPrompt = `
episodeId: ${episodeId}
${episodeContextForUser ? `episodeContext:\n${episodeContextForUser}\n` : ''}
transcript:
${transcript}
`;
    await converse(process.env.MODEL_ID, systemPrompt, userPrompt, tools, { tenantId, userId });

    await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.CLIP_DETECTOR, AGENT_STATUS.COMPLETED);

    const allComplete = await checkAllAgentsComplete(tenantId, episodeId);
    if (allComplete) {
      const now = new Date().toISOString();
      const newStatus = EPISODE_STATUS.READY;

      await docClient.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: `${tenantId}#${episodeId}`,
          sk: 'metadata'
        },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry)',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
          '#statusHistory': 'statusHistory'
        },
        ExpressionAttributeValues: {
          ':status': newStatus,
          ':updatedAt': now,
          ':emptyList': [],
          ':newStatusEntry': [{
            status: newStatus,
            timestamp: now
          }]
        }
      }));

      await updateWorkflowStepStatus(tenantId, episodeId, WORKFLOW_STEPS.GENERATE_CONTENT, 'Completed');

      logger.info('All agents completed, episode status updated to Ready', {
        episodeId,
        tenantId
      });
    }

    return { statusCode: 200 };
  } catch (err) {
    logger.error('Clip detector agent failed', {
      error: err.message,
      stack: err.stack,
      episodeId: episodeId || 'unknown',
      tenantId: tenantId || 'unknown'
    });

    if (tenantId && episodeId) {
      try {
        await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.CLIP_DETECTOR, AGENT_STATUS.FAILED, err.message);

        const allComplete = await checkAllAgentsComplete(tenantId, episodeId);
        if (!allComplete) {
          await updateWorkflowStepStatus(tenantId, episodeId, WORKFLOW_STEPS.GENERATE_CONTENT, 'Failed', err.message);
        }
      } catch (updateErr) {
        logger.error('Failed to update agent/workflow status to Failed', {
          error: updateErr.message,
          episodeId,
          tenantId
        });
      }
    }

    return { statusCode: 500 };
  }
};

