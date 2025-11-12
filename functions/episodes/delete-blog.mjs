import { DynamoDBClient, GetItemCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { EpisodeSchemas } from '../utils/schemas.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, EpisodeSchemas.pathParameters);
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
      return formatResponse(404, { message: 'No blog found for episode' });
    }

    const deleteRequests = [];

    if (outlineResult.Item) {
      deleteRequests.push({
        DeleteRequest: {
          Key: marshall({
            pk,
            sk: 'data#blog#outline'
          })
        }
      });
    }

    if (contentResult.Item) {
      deleteRequests.push({
        DeleteRequest: {
          Key: marshall({
            pk,
            sk: 'data#blog#content'
          })
        }
      });
    }

    if (deleteRequests.length > 0) {
      await ddb.send(new BatchWriteItemCommand({
        RequestItems: {
          [process.env.TABLE_NAME]: deleteRequests
        }
      }));
    }

    return formatResponse(204, null);

  } catch (err) {
    logger.error('Error deleting blog', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
