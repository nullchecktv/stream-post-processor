import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const ddb = new DynamoDBClient();
const sfn = new SFNClient();

export const handler = async (event) => {
  try {
    console.log('Received Begin Clip Generation event:', JSON.stringify(event, null, 2));

    // Parse EventBridge event
    const { source, 'detail-type': detailType, detail } = event;

    // Validate event structure
    if (source !== 'nullcheck.clips' || detailType !== 'Begin Clip Generation') {
      console.log('Ignoring event - not a Begin Clip Generation event:', { source, detailType });
      return { statusCode: 200, message: 'Event ignored' };
    }

    // Extract required fields from event detail
    const { tenantId, episodeId } = detail;

    if (!tenantId || !episodeId) {
      console.error('Missing required fields in event detail:', { tenantId, episodeId });
      throw new Error('Missing required fields: tenantId and episodeId are required');
    }

    console.log(`Processing clip generation for episode ${episodeId} (tenant: ${tenantId})`);

    // Query DynamoDB to get all clips for the episode with status 'detected'
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
      console.log(`No clips with status 'detected' found for episode ${episodeId}`);
      return {
        statusCode: 200,
        message: 'No clips found for processing',
        episodeId,
        tenantId
      };
    }

    const clips = queryResult.Items.map(item => unmarshall(item));
    console.log(`Found ${clips.length} clips to process for episode ${episodeId}`);

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
        console.error(`Failed to start execution for clip ${clip.clipId}:`, error);

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

    console.log(`Clip generation trigger completed: ${successful} started, ${failed} failed`);

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
    console.error('Error in clip generation trigger:', error);

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
