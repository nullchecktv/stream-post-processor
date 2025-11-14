import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import {
  WORKFLOW_STEP_STATUS,
  WORKFLOW_STEP_TRANSITIONS,
  CONTENT_GENERATION_STATUS,
  CONTENT_GENERATION_TRANSITIONS
} from '../../schemas/workflow.mjs';

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);
const logger = new Logger({ serviceName: 'workflow-state' });

const TABLE_NAME = process.env.TABLE_NAME;

export const initializeWorkflowSteps = async (tenantId, episodeId) => {
  const now = new Date().toISOString();
  const pk = `${tenantId}#${episodeId}`;

  const steps = [
    {
      pk,
      sk: 'workflow#step#generate-plan',
      stepName: 'generate-plan',
      status: WORKFLOW_STEP_STATUS.READY,
      statusHistory: [{
        status: WORKFLOW_STEP_STATUS.READY,
        timestamp: now
      }],
      createdAt: now,
      updatedAt: now
    },
    {
      pk,
      sk: 'workflow#step#upload-transcript',
      stepName: 'upload-transcript',
      status: WORKFLOW_STEP_STATUS.LOCKED,
      statusHistory: [{
        status: WORKFLOW_STEP_STATUS.LOCKED,
        timestamp: now
      }],
      createdAt: now,
      updatedAt: now
    },
    {
      pk,
      sk: 'workflow#step#upload-tracks',
      stepName: 'upload-tracks',
      status: WORKFLOW_STEP_STATUS.LOCKED,
      statusHistory: [{
        status: WORKFLOW_STEP_STATUS.LOCKED,
        timestamp: now
      }],
      createdAt: now,
      updatedAt: now
    }
  ];

  for (const step of steps) {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: step
    }));
  }

  logger.info('Initialized workflow steps', { tenantId, episodeId });
};

export const updateWorkflowStep = async (tenantId, episodeId, stepName, status, metadata = {}) => {
  const now = new Date().toISOString();
  const pk = `${tenantId}#${episodeId}`;
  const sk = `workflow#step#${stepName}`;

  const statusEntry = {
    status,
    timestamp: now,
    ...metadata
  };

  const updateParams = {
    TableName: TABLE_NAME,
    Key: { pk, sk },
    UpdateExpression: 'SET #status = :status, statusHistory = list_append(if_not_exists(statusHistory, :emptyList), :newStatus), updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':emptyList': [],
      ':newStatus': [statusEntry],
      ':updatedAt': now
    }
  };

  if (status === WORKFLOW_STEP_STATUS.IN_PROGRESS && !metadata.startedAt) {
    updateParams.UpdateExpression += ', startedAt = if_not_exists(startedAt, :startedAt)';
    updateParams.ExpressionAttributeValues[':startedAt'] = now;
  }

  if (status === WORKFLOW_STEP_STATUS.COMPLETE || status === WORKFLOW_STEP_STATUS.SKIPPED) {
    updateParams.UpdateExpression += ', completedAt = :completedAt';
    updateParams.ExpressionAttributeValues[':completedAt'] = now;
  }

  if (metadata.errorMessage) {
    updateParams.UpdateExpression += ', errorMessage = :errorMessage';
    updateParams.ExpressionAttributeValues[':errorMessage'] = metadata.errorMessage;
  }

  await docClient.send(new UpdateCommand(updateParams));

  logger.info('Updated workflow step', { tenantId, episodeId, stepName, status });

  if (status === WORKFLOW_STEP_STATUS.COMPLETE || status === WORKFLOW_STEP_STATUS.SKIPPED) {
    await unlockDependentSteps(tenantId, episodeId, stepName);
  }
};

export const unlockDependentSteps = async (tenantId, episodeId, completedStep) => {
  if (completedStep === 'generate-plan') {
    await updateWorkflowStep(tenantId, episodeId, 'upload-transcript', WORKFLOW_STEP_STATUS.READY);
    await updateWorkflowStep(tenantId, episodeId, 'upload-tracks', WORKFLOW_STEP_STATUS.READY);
    logger.info('Unlocked dependent steps after generate-plan', { tenantId, episodeId });
  }
};

