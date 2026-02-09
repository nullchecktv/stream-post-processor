import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters, validateBody } from '../utils/validation.mjs';
import { ClipPathParamsSchema, ClipGenerateSchema, CLIP_STATUS } from '../../schemas/index.mjs';
import { getCurrentClipStatus } from '../utils/clips.mjs';

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

    const pathValidation = await validatePathParameters(event, ClipPathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const bodyValidation = await validateBody(event, ClipGenerateSchema);
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

    const currentStatus = getCurrentClipStatus(clip);

    if (![CLIP_STATUS.PROPOSED, CLIP_STATUS.FAILED].includes(currentStatus)) {
      return formatResponse(400, {
        error: 'InvalidState',
        message: `Clip must be in ${CLIP_STATUS.PROPOSED} or ${CLIP_STATUS.FAILED} status to generate. Current status: ${currentStatus}`
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
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
