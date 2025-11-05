import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayClient, FlushStageAuthorizersCacheCommand } from '@aws-sdk/client-api-gateway';
import { parseBody, formatResponse, formatEmptyResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();
const apiGateway = new APIGatewayClient();

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      return formatResponse(401, { error: 'Unauthorized', message: 'Valid JWT token required' });
    }

    const data = parseBody(event);
    if (data === null) {
      return formatResponse(400, { error: 'ValidationError', message: 'Invalid request body' });
    }

    const { teamId } = data;

    if (teamId !== null && teamId !== undefined && (typeof teamId !== 'string' || !teamId.trim())) {
      return formatResponse(400, { message: 'teamId must be a non-empty string or null to clear active team' });
    }

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
      console.error('Failed to flush authorizer cache:', cacheError);
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

    console.error('Error setting active team:', err);
    return formatResponse(500, {
      error: 'InternalError',
      message: 'Something went wrong'
    });
  }
};
