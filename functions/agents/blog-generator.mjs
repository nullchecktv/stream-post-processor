import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { converse } from '../utils/agents.mjs';
import { convertToBedrockTools } from '../utils/tools.mjs';
import { webSearchTool } from '../tools/web-search.mjs';
import { BLOG_STATUS } from '../../schemas/index.mjs';
import { publishNotificationEvent } from '../utils/notifications.mjs';
import { updateContentGeneration, getWorkflowState } from '../utils/workflow-state.mjs';
import { CONTENT_GENERATION_STATUS } from '../../schemas/workflow.mjs';

const logger = new Logger({ serviceName: 'agents' });
const ddb = new DynamoDBClient();

const tools = convertToBedrockTools([webSearchTool]);

export const handler = async (event) => {
  let episodeId, tenantId, userId;

  try {
    const detail = event.detail;
    episodeId = detail.episodeId;
    tenantId = detail.tenantId;
    userId = detail.userId;

    if (!episodeId || !tenantId) {
      logger.error('Missing required fields in event', {
        episodeId,
        tenantId
      });
      return { statusCode: 400, message: 'Missing required fields' };
    }

    const outlineResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'data#blog#outline'
      })
    }));

    if (!outlineResponse.Item) {
      logger.error('Blog outline not found', {
        episodeId,
        tenantId
      });
      return { statusCode: 404, message: 'Blog outline not found' };
    }

    const outlineData = unmarshall(outlineResponse.Item);
    const outline = outlineData.outline;

    const episodeResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      })
    }));

    let episodeMetadata = {};

    if (episodeResponse.Item) {
      episodeMetadata = unmarshall(episodeResponse.Item);
    }

    const quotesResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'data#quote#'
      })
    }));

    const quotes = quotesResponse.Items?.map(item => unmarshall(item)) || [];

    const quotesContext = quotes.length > 0
      ? quotes.map(q => `"${q.text}" - ${q.speaker} (${q.timestamp})`).join('\n')
      : 'No quotes available for this episode.';

    const brandVoice = await loadBrandVoiceSettings(tenantId, userId);

    const tone = brandVoice.tone || 'professional and conversational';
    const writingStyle = brandVoice.writingStyle || 'clear and engaging';
    const perspective = brandVoice.perspective || 'first_person';

    const perspectiveInstructions = perspective === 'first_person'
      ? `Write using first-person pronouns: "I", "we", "my", "our". Speak directly as the author/creator. Example: "In my experience, I've found that..."`
      : `Write using third-person pronouns: "they", "the team", "the author". Avoid first-person pronouns. Write from an outside perspective. Example: "The team discovered that..."`;

    const systemPrompt = `
You are BlogForge, an autonomous blog writer for technical content creators.

Your job:
1. Read the provided blog outline and episode context
2. Research relevant topics using web search when needed
3. Write a comprehensive blog post in the specified brand voice
4. Include code examples, practical insights, and actionable takeaways
5. Format content in markdown with proper headings, lists, and code blocks

Brand Voice Guidelines:
- Tone: ${tone}
- Writing Style: ${writingStyle}
- Perspective: ${perspective}

Writing Perspective:
${perspectiveInstructions}

Content Requirements:
- Introduction that hooks the reader
- Clear section structure following the outline
- Technical accuracy with practical examples
- Conclusion with key takeaways
- 1500-2500 words total length
- Proper markdown formatting

IMPORTANT - Content Independence:
- Write the blog post as a standalone article that can be read independently
- DO NOT reference "the video", "this episode", "in the stream", or "watch the full episode"
- DO NOT include phrases like "as mentioned in the video" or "check out the episode"
- The blog should be self-contained and not require watching any video content
- Present information directly without meta-references to the source material

Use web search to:
- Verify technical details
- Find relevant examples
- Research current best practices
- Gather supporting statistics

Write the complete blog post now based on the outline provided.
`;

    const episodeContext = [
      episodeMetadata.title ? `Title: ${episodeMetadata.title}` : null,
      episodeMetadata.description ? `Description: ${episodeMetadata.description}` : null,
      episodeMetadata.themes ? `Themes: ${episodeMetadata.themes.join(', ')}` : null,
      episodeMetadata.airDate ? `Air Date: ${episodeMetadata.airDate}` : null
    ].filter(Boolean).join('\n');

    const userPrompt = `
Episode Context:
${episodeContext}

Key Quotes from Episode:
${quotesContext}

Blog Outline:
${outline}

Write the complete blog post now following the outline and brand voice guidelines. Use the quotes as supporting evidence and to add authenticity to the content.
`;

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'data#blog#outline'
      }),
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: marshall({
        ':status': BLOG_STATUS.PROCESSING,
        ':updatedAt': new Date().toISOString()
      })
    }));

    await updateContentGeneration(tenantId, episodeId, 'blog', CONTENT_GENERATION_STATUS.PROCESSING);

    logger.info('Starting blog content generation', {
      episodeId,
      tenantId,
      perspective,
      tone
    });

    const content = await converse(
      process.env.MODEL_ID,
      systemPrompt,
      userPrompt,
      tools,
      { tenantId, userId }
    );

    const now = new Date().toISOString();
    const wordCount = content.split(/\s+/).length;

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'data#blog#content',
        content,
        status: BLOG_STATUS.CREATED,
        wordCount,
        generatedAt: now,
        updatedAt: now
      })
    }));

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'data#blog#outline'
      }),
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: marshall({
        ':status': BLOG_STATUS.CREATED,
        ':updatedAt': now
      })
    }));

    await updateContentGeneration(tenantId, episodeId, 'blog', CONTENT_GENERATION_STATUS.COMPLETE, {
      itemCount: 1
    });

    logger.info('Blog content generated successfully', {
      episodeId,
      tenantId,
      wordCount
    });

    const episodeTitle = episodeMetadata.title || `Episode ${episodeMetadata.episodeNumber || ''}`;

    const workflowState = await getWorkflowState(tenantId, episodeId);

    await publishNotificationEvent({
      type: 'content_generation_updated',
      tenantId,
      userId,
      title: 'Blog Post Ready',
      message: `Your blog post for ${episodeTitle} has been generated`,
      url: `/episodes/${episodeId}/blog`,
      persist: false,
      topic: 'tenant',
      subscriptionId: `${episodeId}_content_blog`,
      metadata: {
        episodeId,
        contentType: 'blog',
        status: CONTENT_GENERATION_STATUS.COMPLETE,
        itemCount: 1,
        workflowState
      }
    });

    return {
      statusCode: 200,
      message: 'Blog content generated successfully',
      wordCount
    };
  } catch (err) {
    logger.error('Blog generation failed', {
      error: err.message,
      stack: err.stack,
      episodeId,
      tenantId
    });

    if (episodeId && tenantId) {
      try {
        await ddb.send(new UpdateItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: `${tenantId}#${episodeId}`,
            sk: 'data#blog#outline'
          }),
          UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #errorMessage = :errorMessage',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#updatedAt': 'updatedAt',
            '#errorMessage': 'errorMessage'
          },
          ExpressionAttributeValues: marshall({
            ':status': BLOG_STATUS.FAILED,
            ':updatedAt': new Date().toISOString(),
            ':errorMessage': err.message
          })
        }));

        await updateContentGeneration(tenantId, episodeId, 'blog', CONTENT_GENERATION_STATUS.FAILED, {
          errorMessage: err.message
        });

        const workflowState = await getWorkflowState(tenantId, episodeId);

        await publishNotificationEvent({
          type: 'content_generation_updated',
          tenantId,
          userId,
          title: 'Blog Generation Failed',
          message: 'Blog post generation encountered an error',
          url: `/episodes/${episodeId}`,
          persist: false,
          topic: 'tenant',
          subscriptionId: `${episodeId}_content_blog`,
          metadata: {
            episodeId,
            contentType: 'blog',
            status: CONTENT_GENERATION_STATUS.FAILED,
            errorMessage: err.message,
            workflowState
          }
        });
      } catch (updateErr) {
        logger.error('Failed to update error status', {
          error: updateErr.message,
          episodeId,
          tenantId
        });
      }
    }

    throw err;
  }
};

