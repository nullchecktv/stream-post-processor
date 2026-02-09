import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { validateStatusUpdate, createStatusUpdateParams } from '../utils/clips.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { ClipPathParamsSchema, ClipStatusUpdateSchema } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'clips' });
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, ClipPathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const requestValidation = await validateRequest(event, ClipStatusUpdateSchema);
    if (!requestValidation.success) {
      return requestValidation.error;
    }

    const { tenantId, data } = requestValidation;
    const { episodeId, clipId } = pathValidation.data;
    const { status } = data;

    const getResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#clip#${clipId}`
      })
    }));

    if (!getResult.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Clip with ID '${clipId}' was not found in episode '${episodeId}'`
      });
    }

    const clip = unmarshall(getResult.Item);

    try {
      validateStatusUpdate(clip, status);
    } catch (error) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: error.message
      });
    }

    const updateParams = createStatusUpdateParams(status);

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#clip#${clipId}`
      }),
      ...updateParams
    }));

    return formatResponse(200, {
      clipId,
      episodeId,
      status,
      updatedAt: new Date().toISOString()
    });

  } catch (err) {
    logger.error('Error updating clip status', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId,
      clipId: event.pathParameters?.clipId,
      status: event.body ? JSON.parse(event.body).status : undefined
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
