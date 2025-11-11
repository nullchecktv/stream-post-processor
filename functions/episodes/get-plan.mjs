import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { PlanSchemas } from '../utils/schemas.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, PlanSchemas.pathParameters);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { episodeId } = pathValidation.data;

    const planResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'plan'
      })
    }));

    if (!planResult.Item) {
      return formatResponse(404, { message: 'Plan not found for episode' });
    }

    const plan = unmarshall(planResult.Item);

    const recommendationsResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'recommendations'
      })
    }));

    const response = {
      episodeId,
      plan: {
        objectives: plan.objectives,
        concepts: plan.concepts,
        ...(plan.notes && { notes: plan.notes }),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      },
      recommendations: null
    };

    if (recommendationsResult.Item) {
      const recommendations = unmarshall(recommendationsResult.Item);
      response.recommendations = {
        suggestedFlow: recommendations.suggestedFlow,
        proposedTitle: recommendations.proposedTitle,
        proposedDescription: recommendations.proposedDescription,
        keyLearningMoments: recommendations.keyLearningMoments,
        detailedOutline: recommendations.detailedOutline,
        generatedAt: recommendations.generatedAt
      };
    }

    return formatResponse(200, response);

  } catch (err) {
    logger.error('Error getting plan', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
