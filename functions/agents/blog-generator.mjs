import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { webSearchTool } from '../tools/web-search.mjs';
import { convertToBedrockTools } from '../utils/tools.mjs';
import { converse } from '../utils/agents.mjs';

const logger = new Logger({ serviceName: 'agents' });
const ddb = new DynamoDBClient();
const tools = convertToBedrockTools([webSearchTool]);

export const handler = async (event) => {
  let tenantId, episodeId, userId;

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
    userId = detail.userId;

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

    const quotes = await loadEpisodeQuotes(tenantId, episodeId);

    const brandVoice = await loadBrandVoice(tenantId, userId);

    await updateBlogStatus(tenantId, episodeId, 'content_generating');

    const systemPrompt = buildSystemPrompt(brandVoice);
    const userPrompt = buildUserPrompt(outline, episode, quotes);

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

const loadBrandVoice = async (tenantId, userId) => {
  let brandVoice = null;

  if (tenantId === userId) {
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
  } else {
    try {
      const teamResponse = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `team#${tenantId}`,
          sk: 'metadata'
        })
      }));

      if (teamResponse.Item) {
        const team = unmarshall(teamResponse.Item);
        if (team.branding?.voice) {
          brandVoice = team.branding.voice;
          logger.info('Loaded team brand voice', { teamId: tenantId });
        }
      }
    } catch (err) {
      logger.warn('Could not load team brand voice', {
        error: err.message,
        teamId: tenantId
      });
    }
  }

  return brandVoice;
};

const buildSystemPrompt = (brandVoice) => {
  const tone = brandVoice?.tone || 'conversational and authentic';
  const writingStyle = brandVoice?.writingStyle || 'natural storytelling with real examples';

  return `You're a writer turning episode content into blog posts that sound like they were written by an actual human, not an AI.

Write in a ${tone} tone with ${writingStyle}.

The goal is to create content that feels genuine and engaging, like you're having a conversation with someone who's interested in the topic. Avoid the typical blog post formula - no "In this post, we'll explore..." openings, no bullet-pointed lists with "Key Takeaway #1" headings, no "In conclusion" wrap-ups.

Instead:
- Start with something that grabs attention - a surprising fact, a relatable problem, or an interesting observation
- Let the content flow naturally from one idea to the next
- Use the quotes provided to support your points, weaving them into the narrative rather than dropping them in as block quotes
- When you research something, link to it inline (like [this](url)) rather than listing citations at the end
- Write the way people actually talk and think about these topics
- Include code examples or technical details when they help illustrate a point, but integrate them naturally
- End when you've said what needs to be said - no forced conclusions or summaries

If you need to verify facts, find examples, or research current information, use web search. When you reference something you found, link to it naturally in the text.

Format in markdown:
- Use # for the title, ## for major sections (but make them sound natural, not like a table of contents)
- Code blocks with \`\`\`language when showing code
- Inline code with \`backticks\` for technical terms
- Links inline: [descriptive text](url)
- Emphasis with *italics* or **bold** sparingly, only when it genuinely adds impact

Aim for 1500-2500 words, but let the content dictate the length. If you've made your point well in 1400 words, stop there.

Return only the blog post content in markdown. No meta-commentary, no "Here's the blog post:", just the content itself.`;
};

const loadEpisodeQuotes = async (tenantId, episodeId) => {
  try {
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'data#quote#'
      })
    }));

    if (!response.Items || response.Items.length === 0) {
      logger.info('No quotes found for episode', { episodeId, tenantId });
      return [];
    }

    const quotes = response.Items.map(item => unmarshall(item));

    logger.info('Loaded quotes for blog generation', {
      episodeId,
      tenantId,
      quoteCount: quotes.length
    });

    return quotes;
  } catch (err) {
    logger.error('Error loading quotes', {
      error: err.message,
      stack: err.stack,
      episodeId,
      tenantId
    });
    return [];
  }
};

const buildUserPrompt = (outline, episode, quotes) => {
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

  const quotesSection = quotes.length > 0
    ? `Key Quotes from Episode:\n${quotes.map(q => `- "${q.text}" - ${q.speaker} (${q.timestamp})`).join('\n')}\n\n`
    : '';

  return `${contextSection}Blog Outline:
${outline}

${quotesSection}Please write a complete blog post based on this outline. Follow the structure provided and expand each section with detailed content, examples, and insights from the episode. You can reference and incorporate the quotes above where relevant to support your points.`;
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
