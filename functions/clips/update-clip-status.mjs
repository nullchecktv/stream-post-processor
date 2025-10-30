import { DynamoDBClient, GetCommand, UpdateCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { CLIP_STATUS, validateStatusUpdate, createStatusUpdateParams } from '../utils/clips.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { episodeId, clipId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    if (!episodeId || !clipId) {
      return formatResponse(400, {
        error: 'BadRequest',
        message: 'Episode ID and Clip ID are required'
      });
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return formatResponse(400, {
        error: 'BadRequest',
        message: 'Invalid JSON in request body'
      });
    }

    const { status } = requestBody;

    if (!status) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'Status is required'
      });
    }

    if (!Object.values(CLIP_STATUS).includes(status)) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: `Invalid status. Must be one of: ${Object.values(CLIP_STATUS).join(', ')}`
      });
    }

    // Get current clip to validate status transition
    const getResult = await ddb.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `clip#${clipId}`
      })
    }));

    if (!getResult.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Clip with ID '${clipId}' was not found in episode '${episodeId}'`
      });
    }

    const clip = unmarshall(getResult.Item);

    // Validate status transition
    try {
      validateStatusUpdate(clip, status);
    } catch (error) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: error.message
      });
    }

    // Update clip status
    const updateParams = createStatusUpdateParams(status);

    await ddb.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `clip#${clipId}`
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
    console.error('Error updating clip status:', err);
    return formatResponse(500, {
      error: 'InternalError',
      message: 'Something went wrong'
    });
  }
};
