import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { converse } from '../utils/agents.mjs';
import { convertToBedrockTools } from '../utils/tools.mjs';
import { setPlanRecommendationsTool } from '../tools/set-plan-recommendations.mjs';
import { addStatusEntry } from '../utils/status-history.mjs';

const logger = new Logger({ serviceName: 'agents' });
const ddb = new DynamoDBClient();
const tools = convertToBedrockTools([setPlanRecommendationsTool]);

export const handler = async (event) => {
  let episodeId, tenantId;

  try {
    const detail = event?.detail;
    if (!detail) {
      logger.info('Unsupported event shape (expecting EventBridge event)', {
        event
      });
      return { statusCode: 200 };
    }

    episodeId = detail.episodeId;
    tenantId = detail.tenantId;
    const plan = detail.plan;

    if (!episodeId || !tenantId || !plan) {
      logger.error('Missing required fields in event detail', {
        episodeId,
        tenantId,
        hasPlan: !!plan
      });
      return { statusCode: 200 };
    }

    const episodeResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      })
    }));

    if (!episodeResult.Item) {
      logger.error('Episode not found', {
        episodeId,
        tenantId
      });
      return { statusCode: 200 };
    }

    const episode = unmarshall(episodeResult.Item);

    logger.info('Processing plan for episode', {
      episodeId,
      tenantId,
      episodeTitle: episode.title
    });

    const systemPrompt = `
You are an AI planning assistant for the YouTube show **Null Check** hosted by Allen Helton and Andres Moreno.

Your job is to analyze episode planning information and generate actionable recommendations to help the hosts create engaging, well-structured content.

## Your Task

Given the episode objectives, key concepts, and optional notes, you will:

1. **Analyze the content** to understand the episode's goals and topics
2. **Generate a suggested episode flow** as a Mermaid sequence diagram showing how the episode should progress
3. **Create a compelling title** that will attract viewers (10-200 characters)
4. **Write a promotional description** for social media and YouTube (50-1000 characters)
5. **Identify key learning moments** that viewers will take away from the episode

## Episode Flow Guidelines

The suggested flow should:
- Start with an engaging introduction that hooks the viewer
- Progress logically through the key concepts
- Include natural transitions between topics
- Allow for discussion and examples
- End with a clear conclusion and call-to-action
- Be represented as a Mermaid sequence diagram with participants (Host, Audience, Guest if applicable)

Example flow structure:
\`\`\`
sequenceDiagram
    participant Host
    participant Audience
    Host->>Audience: Introduction and hook
    Host->>Audience: Concept 1 explanation
    Host->>Audience: Real-world example
    Host->>Audience: Concept 2 explanation
    Host->>Audience: Discussion and Q&A
    Host->>Audience: Key takeaways and conclusion
\`\`\`

## Title Guidelines

Create a title that:
- Captures the essence of the episode
- Uses curiosity-driven language
- Includes relevant keywords for discoverability
- Sounds conversational and engaging
- Avoids clickbait or misleading claims
- Is between 10-200 characters

## Description Guidelines

Write a description that:
- Summarizes what viewers will learn
- Highlights the most interesting aspects
- Uses engaging, conversational language
- Includes relevant keywords naturally
- Creates excitement about the content
- Is between 50-1000 characters

## Key Learning Moments

Identify 3-5 specific takeaways that:
- Represent concrete knowledge or insights
- Are actionable or thought-provoking
- Cover the main concepts from the plan
- Would make viewers feel the episode was valuable

## Tool Usage

Once you've analyzed the plan and generated recommendations, call the **setPlanRecommendations** tool with:
- episodeId: The episode identifier
- suggestedFlow: Your Mermaid sequence diagram
- proposedTitle: Your compelling title
- proposedDescription: Your promotional description
- keyLearningMoments: Array of learning moments

After calling the tool, provide a brief 2-3 sentence summary of your recommendations.
`;

    const episodeContext = [
      episode.title ? `Episode Title: ${episode.title}` : null,
      episode.description ? `Episode Description: ${episode.description}` : null,
      episode.themes && episode.themes.length > 0 ? `Themes: ${episode.themes.join(', ')}` : null,
      episode.seriesName ? `Series: ${episode.seriesName}` : null
    ].filter(Boolean).join('\n');

    const userPrompt = `
episodeId: ${episodeId}

${episodeContext ? `Episode Context:\n${episodeContext}\n` : ''}
Planning Information:

Objectives:
${plan.objectives}

Key Concepts:
${plan.concepts}

${plan.notes ? `Additional Notes:\n${plan.notes}\n` : ''}
Please analyze this planning information and generate recommendations for the episode.
`;

    let response;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        response = await converse(
          process.env.MODEL_ID,
          systemPrompt,
          userPrompt,
          tools,
          { tenantId }
        );

        logger.info('AI planning agent completed', {
          episodeId,
          tenantId,
          responseLength: response.length,
          retryCount
        });

        return { statusCode: 200, message: response };
      } catch (converseErr) {
        retryCount++;

        logger.error('Bedrock invocation failed', {
          error: converseErr.message,
          stack: converseErr.stack,
          episodeId,
          tenantId,
          retryCount,
          willRetry: retryCount <= maxRetries
        });

        if (retryCount > maxRetries) {
          const now = new Date().toISOString();
          const updatedStatusHistory = addStatusEntry(
            episode.statusHistory || [],
            'recommendations_failed',
            now
          );

          await ddb.send(new PutItemCommand({
            TableName: process.env.TABLE_NAME,
            Item: marshall({
              ...episode,
              statusHistory: updatedStatusHistory,
              status: 'recommendations_failed',
              updatedAt: now
            })
          }));

          logger.error('AI planning agent failed after retries', {
            error: converseErr.message,
            episodeId,
            tenantId,
            totalRetries: retryCount - 1
          });

          throw converseErr;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  } catch (err) {
    logger.error('AI planning agent failed', {
      error: err.message,
      stack: err.stack,
      episodeId: episodeId || 'unknown',
      tenantId: tenantId || 'unknown'
    });
    throw err;
  }
};
