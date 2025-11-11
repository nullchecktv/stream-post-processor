import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { webSearchTool } from '../tools/web-search.mjs';
import { convertToBedrockTools } from '../utils/tools.mjs';
import { converse } from '../utils/agents.mjs';

const logger = new Logger({ serviceName: 'agents' });
const ddb = new DynamoDBClient();
const tools = convertToBedrockTools([webSearchTool]);

export const handler = async (event) => {
  let tenantId, episodeId;

  try {
    const detail = event?.detail;
    if (!detail?.episodeId || !detail?.tenantId) {
      logger.error('Invalid event structure', {
        detail
      });
      return { statusCode: 400, body: 'Invalid event structure' };
    }

    tenantId = detail.tenantId;
    episodeId = detail.episodeId;

    logger.info('Starting blog content generation', {
      episodeId,
      tenantId
    });

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
      return { statusCode: 404, body: 'Blog outline not found' };
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

    const episode = episodeResponse.Item ? unmarshall(episodeResponse.Item) : null;

    const transcriptKey = `${tenantId}/${episodeId}/transcript.srt`;
    let transcriptExcerpt = '';
    try {
      const { loadAndPreprocessTranscript } = await import('../utils/transcripts.mjs');
      const fullTranscript = await loadAndPreprocessTranscript(transcriptKey);
      if (fullTranscript) {
        transcriptExcerpt = fullTranscript.substring(0, 15000);
      }
    } catch (err) {
      logger.warn('Could not load transcript', {
        error: err.message,
        transcriptKey
      });
    }

    const brandVoice = await loadBrandVoice(tenantId, episode);

    await updateBlogStatus(tenantId, episodeId, 'content_generating');

    const systemPrompt = buildSystemPrompt(brandVoice);
    const userPrompt = buildUserPrompt(outline, episode, transcriptExcerpt);

    const content = await converse(
      process.env.MODEL_ID,
      systemPrompt,
      userPrompt,
      tools,
      { tenantId }
    );

    const now = new Date().toISOString();
    const wordCount = countWords(content);

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'data#blog#content',
        content,
        status: 'content_generated',
        wordCount,
        generatedAt: now,
        updatedAt: now
      })
    }));

    logger.info('Blog content generated successfully', {
      episodeId,
      tenantId,
      wordCount
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        episodeId,
        status: 'content_generated',
        wordCount
      })
    };
  } catch (err) {
    logger.error('Blog generation failed', {
      error: err.message,
      stack: err.stack,
      episodeId: episodeId || 'unknown',
      tenantId: tenantId || 'unknown'
    });

    if (tenantId && episodeId) {
      try {
        await updateBlogStatus(tenantId, episodeId, 'failed', err.message);
      } catch (error_) {
        logger.error('Failed to update status to failed', {
          error: error_.message
        });
      }
    }

    throw err;
  }
};

const loadBrandVoice = async (tenantId, episode) => {
  let brandVoice = null;

  if (episode?.activeTeamId || tenantId.startsWith('team#')) {
    const teamId = episode?.activeTeamId || tenantId.replace('team#', '');
    try {
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
          brandVoice = team.branding.voice;
          logger.info('Loaded team brand voice', { teamId });
        }
      }
    } catch (err) {
      logger.warn('Could not load team brand voice', {
        error: err.message,
        teamId
      });
    }
  }

  if (!brandVoice && tenantId.startsWith('user#')) {
    const userId = tenantId.replace('user#', '');
    try {
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
          brandVoice = user.branding.voice;
          logger.info('Loaded user brand voice', { userId });
        }
      }
    } catch (err) {
      logger.warn('Could not load user brand voice', {
        error: err.message,
        userId
      });
    }
  }

  return brandVoice;
};

const buildSystemPrompt = (brandVoice) => {
  const tone = brandVoice?.tone || 'professional and engaging';
  const writingStyle = brandVoice?.writingStyle || 'clear and informative with practical examples';

  return `You are BlogForge, an autonomous blog writer for technical content creators.

Your job:
1. Read the provided blog outline and episode context
2. Research relevant topics using web search when needed
3. Write a comprehensive blog post in the specified brand voice
4. Include code examples, practical insights, and actionable takeaways
5. Format content in markdown with proper headings, lists, and code blocks

Brand Voice Guidelines:
- Tone: ${tone}
- Writing Style: ${writingStyle}

Content Requirements:
- Introduction that hooks the reader
- Clear section structure following the outline
- Technical accuracy with practical examples
- Conclusion with key takeaways
- 1500-2500 words total length
- Proper markdown formatting

Use web search to:
- Verify technical details
- Find relevant examples
- Research current best practices
- Gather supporting statistics

Writing Guidelines:
- Write in a conversational yet authoritative voice
- Use concrete examples and code snippets where appropriate
- Break down complex concepts into digestible sections
- Include actionable insights readers can apply immediately
- Maintain consistency with the brand voice throughout
- Use proper markdown syntax for headings (# ## ###), lists, code blocks, and emphasis

Output Format:
Return ONLY the complete blog post content in markdown format. Do not include meta-commentary about the writing process.`;
};

const buildUserPrompt = (outline, episode, transcriptExcerpt) => {
  const episodeContext = [];

  if (episode?.title) {
    episodeContext.push(`Episode Title: ${episode.title}`);
  }

  if (episode?.episodeNumber) {
    episodeContext.push(`Episode Number: ${episode.episodeNumber}`);
  }

  if (episode?.description) {
    episodeContext.push(`Description: ${episode.description}`);
  }

  if (episode?.themes && Array.isArray(episode.themes) && episode.themes.length > 0) {
    episodeContext.push(`Themes: ${episode.themes.join(', ')}`);
  }

  if (episode?.airDate) {
    episodeContext.push(`Air Date: ${episode.airDate}`);
  }

  const contextSection = episodeContext.length > 0
    ? `Episode Context:\n${episodeContext.join('\n')}\n\n`
    : '';

  const transcriptSection = transcriptExcerpt
    ? `Transcript Excerpt (first 15,000 characters):\n${transcriptExcerpt}\n\n`
    : '';

  return `${contextSection}Blog Outline:
${outline}

${transcriptSection}Please write a complete blog post based on this outline. Follow the structure provided and expand each section with detailed content, examples, and insights from the episode.`;
};

const updateBlogStatus = async (tenantId, episodeId, status, errorMessage = null) => {
  const now = new Date().toISOString();
  const updateExpression = errorMessage
    ? 'SET #status = :status, #updatedAt = :updatedAt, #errorMessage = :errorMessage'
    : 'SET #status = :status, #updatedAt = :updatedAt';

  const expressionAttributeValues = {
    ':status': status,
    ':updatedAt': now
  };

  if (errorMessage) {
    expressionAttributeValues[':errorMessage'] = errorMessage;
  }

  await ddb.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: `${tenantId}#${episodeId}`,
      sk: 'data#blog#outline'
    }),
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: {
      '#status': 'status',
      '#updatedAt': 'updatedAt',
      ...(errorMessage && { '#errorMessage': 'errorMessage' })
    },
    ExpressionAttributeValues: marshall(expressionAttributeValues)
  }));
};

const countWords = (text) => {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
};
