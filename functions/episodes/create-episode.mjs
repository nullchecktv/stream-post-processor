import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import crypto from 'crypto';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { initializeStatusHistory } from '../utils/status-history.mjs';
import { validateRequest } from '../utils/validation.mjs';
import { EpisodeCreateSchema, EPISODE_STATUS } from '../../schemas/index.mjs';
import { initializeWorkflowSteps } from '../utils/workflow-state.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const validation = validateRequest(event, EpisodeCreateSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { tenantId, userId, data } = validation;
    const { title, episodeNumber, description, airDate, platforms, themes, seriesName } = data;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const initialStatus = EPISODE_STATUS.DRAFT;
    const statusHistory = initializeStatusHistory(initialStatus, now);

    const item = {
      pk: `${tenantId}#${id}`,
      sk: 'metadata',
      GSI1PK: `${tenantId}#episode`,
      GSI1SK: now,
      title,
      episodeNumber,
      status: initialStatus,
      statusHistory,
      userId,
      ...(description && { description }),
      ...(airDate && { airDate }),
      ...(platforms?.length && { platforms }),
      ...(themes?.length && { themes }),
      ...(seriesName && { seriesName }),
      numTracks: 0,
      createdAt: now,
      updatedAt: now,
    };
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      Item: marshall(item),
    }));

    try {
      await initializeWorkflowSteps(tenantId, id);
    } catch (workflowErr) {
      logger.error('Error initializing workflow steps', {
        error: workflowErr.message,
        stack: workflowErr.stack,
        episodeId: id,
        tenantId
      });
    }

    return formatResponse(201, { id });
  } catch (err) {
    logger.error('Error creating episode', {
      error: err.message,
      stack: err.stack,
      name: err.name
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};