const loadBrandVoiceSettings = async (tenantId, userId) => {
  const defaultVoice = {
    tone: 'professional and conversational',
    writingStyle: 'clear and engaging',
    perspective: 'first_person'
  };

  if (!tenantId || !userId) {
    return defaultVoice;
  }

  try {
    if (tenantId.startsWith('team#')) {
      const teamId = tenantId.replace('team#', '');
      const teamResponse = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `team#${teamId}`,
          sk: 'metadata'
        })
      }));

      if (teamResponse.Item) {
        const team = unmarshall(teamResponse.Item);
        if (team.branding?.voice) {
          return {
            tone: team.branding.voice.tone || defaultVoice.tone,
            writingStyle: team.branding.voice.writingStyle || defaultVoice.writingStyle,
            perspective: team.branding.voice.perspective || defaultVoice.perspective
          };
        }
      }
    }

    const userResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: 'profile'
      })
    }));

    if (userResponse.Item) {
      const user = unmarshall(userResponse.Item);
      if (user.branding?.voice) {
        return {
          tone: user.branding.voice.tone || defaultVoice.tone,
          writingStyle: user.branding.voice.writingStyle || defaultVoice.writingStyle,
          perspective: user.branding.voice.perspective || defaultVoice.perspective
        };
      }
    }
  } catch (err) {
    logger.warn('Failed to load brand voice settings, using defaults', {
      error: err.message,
      tenantId,
      userId
    });
  }

  return defaultVoice;
};
