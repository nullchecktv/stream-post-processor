import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'agent-status' });
const ddb = new DynamoDBClient();

export const AGENT_TYPES = {
  CLIP_DETECTOR: 'clipDetector',
  QUOTE_DETECTOR: 'quoteDetector',
  BLOG_OUTLINE: 'blogOutline'
};

export const AGENT_STATUS = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  FAILED: 'Failed'
};

export async function updateAgentStatus(tenantId, episodeId, agentType, status, error = null) {
  const now = new Date().toISOString();
  const statusUpdate = {
    status,
    ...(status === AGENT_STATUS.IN_PROGRESS && { startedAt: now }),
    ...((status === AGENT_STATUS.COMPLETED || status === AGENT_STATUS.FAILED) && { completedAt: now }),
    ...(error && { error })
  };

  await ddb.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: `${tenantId}#${episodeId}`,
      sk: 'metadata'
    }),
    UpdateExpression: 'SET #agentStatus.#agentType = :status, #updatedAt = :now',
    ExpressionAttributeNames: {
      '#agentStatus': 'agentStatus',
      '#agentType': agentType,
      '#updatedAt': 'updatedAt'
    },
    ExpressionAttributeValues: marshall({
      ':status': statusUpdate,
      ':now': now
    })
  }));

  logger.info('Agent status updated', {
    tenantId,
    episodeId,
    agentType,
    status
  });
}

export async function checkAllAgentsComplete(tenantId, episodeId) {
  const result = await ddb.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: `${tenantId}#${episodeId}`,
      sk: 'metadata'
    })
  }));

  if (!result.Item) {
    return false;
  }

  const episode = unmarshall(result.Item);
  const agentStatus = episode.agentStatus || {};

  const allAgents = [
    AGENT_TYPES.CLIP_DETECTOR,
    AGENT_TYPES.QUOTE_DETECTOR,
    AGENT_TYPES.BLOG_OUTLINE
  ];

  const allComplete = allAgents.every(agentType => {
    const status = agentStatus[agentType]?.status;
    return status === AGENT_STATUS.COMPLETED || status === AGENT_STATUS.FAILED;
  });

  return allComplete;
}

export async function isContentGenerationComplete(tenantId, episodeId) {
  const result = await ddb.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: `${tenantId}#${episodeId}`,
      sk: 'metadata'
    })
  }));

  if (!result.Item) {
    return false;
  }

  const episode = unmarshall(result.Item);
  const workflowSteps = episode.workflowSteps || {};
  const generateContentStatus = workflowSteps.generateContent?.status;

  return generateContentStatus === 'Completed';
}
