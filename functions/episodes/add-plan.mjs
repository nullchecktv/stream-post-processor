import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { PlanCreateSchema, PlanPathParamsSchema } from '../../schemas/index.mjs';
import { addStatusEntry } from '../utils/status-history.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const validation = validateRequest(event, PlanCreateSchema);
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
      return formatResponse(404, { message: `Episode with ID '${episodeId}' was not found` });
    }

    const episode = unmarshall(episodeResult.Item);
    const now = new Date().toISOString();

    const planItem = {
      pk: `${tenantId}#${episodeId}`,
      sk: 'plan',
      objectives,
      concepts,
      ...(notes && { notes }),
      createdAt: now,
      updatedAt: now
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(planItem),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));

    const updatedStatusHistory = addStatusEntry(episode.statusHistory || [], 'plan_added', now);

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        ...episode,
        statusHistory: updatedStatusHistory,
        status: 'plan_added',
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
              action: 'plan_added',
              plan: {
                objectives,
                concepts,
                ...(notes && { notes })
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

    return formatResponse(201, {
      episodeId,
      plan: {
        objectives,
        concepts,
        ...(notes && { notes }),
        createdAt: now,
        updatedAt: now
      },
      status: 'plan_added'
    });

  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, { message: 'Plan already exists for this episode' });
    }

    logger.error('Error adding plan', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
