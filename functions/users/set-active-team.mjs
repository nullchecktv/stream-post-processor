import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayClient, FlushStageAuthorizersCacheCommand } from '@aws-sdk/client-api-gateway';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validateRequest } from '../utils/validation.mjs';
import { UserSchemas } from '../utils/schemas.mjs';

const logger = new Logger({ serviceName: 'users' });

const ddb = new DynamoDBClient();
const apiGateway = new APIGatewayClient();

export const handler = async (event) => {
  try {
    const validation = await validateRequest(event, UserSchemas.setActiveTeam);
    if (!validation.success) {
      return validation.error;
    }

    const { userId, data } = validation;
    const { teamId } = data;

    if (teamId) {
      const membershipResponse = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `team#${teamId}`,
          sk: `user#${userId}`
        })
      }));

      if (!membershipResponse.Item) {
        return formatResponse(422, {
          error: 'UnprocessableEntity',
          message: 'User is not a member of the specified team'
        });
      }
    }

    const updateParams = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: 'profile'
      }),
      ConditionExpression: 'attribute_exists(pk)'
    };

    if (teamId) {
      updateParams.UpdateExpression = 'SET activeTeamId = :teamId, updatedAt = :updatedAt';
      updateParams.ExpressionAttributeValues = marshall({
        ':teamId': teamId,
        ':updatedAt': new Date().toISOString()
      });
    } else {
      updateParams.UpdateExpression = 'REMOVE activeTeamId SET updatedAt = :updatedAt';
      updateParams.ExpressionAttributeValues = marshall({
        ':updatedAt': new Date().toISOString()
      });
    }

    await ddb.send(new UpdateItemCommand(updateParams));

    // Flush the API Gateway authorizer cache for immediate effect
    try {
      const apiId = event.requestContext.apiId;
      const stage = event.requestContext.stage;

      await apiGateway.send(new FlushStageAuthorizersCacheCommand({
        restApiId: apiId,
        stageName: stage
      }));
    } catch (cacheError) {
      logger.error('Failed to flush authorizer cache', {
        error: cacheError.message,
        stack: cacheError.stack,
        userId,
        teamId
      });
      // Don't fail the request if cache flush fails
    }

    return formatEmptyResponse();

  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return formatResponse(404, {
        error: 'NotFound',
        message: 'User profile not found'
      });
    }

    logger.error('Error setting active team', {
      error: err.message,
      stack: err.stack,
      userId: event.requestContext?.authorizer?.userId,
      teamId: event.body ? JSON.parse(event.body).teamId : undefined
    });
    return formatResponse(500, {
      error: 'InternalError',
      message: 'Something went wrong'
    });
  }
};
