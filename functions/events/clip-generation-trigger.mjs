import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const logger = new Logger({ serviceName: 'events' });

const ddb = new DynamoDBClient();
const sfn = new SFNClient();

export const handler = async (event) => {
  try {
    const { tenantId, episodeId } = event.detail;

    if (!tenantId || !episodeId) {
      logger.error('Missing required fields in event detail', { tenantId, episodeId });
      throw new Error('Missing required fields: tenantId and episodeId are required');
    }

    const queryResult = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'clip#',
        ':status': 'detected'
      })
    }));

    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info('No clips with status detected found for episode', { episodeId });
      return {
        statusCode: 200,
        message: 'No clips found for processing',
        episodeId,
        tenantId
      };
    }

    const clips = queryResult.Items.map(item => unmarshall(item));
    logger.info('Found clips to process for episode', { episodeId, clipCount: clips.length });

    // Start Step Functions execution for each clip
    const executionPromises = clips.map(async (clip) => {
      const executionName = `${episodeId}-${clip.clipId}`;

      const input = {
        tenantId,
        episodeId,
        clipId: clip.clipId,
        segments: clip.segments || []
      };

      try {
        const startExecutionResult = await sfn.send(new StartExecutionCommand({
          stateMachineArn: process.env.STATE_MACHINE_ARN,
          name: executionName,
          input: JSON.stringify(input)
        }));

        return {
          clipId: clip.clipId,
          executionArn: startExecutionResult.executionArn,
          status: 'started'
        };
      } catch (error) {
        logger.error('Failed to start execution for clip', { clipId: clip.clipId, error: error.message });

        return {
          clipId: clip.clipId,
          status: 'failed',
          error: error.message
        };
      }
    });

    // Wait for all executions to start
    const executionResults = await Promise.allSettled(executionPromises);

    const successful = executionResults.filter(result =>
      result.status === 'fulfilled' && result.value.status === 'started'
    ).length;

    const failed = executionResults.filter(result =>
      result.status === 'rejected' ||
      (result.status === 'fulfilled' && result.value.status === 'failed')
    ).length;

    logger.info('Clip generation trigger completed', { successful, failed });

    return {
      statusCode: 200,
      message: 'Clip generation workflows started',
      episodeId,
      tenantId,
      totalClips: clips.length,
      successful,
      failed,
      executions: executionResults.map(result =>
        result.status === 'fulfilled' ? result.value : { status: 'failed', error: result.reason?.message }
      )
    };

  } catch (error) {
    logger.error('Error in clip generation trigger', { error: error.message, stack: error.stack });

    // For malformed events or validation errors, return success to avoid retries
    if (error.message.includes('Missing required fields')) {
      return {
        statusCode: 200,
        message: 'Event validation failed',
        error: error.message
      };
    }

    // For other errors (DynamoDB, Step Functions), throw to trigger retries
    throw error;
  }
};
