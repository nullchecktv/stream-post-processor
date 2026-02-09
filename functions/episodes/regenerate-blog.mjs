import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters, validateBody } from '../utils/validation.mjs';
import { EpisodePathParamsSchema, BlogRegenerateSchema, BLOG_STATUS } from '../../schemas/index.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId, userId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, EpisodePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const bodyValidation = await validateBody(event, BlogRegenerateSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }

    const { episodeId } = pathValidation.data;
    const { outline } = bodyValidation.data;
    const pk = `${tenantId}#${episodeId}`;
    const now = new Date().toISOString();

    const existingOutline = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk,
        sk: 'data#blog#outline'
      })
    }));

    if (!existingOutline.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Blog was not found for episode '${episodeId}'`
      });
    }

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk,
        sk: 'data#blog#outline',
        outline,
        status: BLOG_STATUS.PROCESSING,
        createdAt: existingOutline.Item ? unmarshall(existingOutline.Item).createdAt : now,
        updatedAt: now
      })
    }));

    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'nullcheck',
          DetailType: 'BlogOutlineCreated',
          Detail: JSON.stringify({
            episodeId,
            tenantId,
            userId,
            timestamp: now
          })
        }
      ]
    }));

    logger.info('Blog regeneration initiated', {
      episodeId,
      tenantId
    });

    return formatResponse(202, {
      episodeId,
      status: BLOG_STATUS.PROCESSING,
      message: 'Blog content regeneration started'
    });

  } catch (err) {
    logger.error('Error regenerating blog', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
