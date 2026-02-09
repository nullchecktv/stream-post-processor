import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { PlanUpdateSchema, PlanPathParamsSchema } from '../../schemas/index.mjs';
import { addStatusEntry } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const validation = validateRequest(event, PlanUpdateSchema);
    if (!validation.success) {
      return validation.error;
    }

    const pathValidation = await validatePathParameters(event, PlanPathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { tenantId, data } = validation;
    const { episodeId } = pathValidation.data;
    const { objectives, concepts, notes } = data;

    const episodeResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      })
    }));

    if (!episodeResult.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Episode with ID '${episodeId}' was not found`
      });
    }

    const planResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'plan'
      })
    }));

    if (!planResult.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Plan was not found for episode '${episodeId}'`
      });
    }

    const episode = unmarshall(episodeResult.Item);
    const existingPlan = unmarshall(planResult.Item);
    const now = new Date().toISOString();

    const updatedPlanItem = {
      pk: `${tenantId}#${episodeId}`,
      sk: 'plan',
      objectives,
      concepts,
      ...(notes !== undefined ? { notes } : {}),
      createdAt: existingPlan.createdAt,
      updatedAt: now
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(updatedPlanItem)
    }));

    const updatedStatusHistory = addStatusEntry(episode.statusHistory || [], 'plan_updated', now);

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        ...episode,
        statusHistory: updatedStatusHistory,
        status: 'plan_updated',
        updatedAt: now
      })
    }));

    try {
      await eventBridge.send(new PutEventsCommand({
        Entries: [
          {
            Source: 'nullcheck',
            DetailType: 'Episode Plan Updated',
            Detail: JSON.stringify({
              episodeId,
              tenantId,
              action: 'plan_updated',
              plan: {
                objectives,
                concepts,
                ...(notes !== undefined ? { notes } : {})
              },
              timestamp: now
            })
          }
        ]
      }));
    } catch (e) {
      logger.error('Failed to publish Episode Plan Updated event', {
        error: e.message,
        stack: e.stack,
        episodeId,
        tenantId
      });
    }

    return formatResponse(200, {
      episodeId,
      plan: {
        objectives,
        concepts,
        ...(notes !== undefined ? { notes } : {}),
        createdAt: existingPlan.createdAt,
        updatedAt: now
      },
      status: 'plan_updated'
    });

  } catch (err) {
    logger.error('Error updating plan', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
