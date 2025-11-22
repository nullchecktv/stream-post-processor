import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { WORKFLOW_STEP_STATUS, WORKFLOW_STEP_TRANSITIONS } from '../../schemas/episodes.mjs';
import { publishNotificationEvent } from './notifications.mjs';

const logger = new Logger({ serviceName: 'workflow-steps' });

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

export const WORKFLOW_STEPS = {
  GENERATE_PLAN: 'generatePlan',
  UPLOAD_TRANSCRIPT: 'uploadTranscript',
  UPLOAD_TRACKS: 'uploadTracks'
};

export const validateWorkflowStepTransition = (currentStatus, newStatus) => {
  if (!currentStatus) {
    return true;
  }

  const allowedTransitions = WORKFLOW_STEP_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid workflow step transition from '${currentStatus}' to '${newStatus}'`
    );
  }

  return true;
};

export const initializeWorkflowSteps = () => ({
  generatePlan: {
    status: WORKFLOW_STEP_STATUS.NOT_STARTED
  },
  uploadTranscript: {
    status: WORKFLOW_STEP_STATUS.NOT_STARTED
  },
  uploadTracks: {
    status: WORKFLOW_STEP_STATUS.NOT_STARTED
  }
});

export const canProceedToUploads = (workflowSteps) => {
  if (!workflowSteps?.generatePlan) {
    return false;
  }

  const planStatus = workflowSteps.generatePlan.status;
  return [
    WORKFLOW_STEP_STATUS.COMPLETED,
    WORKFLOW_STEP_STATUS.SKIPPED,
    WORKFLOW_STEP_STATUS.FAILED
  ].includes(planStatus);
};

const getStepLabel = (step) => {
  const labels = {
    [WORKFLOW_STEPS.GENERATE_PLAN]: 'Generate Plan',
    [WORKFLOW_STEPS.UPLOAD_TRANSCRIPT]: 'Upload Transcript',
    [WORKFLOW_STEPS.UPLOAD_TRACKS]: 'Upload Tracks'
  };
  return labels[step] || step;
};

export const updateWorkflowStepStatus = async (
  tenantId,
  episodeId,
  step,
  status,
  error = null
) => {
  const now = new Date().toISOString();
  const stepData = { status };

  if (status === WORKFLOW_STEP_STATUS.IN_PROGRESS) {
    stepData.startedAt = now;
  }

  if (status === WORKFLOW_STEP_STATUS.COMPLETED || status === WORKFLOW_STEP_STATUS.FAILED) {
    stepData.completedAt = now;
  }

  if (status === WORKFLOW_STEP_STATUS.FAILED && error) {
    stepData.error = error;
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      },
      UpdateExpression: 'SET workflowSteps.#step = :stepData, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#step': step
      },
      ExpressionAttributeValues: {
        ':stepData': stepData,
        ':updatedAt': now
      }
    }));

    await publishNotificationEvent({
      type: 'workflow_step_updated',
      tenantId,
      title: 'Workflow Step Updated',
      message: `${getStepLabel(step)} is now ${status}`,
      url: `/episodes/${episodeId}`,
      persist: false,
      metadata: {
        episodeId,
        step,
        status
      }
    });

    logger.info('Workflow step status updated', {
      tenantId,
      episodeId,
      step,
      status
    });
  } catch (err) {
    logger.error('Failed to update workflow step status', {
      error: err.message,
      stack: err.stack,
      tenantId,
      episodeId,
      step,
      status
    });
    throw new Error('Failed to update workflow step status');
  }
};
