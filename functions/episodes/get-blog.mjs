import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { EpisodePathParamsSchema } from '../../schemas/index.mjs';

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

    const { episodeId } = pathValidation.data;
    const pk = `${tenantId}#${episodeId}`;

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

    if (!outlineResult.Item && !contentResult.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Blog was not found for episode '${episodeId}'`
      });
    }

    const outline = outlineResult.Item ? unmarshall(outlineResult.Item) : null;
    const content = contentResult.Item ? unmarshall(contentResult.Item) : null;

    const response = {
      episodeId,
      outline: outline?.outline || null,
      content: content?.content || null,
      status: content?.status || outline?.status || null,
      wordCount: content?.wordCount || null,
      createdAt: outline?.createdAt || content?.createdAt || null,
      updatedAt: content?.updatedAt || outline?.updatedAt || null
    };

    return formatResponse(200, response);

  } catch (err) {
    logger.error('Error getting blog', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
