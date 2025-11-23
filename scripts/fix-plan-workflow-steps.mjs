#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

if (!TABLE_NAME) {
  console.error('TABLE_NAME environment variable is required');
  process.exit(1);
}

async function fixPlanWorkflowSteps() {
  console.log('Scanning for episodes with plans but workflow step not updated...');

  const scanResult = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'sk = :metadata AND attribute_exists(workflowSteps)',
    ExpressionAttributeValues: {
      ':metadata': 'metadata'
    }
  }));

  const episodes = scanResult.Items || [];
  console.log(`Found ${episodes.length} episodes with workflow steps`);

  let fixed = 0;

  for (const episode of episodes) {
    const planStatus = episode.workflowSteps?.generatePlan?.status;

    if (planStatus === 'Not Started') {
      const planKey = {
        pk: episode.pk,
        sk: 'plan'
      };

      try {
        const planResult = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'pk = :pk AND sk = :sk',
          ExpressionAttributeValues: {
            ':pk': episode.pk,
            ':sk': 'plan'
          },
          Limit: 1
        }));

        if (planResult.Items && planResult.Items.length > 0) {
          console.log(`Fixing episode ${episode.pk} - has plan but workflow step is Not Started`);

          await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
              pk: episode.pk,
              sk: 'metadata'
            },
            UpdateExpression: 'SET #workflowSteps.#step = :stepData, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
              '#workflowSteps': 'workflowSteps',
              '#step': 'generatePlan',
              '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
              ':stepData': {
                status: 'Completed',
                completedAt: new Date().toISOString()
              },
              ':updatedAt': new Date().toISOString()
            }
          }));

          fixed++;
          console.log(`✓ Fixed ${episode.pk}`);
        }
      } catch (err) {
        console.error(`Error checking/fixing episode ${episode.pk}:`, err.message);
      }
    }
  }

  console.log(`\nFixed ${fixed} episodes`);
}

fixPlanWorkflowSteps().catch(console.error);
