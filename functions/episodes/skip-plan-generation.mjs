import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { updateWorkflowStepStatus, WORKFLOW_STEPS } from '../utils/workflow-steps.mjs';
import { WORKFLOW_STEP_STATUS } from '../../schemas/episodes.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { episodeId } = event.pathParameters;

    const episodeResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      })
    }));

    if (!episodeResponse.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Episode with ID '${episodeId}' was not found`
      });
    }

    const episode = unmarshall(episodeResponse.Item);
    const currentStatus = episode.workflowSteps?.generatePlan?.status;

    if (currentStatus === WORKFLOW_STEP_STATUS.COMPLETED) {
      return formatResponse(409, {
        error: 'Conflict',
        message: 'Plan has already been generated for this episode'
      });
    }

    if (currentStatus === WORKFLOW_STEP_STATUS.IN_PROGRESS) {
      return formatResponse(409, {
        error: 'Conflict',
        message: 'Plan generation is currently in progress'
      });
    }

    await updateWorkflowStepStatus(
      tenantId,
      episodeId,
      WORKFLOW_STEPS.GENERATE_PLAN,
      WORKFLOW_STEP_STATUS.SKIPPED
    );

    logger.info('Plan generation skipped', {
      episodeId,
      tenantId
    });

    return formatResponse(200, {
      message: 'Plan generation skipped'
    });
  } catch (err) {
    logger.error('Error skipping plan generation', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
