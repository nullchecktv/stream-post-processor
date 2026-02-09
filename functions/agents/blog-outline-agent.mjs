import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { buildBlogOutlineTool } from "../tools/build-blog-outline.mjs";
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

const logger = new Logger({ serviceName: 'blog-outline-agent' });

const client = new DynamoDBClient();
const ddb = client;
const docClient = DynamoDBDocumentClient.from(client);
const tools = convertToBedrockTools([buildBlogOutlineTool]);

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

    await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.BLOG_OUTLINE, AGENT_STATUS.IN_PROGRESS);
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
    const hasTitle = Boolean(episodeMeta?.title);
    const episodeContextForUser = [
      hasTitle ? `title: ${episodeMeta.title}` : null,
      hasDescription ? `description: ${episodeMeta.description}` : null,
      hasThemes ? `themes: ${episodeMeta.themes.join(', ')}` : null,
    ].filter(Boolean).join('\n');


    const systemPrompt = `
You are BlogForge, an autonomous blog outline specialist for the YouTube show **Null Check** hosted by Allen Helton and Andres Moreno.
Your job on each run:

1. Analyze the full transcript of a Null Check livestream episode.
2. Create a structured blog post outline using the **buildBlogOutline** tool based on the episode content.
3. Do not generate unrelated commentary, reprint transcript text in your message, or call any other tool.

### Blog Outline Generation

**Critical: This is NOT a summary or recap of the episode.** The blog post should take 1-2 key ideas from the episode and expand on them with depth and new perspective. Think of it as using the episode as a jumping-off point to explore a concept more thoroughly.

The outline should:

* Pick 1-2 core insights or takeaways from the episode that deserve deeper exploration
* Structure the post to expand on these ideas, not just recap what was said
* Include sections that go beyond the episode: implications, related concepts, practical applications, contrarian viewpoints
* Use episode quotes and moments as supporting evidence, not as the main content
formatted in markdown with natural section headings (not "Introduction", "Conclusion", etc.)
* Be 200-400 words in outline form
* Feel like new content that adds value beyond just listening to the episode

**What this means in practice:**
- If the episode discussed a technical pattern, the blog explores when to use it, when not to, and what alternatives exist
- If the episode had a debate, the blog examines the underlying principles and broader context
- If the episode shared an experience, the blog extracts the lesson and applies it to different scenarios

### Example Outline Structure

\`\`\`markdown
# [Title that promises insight, not recap]

## [Natural section heading about the core idea]
- The key insight from the episode
- Why this matters more than people realize
- A deeper angle not fully explored in the episode

## [Section expanding on implications]
- What this means for [specific audience/use case]
- Related concepts or patterns
- Common misconceptions

## [Section with practical application]
- How to apply this in real scenarios
- What to watch out for
- When this approach breaks down

## [Additional sections as needed]

## Conclusion
- Summary of main takeaways
- Call to action or next steps
- Link back to the episode
\`\`\`

### Working Rules

* Create one comprehensive outline per transcript.
* Focus on 1-2 core ideas that deserve deeper exploration.
* The outline should provide value beyond just summarizing the episode.
* Use natural, engaging section headings.
* Include bullet points for key talking points in each section.
* Reference specific moments or quotes from the episode as supporting evidence.
* Consider the target audience: developers and tech professionals.

### Audience Objective

Your success metric is **reader engagement and value delivery**.
The blog should make readers think, learn something new, or see a familiar concept from a fresh angle.
Think like a technical content strategist, not a stenographer.

### Completion Policy

1. Call **buildBlogOutline** exactly once with your complete markdown outline.
2. Return a short 2-3 sentence summary of the core idea you chose to explore and why.
3. Do not mention the specific outline structure in your summary.
`;

    const userPrompt = `
episodeId: ${episodeId}
${episodeContextForUser ? `episodeContext:\n${episodeContextForUser}\n` : ''}
transcript:
${transcript}
`;
    const response = await converse(process.env.MODEL_ID, systemPrompt, userPrompt, tools, { tenantId, userId });

    await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.BLOG_OUTLINE, AGENT_STATUS.COMPLETED);

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
    logger.error('Blog outline agent failed', {
      error: err.message,
      stack: err.stack,
      episodeId: episodeId || 'unknown',
      tenantId: tenantId || 'unknown'
    });

    if (tenantId && episodeId) {
      try {
        await updateAgentStatus(tenantId, episodeId, AGENT_TYPES.BLOG_OUTLINE, AGENT_STATUS.FAILED, err.message);

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

