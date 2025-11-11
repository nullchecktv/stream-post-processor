import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters, validateBody } from '../utils/validation.mjs';
import { ClipSchemas } from '../utils/schemas.mjs';

const logger = new Logger({ serviceName: 'clips' });
const ddb = new DynamoDBClient();
const sfn = new SFNClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, ClipSchemas.pathParameters);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const bodyValidation = await validateBody(event, ClipSchemas.generate);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }

    const { episodeId, clipId } = pathValidation.data;
    const { orientation } = bodyValidation.data;

    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#clip#${clipId}`
      })
    }));

    if (!result.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Clip with ID '${clipId}' was not found in episode '${episodeId}'`
      });
    }

    const clip = unmarshall(result.Item);

    const statusHistory = clip.statusHistory || [];
    const currentStatus = statusHistory.length > 0
      ? statusHistory[statusHistory.length - 1].status
      : 'unknown';

    if (!['detected', 'failed'].includes(currentStatus)) {
      return formatResponse(400, {
        error: 'InvalidState',
        message: `Clip must be in detected or failed status to generate. Current status: ${currentStatus}`
      });
    }

    const execution = await sfn.send(new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify({
        tenantId,
        episodeId,
        clipId,
        segments: clip.segments || [],
        orientation
      })
    }));

    return formatResponse(202, {
      executionArn: execution.executionArn,
      status: 'started',
      clipId,
      episodeId,
      orientation
    });

  } catch (err) {
    logger.error('Error generating clip', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId,
      clipId: event.pathParameters?.clipId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
