import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters, validateBody } from '../utils/validation.mjs';
import { EpisodePathParamsSchema, BlogUpdateSchema, BLOG_STATUS } from '../../schemas/index.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, EpisodePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const bodyValidation = await validateBody(event, BlogUpdateSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }

    const { episodeId } = pathValidation.data;
    const { outline, content } = bodyValidation.data;

    if (!outline && !content) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'At least one of outline or content must be provided'
      });
    }

    const pk = `${tenantId}#${episodeId}`;
    const now = new Date().toISOString();

    let updatedOutline = null;
    let updatedContent = null;
    let updatedWordCount = null;

    if (outline) {
      const outlineResult = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk,
          sk: 'data#blog#outline'
        })
      }));

      if (!outlineResult.Item) {
        return formatResponse(404, {
          error: 'NotFound',
          message: `Blog was not found for episode '${episodeId}'`
        });
      }

      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk,
          sk: 'data#blog#outline'
        }),
        UpdateExpression: 'SET outline = :outline, #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':outline': outline,
          ':status': BLOG_STATUS.EDITED,
          ':updatedAt': now
        })
      }));

      updatedOutline = outline;
    }

    if (content) {
      const contentResult = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk,
          sk: 'data#blog#content'
        })
      }));

      if (!contentResult.Item) {
        return formatResponse(404, {
          error: 'NotFound',
          message: `Blog was not found for episode '${episodeId}'`
        });
      }

      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk,
          sk: 'data#blog#content'
        }),
        UpdateExpression: 'SET content = :content, #status = :status, wordCount = :wordCount, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':content': content,
          ':status': BLOG_STATUS.EDITED,
          ':wordCount': wordCount,
          ':updatedAt': now
        })
      }));

      updatedContent = content;
      updatedWordCount = wordCount;
    }

    const [outlineResult, contentResult] = await Promise.all([
      ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk,
          sk: 'data#blog#outline'
        })
      })),
      ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk,
          sk: 'data#blog#content'
        })
      }))
    ]);

    const outlineRecord = outlineResult.Item ? unmarshall(outlineResult.Item) : null;
    const contentRecord = contentResult.Item ? unmarshall(contentResult.Item) : null;

    const response = {
      episodeId,
      outline: updatedOutline || outlineRecord?.outline || null,
      content: updatedContent || contentRecord?.content || null,
      status: contentRecord?.status || outlineRecord?.status || null,
      wordCount: updatedWordCount || contentRecord?.wordCount || null,
      updatedAt: now
    };

    return formatResponse(200, response);

  } catch (err) {
    logger.error('Error updating blog', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
