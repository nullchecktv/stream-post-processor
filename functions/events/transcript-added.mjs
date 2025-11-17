import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { parseEpisodeIdFromKey } from '../utils/clips.mjs';
import { initializeContentGeneration, updateWorkflowStep } from '../utils/workflow-state.mjs';
import { WORKFLOW_STEP_STATUS } from '../../schemas/workflow.mjs';
import { publishNotificationEvent } from '../utils/notifications.mjs';

const logger = new Logger({ serviceName: 'events' });

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const rawKey = event?.detail?.object?.key;
    if (!rawKey) {
      logger.info('Unsupported event shape (expecting EventBridge S3 event)', { eventDetail: event?.detail || {} });
      return { statusCode: 200 };
    }

    const key = decodeURIComponent(rawKey);
    let tenantId, episodeId;
    try {
      const parsed = parseEpisodeIdFromKey(key);
      tenantId = parsed.tenantId;
      episodeId = parsed.episodeId;
    } catch (e) {
      logger.warn('Skipping object with unexpected key', { key, reason: e.message });
      return { statusCode: 200 };
    }

    if (!tenantId) {
      logger.error('Missing tenantId in S3 key', { key });
      return { statusCode: 200 };
    }

    const episodeResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' })
    }));

    if (!episodeResponse.Item) {
      logger.warn('Episode not found; skipping transcript attachment', { episodeId, key });
      return { statusCode: 200 };
    }

    const now = new Date().toISOString();
    const newStatus = 'transcript uploaded';

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: 'SET #transcriptKey = :key, #status = :status, #updatedAt = :updatedAt, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry)',
      ExpressionAttributeNames: {
        '#transcriptKey': 'transcriptKey',
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#statusHistory': 'statusHistory'
      },
      ExpressionAttributeValues: marshall({
        ':key': key,
        ':status': newStatus,
        ':updatedAt': now,
        ':emptyList': [],
        ':newStatusEntry': [{
          status: newStatus,
          timestamp: now
        }]
      }),
    }));

    try {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'transcript-upload-url' })
      }));
    } catch (e) {
      logger.warn('Failed to delete presigned url record', { episodeId, error: e?.message || e });
    }

    await updateWorkflowStep(tenantId, episodeId, 'upload-transcript', WORKFLOW_STEP_STATUS.IN_PROGRESS);

    await initializeContentGeneration(tenantId, episodeId);

    const workflowState = await import('../utils/workflow-state.mjs').then(m => m.getWorkflowState(tenantId, episodeId));

    await publishNotificationEvent({
      type: 'workflow_step_updated',
      tenantId,
      userId: null,
      title: 'Workflow Updated',
      message: 'Transcript uploaded, content generation started',
      url: `/episodes/${episodeId}`,
      persist: false,
      topic: 'tenant',
      metadata: {
        episodeId,
        stepName: 'upload-transcript',
        status: WORKFLOW_STEP_STATUS.IN_PROGRESS,
        workflowState
      }
    });

    return { statusCode: 200 };
  } catch (err) {
    logger.error('Error handling EventBridge S3 event', {
      error: err.message,
      stack: err.stack,
      eventDetail: event?.detail
    });
    throw err;
  }
};