export const getWorkflowState = async (tenantId, episodeId) => {
  const pk = `${tenantId}#${episodeId}`;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':skPrefix': 'workflow#'
    }
  }));

  const steps = [];
  const contentGeneration = [];

  for (const item of result.Items || []) {
    if (item.sk.startsWith('workflow#step#')) {
      steps.push({
        stepName: item.stepName,
        status: item.status,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        errorMessage: item.errorMessage
      });
    } else if (item.sk.startsWith('workflow#content#')) {
      contentGeneration.push({
        contentType: item.contentType,
        status: item.status,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        itemCount: item.itemCount,
        errorMessage: item.errorMessage
      });
    }
  }

  return { steps, contentGeneration };
};

export const initializeContentGeneration = async (tenantId, episodeId) => {
  const now = new Date().toISOString();
  const pk = `${tenantId}#${episodeId}`;

  const contentTypes = ['blog', 'quotes', 'clips'];

  for (const contentType of contentTypes) {
    const item = {
      pk,
      sk: `workflow#content#${contentType}`,
      contentType,
      status: CONTENT_GENERATION_STATUS.PENDING,
      statusHistory: [{
        status: CONTENT_GENERATION_STATUS.PENDING,
        timestamp: now
      }],
      createdAt: now,
      updatedAt: now
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));
  }

  logger.info('Initialized content generation records', { tenantId, episodeId });
};

export const updateContentGeneration = async (tenantId, episodeId, contentType, status, metadata = {}) => {
  const now = new Date().toISOString();
  const pk = `${tenantId}#${episodeId}`;
  const sk = `workflow#content#${contentType}`;

  const statusEntry = {
    status,
    timestamp: now,
    ...metadata
  };

  const updateParams = {
    TableName: TABLE_NAME,
    Key: { pk, sk },
    UpdateExpression: 'SET #status = :status, statusHistory = list_append(if_not_exists(statusHistory, :emptyList), :newStatus), updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':emptyList': [],
      ':newStatus': [statusEntry],
      ':updatedAt': now
    }
  };

  if (status === CONTENT_GENERATION_STATUS.PROCESSING && !metadata.startedAt) {
    updateParams.UpdateExpression += ', startedAt = if_not_exists(startedAt, :startedAt)';
    updateParams.ExpressionAttributeValues[':startedAt'] = now;
  }

  if (status === CONTENT_GENERATION_STATUS.COMPLETE || status === CONTENT_GENERATION_STATUS.FAILED) {
    updateParams.UpdateExpression += ', completedAt = :completedAt';
    updateParams.ExpressionAttributeValues[':completedAt'] = now;
  }

  if (metadata.itemCount !== undefined) {
    updateParams.UpdateExpression += ', itemCount = :itemCount';
    updateParams.ExpressionAttributeValues[':itemCount'] = metadata.itemCount;
  }

  if (metadata.errorMessage) {
    updateParams.UpdateExpression += ', errorMessage = :errorMessage';
    updateParams.ExpressionAttributeValues[':errorMessage'] = metadata.errorMessage;
  }

  await docClient.send(new UpdateCommand(updateParams));

  logger.info('Updated content generation', { tenantId, episodeId, contentType, status });

  if (status === CONTENT_GENERATION_STATUS.COMPLETE || status === CONTENT_GENERATION_STATUS.FAILED) {
    await checkUploadTranscriptCompletion(tenantId, episodeId);
  }
};

export const checkUploadTranscriptCompletion = async (tenantId, episodeId) => {
  const pk = `${tenantId}#${episodeId}`;

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':skPrefix': 'workflow#content#'
    }
  }));

  const contentStates = result.Items || [];
  const allComplete = contentStates.every(
    item => item.status === CONTENT_GENERATION_STATUS.COMPLETE || item.status === CONTENT_GENERATION_STATUS.FAILED
  );

  if (allComplete && contentStates.length === 3) {
    await updateWorkflowStep(tenantId, episodeId, 'upload-transcript', WORKFLOW_STEP_STATUS.COMPLETE);
    logger.info('All content generation complete, marked upload-transcript as complete', { tenantId, episodeId });
  }
};

export const validateStatusTransition = (currentStatus, newStatus, transitions) => {
  if (!currentStatus) {
    return true;
  }

  const allowedTransitions = transitions[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
  }

  return true;
};
