import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { createQuoteTool } from "../tools/create-quotes.mjs";
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

const logger = new Logger({ serviceName: 'quote-detector' });

const client = new DynamoDBClient();
const ddb = client;
const docClient = DynamoDBDocumentClient.from(client);
const tools = convertToBedrockTools([createQuoteTool]);

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

    await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.QUOTE_DETECTOR, AGENT_STATUS.IN_PROGRESS);
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
    const episodeContextForUser = [
      hasDescription ? `description: ${episodeMeta.description}` : null,
      hasThemes ? `themes: ${episodeMeta.themes.join(', ')}` : null,
    ].filter(Boolean).join('\n');


    const systemPrompt = `
You are QuoteForge, an autonomous quote discovery specialist for the YouTube show **Null Check** hosted by Allen Helton andreno.
Your job on each run:

1. Analyze the full transcript of a Null Check livestream episode.
2. Identify 3-7 memorable, shareable quotes that would work well as standalone social media graphics.
3. Record your findings using the **createQuote** tool (single call, array of quotes).
4. Do not generate unrelated commentary, reprint transcript text in your message, or call any other tool.

### Transcript Format and Timestamp Requirements

The transcript is in standard SRT format with numbered entries, timestamps, and speaker attribution.

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
3. Copy the start time (before the arrow) EXACTLY as written (use hh:mm:ss format, dropping milliseconds)
4. Do NOT modify the timestamps in any way

**Speaker Attribution:**
- Speakers are indicated with their name followed by a colon at the start of each subtitle entry
- There may be speaker bleed where words from one speaker appear under another speaker's name
- Always verify that the words make logical sense for the attributed speaker

### Quote Selection Criteria

Quotes should:

* Be memorable and shareable—something viewers would want to post or discuss.
* Provide standalone value without requiring full episode context.
* Align with episode themes and description when provided—prioritize quotes that reinforce the episode's core topics.
* Be concise and impactful (5-280 characters).
* Represent the show's personality: smart, candid, insightful, or funny.
* Come from clear, unambiguous moments in the transcript (avoid speaker bleed or fragmented thoughts).
* Remove filler words from the text.
* Be one or two sentences long.

Avoid:

* Quotes that require additional context to understand.
* Inside jokes or references that only regular viewers would get.
* Technical jargon without explanation.
* Incomplete thoughts or sentence fragments.
* Quotes with heavy cross-talk or unclear attribution.

### Quote Structure Requirements

Each quote you pass to **createQuote** must contain:

{
  "title": "Brief descriptive name for the quote (10-40 characters)",
  "text": "The actual quote text (5-280 characters)",
  "speaker": "Allen",
  "timestamp": "00:14:32",
  "relevanceScore": 85,
  "context": "Optional: Brief context if needed for internal reference",
  "showSpeaker": true,
  "showEpisodeTitle": true
}

**Relevance scoring (0-100):**
* 90-100: Perfectly captures episode theme, highly shareable, strong standalone value
* 75-89: Strong alignment with themes, good standalone value
* 60-74: Relevant but may need minor context
* Below 60: Do not include—insufficient standalone value or relevance

All quotes go into one **createQuote** call as an array.

### Working Rules

* Produce 3-7 quotes per transcript.
* Mix quote types: aim for a variety of insightful, funny, and thought-provoking quotes.
* Titles should be descriptive and help identify the quote's theme.
* Verify that the attributed speaker makes sense for the content.
* **CRITICAL: Copy timestamps EXACTLY from the SRT entries** - find the words you want, then copy the timestamp line directly above those words.
* Before submitting, verify each timestamp appears in the transcript above.

### Audience Objective

Your success metric is **social media engagement and shareability**.
Prefer quotes that provoke curiosity, inspire thought, or make people laugh while reinforcing the show's identity:
smart, candid, funny, and technically insightful.
Think like a social media content strategist, not a stenographer.

### Completion Policy

1. Call **createQuote** exactly once with your full list of memorable quotes.
2. Return a short 2-3 sentence summary of the key themes you identified for quote selection.
3. Do not mention the specific quotes you created in your summary.
`;

    const userPrompt = `
episodeId: ${episodeId}
${episodeContextForUser ? `episodeContext:\n${episodeContextForUser}\n` : ''}
transcript:
${transcript}
`;
    const response = await converse(process.env.MODEL_ID, systemPrompt, userPrompt, tools, { tenantId, userId });

    await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.QUOTE_DETECTOR, AGENT_STATUS.COMPLETED);

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

    return { message: response };
  } catch (err) {
    logger.error('Quote detector agent failed', {
      error: err.message,
      stack: err.stack,
      episodeId: episodeId || 'unknown',
      tenantId: tenantId || 'unknown'
    });

    if (tenantId && episodeId) {
      try {
        await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.QUOTE_DETECTOR, AGENT_STATUS.FAILED, err.message);

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

    throw err;
  }
};


